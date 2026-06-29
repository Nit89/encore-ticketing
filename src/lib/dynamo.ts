import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// ─── Client setup ────────────────────────────────────────────────────────────

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = process.env.DYNAMODB_TABLE_NAME ?? "encore-seat-holds";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeatStatus = "available" | "held" | "sold" | "unavailable";

export interface SeatHold {
  event_id: string;
  seat_id: string;
  user_session: string;
  held_at: number;
  expires_at: number; // TTL — DynamoDB auto-deletes after this
  status: "held";
}

// ─── Hold a seat (thundering herd absorber) ───────────────────────────────────
// Uses a conditional write — only succeeds if no hold exists for this seat.
// If two users click simultaneously, exactly one wins. The other gets an error.
// TTL of 10 seconds — if user doesn't checkout, seat auto-releases. No cleanup needed.

export async function holdSeat(
  eventId: string,
  seatId: string,
  userSession: string
): Promise<{ success: boolean; message: string }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 16; // 10 second hold

  try {
    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          event_id: eventId,
          seat_id: seatId,
          user_session: userSession,
          held_at: now,
          expires_at: expiresAt,
          status: "held",
        } satisfies SeatHold,
        // The magic: only write if this seat isn't already held
        // attribute_not_exists checks BOTH keys together
        ConditionExpression:
          "attribute_not_exists(event_id) AND attribute_not_exists(seat_id)",
      })
    );

    return { success: true, message: "Seat held successfully" };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return { success: false, message: "Seat already held by another user" };
    }
    throw error;
  }
}

// ─── Release a seat hold ──────────────────────────────────────────────────────
// Called when user cancels or checkout completes.
// Only the session that holds the seat can release it.

export async function releaseSeat(
  eventId: string,
  seatId: string,
  userSession: string
): Promise<void> {
  await dynamo.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { event_id: eventId, seat_id: seatId },
      ConditionExpression: "user_session = :session",
      ExpressionAttributeValues: { ":session": userSession },
    })
  );
}

// ─── Get a single seat hold ───────────────────────────────────────────────────

export async function getSeatHold(
  eventId: string,
  seatId: string
): Promise<SeatHold | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: TABLE,
      Key: { event_id: eventId, seat_id: seatId },
    })
  );
  return (result.Item as SeatHold) ?? null;
}

// ─── Get all holds for an event ───────────────────────────────────────────────
// Used by the SSE stream to push live seat status to the browser.

export async function getAllHoldsForEvent(
  eventId: string
): Promise<SeatHold[]> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "event_id = :eid",
      ExpressionAttributeValues: { ":eid": eventId },
    })
  );
  return (result.Items as SeatHold[]) ?? [];
}

// ─── Mark seat as sold in DynamoDB ────────────────────────────────────────────
// Called after DSQL checkout succeeds. Updates status and removes TTL
// so the sold record persists (not auto-deleted).

export async function markSeatSold(
  eventId: string,
  seatId: string
): Promise<void> {
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { event_id: eventId, seat_id: seatId },
      UpdateExpression:
        "SET #s = :sold REMOVE expires_at",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":sold": "sold" },
    })
  );
}

// ─── Chaos mode: bulk hold simulation ────────────────────────────────────────
// Fires N simultaneous hold attempts against the same event.
// Returns count of successful holds and failed attempts (conflicts).
// This is what powers the chaos mode dashboard counter.

export async function simulateChaos(
  eventId: string,
  seatIds: string[],
  sessionPrefix: string
): Promise<{ held: number; conflicts: number }> {
  const results = await Promise.allSettled(
    seatIds.map((seatId, i) =>
      holdSeat(eventId, seatId, `${sessionPrefix}-${i}`)
    )
  );

  let held = 0;
  let conflicts = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.success) held++;
      else conflicts++;
    }
  }

  return { held, conflicts };
}
