import { NextResponse } from "next/server";
import { getPool } from "@/lib/dsql";

// Resets the first event for demo purposes
export async function POST() {
  try {
    const pool = await getPool();

    // Reset all seats to available
    await pool.query(`
      UPDATE seats SET status = 'available'
      WHERE event_id = '4bca8ade-2278-45a3-941a-82ade7858fe5'
    `);

    // Reset available seat count
    await pool.query(`
      UPDATE events SET available_seats = total_seats
      WHERE id = '4bca8ade-2278-45a3-941a-82ade7858fe5'
    `);

    // Clear orders for demo event
    await pool.query(`
      DELETE FROM orders
      WHERE event_id = '4bca8ade-2278-45a3-941a-82ade7858fe5'
    `);

    return NextResponse.json({ success: true, message: "Event reset successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
