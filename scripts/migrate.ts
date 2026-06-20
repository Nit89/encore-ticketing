import { getPool } from "../src/lib/dsql";

async function migrate() {
  const pool = getPool();
  console.log("🚀 Running migrations on Aurora DSQL...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name             TEXT NOT NULL,
      venue            TEXT NOT NULL,
      event_date       TIMESTAMPTZ NOT NULL,
      total_seats      INTEGER NOT NULL DEFAULT 0,
      available_seats  INTEGER NOT NULL DEFAULT 0,
      price_usd        NUMERIC(8,2) NOT NULL,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("✅ events table ready");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS seats (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id     UUID NOT NULL,
      row_label    TEXT NOT NULL,
      seat_number  INTEGER NOT NULL,
      section      TEXT NOT NULL DEFAULT 'General',
      status       TEXT NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available','sold','unavailable')),
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (event_id, row_label, seat_number)
    );
  `);
  console.log("✅ seats table ready");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id           UUID PRIMARY KEY,
      event_id     UUID NOT NULL,
      seat_id      UUID NOT NULL,
      buyer_name   TEXT NOT NULL,
      buyer_email  TEXT NOT NULL,
      amount_usd   NUMERIC(8,2) NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("✅ orders table ready");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ledger (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id     UUID NOT NULL,
      event_id     UUID NOT NULL,
      seat_id      UUID NOT NULL,
      buyer_email  TEXT NOT NULL,
      amount_usd   NUMERIC(8,2) NOT NULL,
      action       TEXT NOT NULL DEFAULT 'PURCHASE',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("✅ ledger table ready");

  console.log("\n🎉 All migrations complete!");
}

async function main() {
  const pool = getPool();
  try {
    await migrate();
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Migration failed:", e.message);
  process.exit(1);
});
