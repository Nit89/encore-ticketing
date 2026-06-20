import { NextRequest, NextResponse } from "next/server";
import { holdSeat, releaseSeat } from "@/lib/dynamo";

// POST /api/hold — claim a 10-second seat hold
export async function POST(req: NextRequest) {
  try {
    const { eventId, seatId, userSession } = await req.json();

    if (!eventId || !seatId || !userSession) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await holdSeat(eventId, seatId, userSession);

    return NextResponse.json(result, {
      status: result.success ? 200 : 409,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Hold failed";
    console.error("[hold] error:", message);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

// DELETE /api/hold — release a seat hold early
export async function DELETE(req: NextRequest) {
  try {
    const { eventId, seatId, userSession } = await req.json();

    if (!eventId || !seatId || !userSession) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    await releaseSeat(eventId, seatId, userSession);
    return NextResponse.json({ success: true, message: "Hold released" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Release failed";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
