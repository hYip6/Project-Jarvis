import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { nowIso, toObjectId } from "@/lib/db-helpers";
import type { OrderStatus } from "@/lib/types";

const ALLOWED_STATUSES: OrderStatus[] = [
  "PENDING",
  "CLAIMED",
  "PLACED",
  "PICKED_UP",
  "COMPLETED",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const onlyOpen = searchParams.get("onlyOpen") === "true";

    const db = await getDb();
    const orders = db.collection("orders");

    const query: Record<string, unknown> = {};
    if (status && ALLOWED_STATUSES.includes(status as OrderStatus)) {
      query.status = status;
    }
    if (onlyOpen) {
      query.status = "PENDING";
    }

    const data = await orders
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      orders: data.map((order) => ({
        ...order,
        _id: order._id.toString(),
        requesterId: order.requesterId?.toString(),
        fulfillerId: order.fulfillerId ? order.fulfillerId.toString() : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requesterId = String(body.requesterId ?? "");
    const location = String(body.location ?? "").trim();
    const orderDetails = String(body.orderDetails ?? "").trim();
    const pickupWindow = String(body.pickupWindow ?? "").trim();
    const originalPrice = Number(body.originalPrice ?? 0);

    if (
      !requesterId ||
      !location ||
      !orderDetails ||
      !pickupWindow ||
      Number.isNaN(originalPrice) ||
      originalPrice <= 0
    ) {
      return NextResponse.json(
        { error: "requesterId, location, orderDetails, pickupWindow, and originalPrice are required." },
        { status: 400 }
      );
    }

    const discountPercent = 50;
    const discountedPrice = Number((originalPrice * 0.5).toFixed(2));
    const now = nowIso();

    const db = await getDb();
    const orders = db.collection("orders");

    const result = await orders.insertOne({
      requesterId: toObjectId(requesterId),
      fulfillerId: null,
      location,
      orderDetails,
      originalPrice: Number(originalPrice.toFixed(2)),
      discountPercent,
      discountedPrice,
      status: "PENDING",
      pickupWindow,
      proofType: "ORDER_NUMBER",
      proofValue: "",
      paymentMethod: "VENMO",
      paymentConfirmedByRequester: false,
      createdAt: now,
      claimedAt: null,
      placedAt: null,
      pickedUpAt: null,
      completedAt: null,
      updatedAt: now,
    });

    return NextResponse.json({ orderId: result.insertedId.toString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}
