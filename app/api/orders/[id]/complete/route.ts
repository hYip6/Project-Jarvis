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
    const requesterId = String(body.requesterId ?? "");

    if (!requesterId) {
      return NextResponse.json({ error: "requesterId is required." }, { status: 400 });
    }

    const now = nowIso();
    const db = await getDb();
    const orders = db.collection("orders");

    const updatedOrder = await orders.findOneAndUpdate(
      {
        _id: toObjectId(id),
        status: { $in: ["PLACED", "PICKED_UP"] },
        requesterId: toObjectId(requesterId),
      },
      {
        $set: {
          status: "COMPLETED",
          paymentConfirmedByRequester: true,
          completedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after", includeResultMetadata: false }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Order cannot be marked as completed." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to complete order." }, { status: 500 });
  }
}
