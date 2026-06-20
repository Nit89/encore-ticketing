import { NextResponse } from "next/server";
import { getEvents } from "@/lib/dsql";

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
