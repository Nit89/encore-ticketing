import { getPool } from "../src/lib/dsql";

const ROWS = ["A","B","C","D","E","F","G","H","I","J",
              "K","L","M","N","O","P","Q","R","S","T"];
const SEATS_PER_ROW = 25;

async function seed() {
  const pool = getPool();
  console.log("🌱 Seeding demo data...");

  // Create 2 demo events
  const events = [
    {
      name: "Taylor Swift — The Eras Tour",
      venue: "Wankhede Stadium, Mumbai",
      event_date: "2026-08-15T19:00:00Z",
      price_usd: 149.99,
    },
    {
      name: "Coldplay — Music of the Spheres",
      venue: "DY Patil Stadium, Navi Mumbai",
      event_date: "2026-09-20T20:00:00Z",
      price_usd: 99.99,
    },
  ];

  for (const event of events) {
    const totalSeats = ROWS.length * SEATS_PER_ROW;

    const eventResult = await pool.query(
      `INSERT INTO events (name, venue, event_date, total_seats, available_seats, price_usd)
       VALUES ($1, $2, $3, $4, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [event.name, event.venue, event.event_date, totalSeats, event.price_usd]
    );

    if (eventResult.rows.length === 0) {
      console.log(`⏭  Skipping ${event.name} — already seeded`);
      continue;
    }

    const eventId = eventResult.rows[0].id;
    console.log(`✅ Created event: ${event.name} (${eventId})`);

    // Insert all seats
    const seatValues: string[] = [];
    const seatParams: unknown[] = [];
    let paramIndex = 1;

    for (const row of ROWS) {
      for (let num = 1; num <= SEATS_PER_ROW; num++) {
        const section =
          ["A","B","C","D","E"].includes(row) ? "VIP" :
          ["F","G","H","I","J"].includes(row) ? "Premium" : "General";

        seatValues.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );
        seatParams.push(eventId, row, num, section);
      }
    }

    await pool.query(
      `INSERT INTO seats (event_id, row_label, seat_number, section)
       VALUES ${seatValues.join(", ")}`,
      seatParams
    );

    console.log(`   └─ ${totalSeats} seats inserted`);
  }

  console.log("\n🎉 Seed complete! Run the app and select an event.");
  await pool.end();
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
