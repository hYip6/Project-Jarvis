import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db-helpers";

function serializeOrder(order: Record<string, unknown>) {
  return {
    ...order,
    _id: String(order._id),
    requesterId: String(order.requesterId),
    fulfillerId: order.fulfillerId ? String(order.fulfillerId) : null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const db = await getDb();
    const orders = db.collection("orders");
    const userObjectId = toObjectId(userId);

    const [requested, claimed] = await Promise.all([
      orders.find({ requesterId: userObjectId }).sort({ createdAt: -1 }).toArray(),
      orders.find({ fulfillerId: userObjectId }).sort({ createdAt: -1 }).toArray(),
    ]);

    return NextResponse.json({
      requested: requested.map(serializeOrder),
      claimed: claimed.map(serializeOrder),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load user orders." }, { status: 500 });
  }
}
