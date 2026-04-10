import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { nowIso, toObjectId } from "@/lib/db-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const fulfillerId = String(body.fulfillerId ?? "");

    if (!fulfillerId) {
      return NextResponse.json({ error: "fulfillerId is required." }, { status: 400 });
    }

    const now = nowIso();
    const db = await getDb();
    const orders = db.collection("orders");
    const orderObjectId = toObjectId(id);
    const fulfillerObjectId = toObjectId(fulfillerId);

    const existing = await orders.findOne({ _id: orderObjectId });
    if (!existing) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (existing.requesterId.equals(fulfillerObjectId)) {
      return NextResponse.json(
        {
          error:
            "You cannot claim your own request. Post as requester and have another student with dining dollars claim it—or use a second account for testing.",
        },
        { status: 400 }
      );
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "This order is no longer open—it may already be claimed. Try refreshing." },
        { status: 409 }
      );
    }

    const updatedOrder = await orders.findOneAndUpdate(
      {
        _id: orderObjectId,
        status: "PENDING",
        requesterId: { $ne: fulfillerObjectId },
      },
      {
        $set: {
          fulfillerId: fulfillerObjectId,
          status: "CLAIMED",
          claimedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after", includeResultMetadata: false }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Someone else claimed this order just now. Refresh the marketplace." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      order: {
        ...updatedOrder,
        _id: updatedOrder._id.toString(),
        requesterId: updatedOrder.requesterId.toString(),
        fulfillerId: updatedOrder.fulfillerId?.toString() ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to claim order." }, { status: 500 });
  }
}
