import { NextRequest, NextResponse } from "next/server";
import { getSeatsForEvent } from "@/lib/dsql";
import { getAllHoldsForEvent } from "@/lib/dynamo";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  try {
    const [seats, holds] = await Promise.all([
      getSeatsForEvent(eventId),
      getAllHoldsForEvent(eventId),
    ]);

    const heldSeatIds = new Set(holds.map((h) => h.seat_id));

    const seatStatus = seats.map((seat) => ({
      id: seat.id,
      row: seat.row_label,
      number: seat.seat_number,
      section: seat.section,
      status:
        seat.status === "sold"
          ? "sold"
          : heldSeatIds.has(seat.id)
          ? "held"
          : "available",
    }));

    return NextResponse.json({
      seats: seatStatus,
      soldCount: seats.filter((s) => s.status === "sold").length,
      heldCount: holds.length,
      availableCount: seats.filter(
        (s) => s.status === "available" && !heldSeatIds.has(s.id)
      ).length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
