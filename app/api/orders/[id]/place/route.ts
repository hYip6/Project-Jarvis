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
    const fulfillerId = String(body.fulfillerId ?? "").trim();
    const proofValue = String(body.proofValue ?? "").trim();

    if (!fulfillerId) {
      return NextResponse.json({ error: "fulfillerId is required." }, { status: 400 });
    }

    const now = nowIso();
    const db = await getDb();
    const orders = db.collection("orders");

    const updatedOrder = await orders.findOneAndUpdate(
      {
        _id: toObjectId(id),
        status: "CLAIMED",
        fulfillerId: toObjectId(fulfillerId),
      },
      {
        $set: {
          status: "PLACED",
          proofValue,
          placedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after", includeResultMetadata: false }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Order cannot be marked as placed." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}
