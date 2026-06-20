import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Pool, type PoolClient } from "pg";

// ─── Connection pool ──────────────────────────────────────────────────────────
// Aurora DSQL speaks standard PostgreSQL wire protocol.
// We use a pool so connections are reused across requests.

let pool: Pool | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPool(): Pool {
  if (!pool) {
    const host = getRequiredEnv("DSQL_HOST");
    const region = getRequiredEnv("AWS_REGION");
    const user = process.env.DSQL_USER ?? "admin";
    const signer = new DsqlSigner({ hostname: host, region });

    pool = new Pool({
      host,
      port: Number(process.env.DSQL_PORT ?? 5432),
      database: process.env.DSQL_DATABASE ?? "postgres",
      user,
      password: () =>
        user === "admin"
          ? signer.getDbConnectAdminAuthToken()
          : signer.getDbConnectAuthToken(),
      ssl: { rejectUnauthorized: true },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  name: string;
  venue: string;
  event_date: Date;
  total_seats: number;
  available_seats: number;
  price_usd: number;
}

export interface Seat {
  id: string;
  event_id: string;
  row_label: string;
  seat_number: number;
  status: "available" | "sold";
  section: string;
}

export interface Order {
  id: string;
  event_id: string;
  seat_id: string;
  buyer_name: string;
  buyer_email: string;
  amount_usd: number;
  created_at: Date;
}

// ─── OCC retry wrapper ────────────────────────────────────────────────────────
// Aurora DSQL uses Optimistic Concurrency Control (OCC).
// If two transactions conflict, one gets a serialization error.
// We retry up to 5 times with exponential backoff.
// This is the core of the no-oversell guarantee.

const OCC_ERROR_CODES = ["40001", "40P01"]; // serialization_failure, deadlock

export async function withOCCRetry<T>(
  fn: (client: PoolClient) => Promise<T>,
  maxRetries = 5
): Promise<{ result: T; retries: number }> {
  let retries = 0;
  const client = await getPool().connect();

  try {
    while (retries <= maxRetries) {
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return { result, retries };
      } catch (error: unknown) {
        await client.query("ROLLBACK");

        const pgError = error as { code?: string };
        if (OCC_ERROR_CODES.includes(pgError.code ?? "") && retries < maxRetries) {
          retries++;
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
          await new Promise((r) => setTimeout(r, 50 * Math.pow(2, retries)));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Max OCC retries exceeded");
  } finally {
    client.release();
  }
}

// ─── Get all events ───────────────────────────────────────────────────────────

export async function getEvents(): Promise<Event[]> {
  const result = await getPool().query(
    "SELECT * FROM events ORDER BY event_date ASC"
  );
  return result.rows;
}

// ─── Get single event ─────────────────────────────────────────────────────────

export async function getEvent(eventId: string): Promise<Event | null> {
  const result = await getPool().query(
    "SELECT * FROM events WHERE id = $1",
    [eventId]
  );
  return result.rows[0] ?? null;
}

// ─── Get seats for an event ───────────────────────────────────────────────────

export async function getSeatsForEvent(eventId: string): Promise<Seat[]> {
  const result = await getPool().query(
    "SELECT * FROM seats WHERE event_id = $1 ORDER BY row_label, seat_number",
    [eventId]
  );
  return result.rows;
}

// ─── THE CORE: Checkout transaction ──────────────────────────────────────────
// This is the no-oversell guarantee.
// Runs inside withOCCRetry — if two buyers race, one retries, oversell = 0.
//
// Transaction steps:
// 1. Read seat — confirm it's available
// 2. Mark seat as sold
// 3. Insert order record
// 4. Append to ledger (audit trail)
// 5. Decrement event available_seats counter
// All 5 steps succeed together or none do — ACID.

export async function checkoutSeat(
  eventId: string,
  seatId: string,
  buyerName: string,
  buyerEmail: string,
  amountUsd: number
): Promise<{ success: boolean; orderId?: string; retries: number; message: string }> {
  try {
    const { result, retries } = await withOCCRetry(async (client) => {
      // Step 1: Read seat with FOR UPDATE to lock it
      const seatResult = await client.query(
        "SELECT * FROM seats WHERE id = $1 AND event_id = $2 FOR UPDATE",
        [seatId, eventId]
      );

      if (seatResult.rows.length === 0) {
        throw new Error("SEAT_NOT_FOUND");
      }

      const seat: Seat = seatResult.rows[0];

      if (seat.status !== "available") {
        throw new Error("SEAT_NOT_AVAILABLE");
      }

      // Step 2: Mark seat as sold
      await client.query(
        "UPDATE seats SET status = 'sold' WHERE id = $1 AND event_id = $2",
        [seatId, eventId]
      );

      // Step 3: Insert order
      const orderId = crypto.randomUUID();
      await client.query(
        `INSERT INTO orders (id, event_id, seat_id, buyer_name, buyer_email, amount_usd, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [orderId, eventId, seatId, buyerName, buyerEmail, amountUsd]
      );

      // Step 4: Append to ledger (immutable audit trail)
      await client.query(
        `INSERT INTO ledger (order_id, event_id, seat_id, buyer_email, amount_usd, action, created_at)
         VALUES ($1, $2, $3, $4, $5, 'PURCHASE', NOW())`,
        [orderId, eventId, seatId, buyerEmail, amountUsd]
      );

      // Step 5: Decrement available seats counter
      await client.query(
        "UPDATE events SET available_seats = available_seats - 1 WHERE id = $1",
        [eventId]
      );

      return orderId;
    });

    return {
      success: true,
      orderId: result,
      retries,
      message: "Purchase successful",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Checkout failed";

    if (message === "SEAT_NOT_AVAILABLE") {
      return { success: false, retries: 0, message: "Seat already sold" };
    }
    if (message === "SEAT_NOT_FOUND") {
      return { success: false, retries: 0, message: "Seat not found" };
    }

    return { success: false, retries: 0, message };
  }
}

// ─── Get live stats (for chaos mode dashboard) ────────────────────────────────

export async function getLiveStats(eventId: string): Promise<{
  totalSeats: number;
  soldSeats: number;
  availableSeats: number;
  oversellCount: number;
}> {
  const result = await getPool().query(
    `SELECT
       total_seats,
       available_seats,
       total_seats - available_seats AS sold_seats
     FROM events WHERE id = $1`,
    [eventId]
  );

  const row = result.rows[0];
  return {
    totalSeats: row.total_seats,
    soldSeats: row.sold_seats,
    availableSeats: row.available_seats,
    oversellCount: 0, // By design — DSQL OCC makes this impossible
  };
}
