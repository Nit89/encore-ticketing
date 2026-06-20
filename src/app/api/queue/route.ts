import { NextRequest, NextResponse } from "next/server";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const dynamo = DynamoDBDocumentClient.from(client);

const QUEUE_TABLE = process.env.DYNAMODB_TABLE_NAME ?? "encore-seat-holds";

// POST /api/queue — join the queue, get a position
export async function POST(req: NextRequest) {
  try {
    const { eventId, userSession } = await req.json();

    if (!eventId || !userSession) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if already in queue
    const existing = await dynamo.send(
      new GetCommand({
        TableName: QUEUE_TABLE,
        Key: {
          event_id: `queue#${eventId}`,
          seat_id: userSession,
        },
      })
    );

    if (existing.Item) {
      return NextResponse.json({
        position: existing.Item.position,
        joinedAt: existing.Item.joined_at,
      });
    }

    // Get current queue length for position
    const queueItems = await dynamo.send(
      new QueryCommand({
        TableName: QUEUE_TABLE,
        KeyConditionExpression: "event_id = :eid",
        ExpressionAttributeValues: {
          ":eid": `queue#${eventId}`,
        },
        Select: "COUNT",
      })
    );

    const position = (queueItems.Count ?? 0) + 1;
    const joinedAt = Date.now();
    const expiresAt = Math.floor(joinedAt / 1000) + 60 * 30; // 30 min TTL

    // Add to queue
    await dynamo.send(
      new PutCommand({
        TableName: QUEUE_TABLE,
        Item: {
          event_id: `queue#${eventId}`,
          seat_id: userSession,
          position,
          joined_at: joinedAt,
          expires_at: expiresAt,
          status: "waiting",
        },
      })
    );

    return NextResponse.json({ position, joinedAt });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/queue?eventId=xxx&session=xxx — get current position
export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get("eventId");
    const userSession = req.nextUrl.searchParams.get("session");

    if (!eventId || !userSession) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const result = await dynamo.send(
      new GetCommand({
        TableName: QUEUE_TABLE,
        Key: {
          event_id: `queue#${eventId}`,
          seat_id: userSession,
        },
      })
    );

    if (!result.Item) {
      return NextResponse.json({ position: null, admitted: false });
    }

    const position = result.Item.position as number;

    // Admit users with position <= 50 (first 50 in queue get in)
    const admitted = position <= 50;

    return NextResponse.json({
      position,
      admitted,
      joinedAt: result.Item.joined_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
