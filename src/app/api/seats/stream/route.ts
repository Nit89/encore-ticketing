import { NextRequest } from "next/server";
import { getSeatsForEvent } from "@/lib/dsql";
import { getAllHoldsForEvent } from "@/lib/dynamo";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return new Response("Missing eventId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      async function pushUpdate() {
        // Guard — stop pushing if client disconnected
        if (closed) return;

        try {
          const [seats, holds] = await Promise.all([
            getSeatsForEvent(eventId!),
            getAllHoldsForEvent(eventId!),
          ]);

          if (closed) return; // Check again after async calls

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

          const data = JSON.stringify({
            seats: seatStatus,
            timestamp: Date.now(),
            soldCount: seats.filter((s) => s.status === "sold").length,
            heldCount: holds.length,
            availableCount: seats.filter(
              (s) => s.status === "available" && !heldSeatIds.has(s.id)
            ).length,
          });

          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          if (!closed) {
            console.error("[stream] error:", error);
          }
        }
      }

      // Push immediately on connect
      await pushUpdate();

      // Then every 2 seconds
      const interval = setInterval(pushUpdate, 2000);

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
