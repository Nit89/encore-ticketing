import { NextRequest, NextResponse } from "next/server";
import { checkoutSeat, getEvent } from "@/lib/dsql";
import { markSeatSold, releaseSeat } from "@/lib/dynamo";

// POST /api/checkout — the no-oversell DSQL transaction
// Flow:
// 1. Validate inputs
// 2. Run DSQL ACID transaction with OCC retry
// 3. If success — mark seat sold in DynamoDB (removes TTL)
// 4. If fail — release DynamoDB hold so seat becomes available again
export async function POST(req: NextRequest) {
  try {
    const { eventId, seatId, userSession, buyerName, buyerEmail } =
      await req.json();

    if (!eventId || !seatId || !userSession || !buyerName || !buyerEmail) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get event price from DSQL
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    // THE CORE: Run the DSQL checkout transaction
    // OCC retry handles race conditions — oversell is impossible
    const checkout = await checkoutSeat(
      eventId,
      seatId,
      buyerName,
      buyerEmail,
      event.price_usd
    );

    if (checkout.success) {
      // Mark as permanently sold in DynamoDB (removes TTL)
      await markSeatSold(eventId, seatId);

      return NextResponse.json({
        success: true,
        orderId: checkout.orderId,
        retries: checkout.retries, // Show OCC retries in chaos mode
        message: "Purchase successful!",
        event: event.name,
        seat: seatId,
        amount: event.price_usd,
      });
    } else {
      // Release the DynamoDB hold — seat goes back to available
      try {
        await releaseSeat(eventId, seatId, userSession);
      } catch {
        // Hold may have already expired via TTL — that's fine
      }

      return NextResponse.json(
        {
          success: false,
          message: checkout.message,
          retries: checkout.retries,
        },
        { status: 409 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    console.error("[checkout] error:", message);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
