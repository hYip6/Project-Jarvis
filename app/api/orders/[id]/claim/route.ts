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

    const updatedOrder = await orders.findOneAndUpdate(
      {
        _id: toObjectId(id),
        status: "PENDING",
        requesterId: { $ne: toObjectId(fulfillerId) },
      },
      {
        $set: {
          fulfillerId: toObjectId(fulfillerId),
          status: "CLAIMED",
          claimedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after", includeResultMetadata: false }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Order is no longer available to claim." },
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
