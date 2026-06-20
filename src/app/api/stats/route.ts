import { NextRequest, NextResponse } from "next/server";
import { getLiveStats } from "@/lib/dsql";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }
  try {
    const stats = await getLiveStats(eventId);
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
