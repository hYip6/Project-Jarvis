import type { OrderStatus } from "@/lib/types";
import {
  DEMO_ALICE_ID,
  DEMO_BOB_ID,
  DEMO_CHARLIE_ID,
  DEMO_DIANA_ID,
  DEMO_ETHAN_ID,
  DEMO_FIONA_ID,
} from "@/lib/demo-personas";

export const LOCAL_ORDERS_STORAGE_KEY = "hackathon-local-orders-v5";

export type LocalOrder = {
  _id: string;
  requesterId: string;
  fulfillerId: string | null;
  location: string;
  orderDetails: string;
  originalPrice: number;
  discountedPrice: number;
  status: OrderStatus;
  pickupWindow: string;
  proofValue: string;
  createdAt: string;
};

function newOrderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `o-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultDemoOrders(): LocalOrder[] {
  const now = Date.now();
  const ago = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString();
  const completedTime = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      _id: "demo-order-open-1",
      requesterId: DEMO_CHARLIE_ID,
      fulfillerId: null,
      location: "Smash N' Shake",
      orderDetails: "Classic Smash Beef Burger Combo",
      originalPrice: 10,
      discountedPrice: 5,
      status: "PENDING",
      pickupWindow: "11:45 AM – 12:15 PM",
      proofValue: "",
      createdAt: ago(12),
    },
    {
      _id: "demo-order-open-2",
      requesterId: DEMO_DIANA_ID,
      fulfillerId: null,
      location: "Savor",
      orderDetails: "Baked Chicken Parmesan, side of penne marinara",
      originalPrice: 13.95,
      discountedPrice: 6.98,
      status: "PENDING",
      pickupWindow: "12:00 – 12:30 PM",
      proofValue: "",
      createdAt: ago(28),
    },
    {
      _id: "demo-order-open-3",
      requesterId: DEMO_ETHAN_ID,
      fulfillerId: null,
      location: "Popeyes",
      orderDetails: "Spicy Chicken Sandwich Combo, Cajun fries",
      originalPrice: 9.99,
      discountedPrice: 5,
      status: "PENDING",
      pickupWindow: "5:30 – 6:00 PM",
      proofValue: "",
      createdAt: ago(41),
    },
    {
      _id: "demo-order-open-4",
      requesterId: DEMO_FIONA_ID,
      fulfillerId: null,
      location: "Subway",
      orderDetails: "Footlong Turkey Breast, wheat, lettuce, tomato, mayo",
      originalPrice: 8.99,
      discountedPrice: 4.5,
      status: "PENDING",
      pickupWindow: "6:15 – 6:45 PM",
      proofValue: "",
      createdAt: ago(55),
    },
    {
      _id: "demo-order-open-5",
      requesterId: DEMO_CHARLIE_ID,
      fulfillerId: null,
      location: "East Side Dining",
      orderDetails: "Build-your-bowl: rice, chicken, black beans, corn salsa",
      originalPrice: 14.5,
      discountedPrice: 7.25,
      status: "PENDING",
      pickupWindow: "7:00 – 7:30 PM",
      proofValue: "",
      createdAt: ago(67),
    },
    {
      _id: "demo-order-open-6",
      requesterId: DEMO_DIANA_ID,
      fulfillerId: null,
      location: "Jasmine",
      orderDetails: "General Tso's chicken lunch combo, steamed rice",
      originalPrice: 11.25,
      discountedPrice: 5.63,
      status: "PENDING",
      pickupWindow: "12:30 – 1:00 PM",
      proofValue: "",
      createdAt: ago(82),
    },
    // Alice's History
    {
      _id: "demo-order-history-1",
      requesterId: DEMO_ALICE_ID,
      fulfillerId: DEMO_ETHAN_ID,
      location: "Savor",
      orderDetails: "Pasta Sauté with Chicken",
      originalPrice: 12.95,
      discountedPrice: 6.48,
      status: "COMPLETED",
      pickupWindow: "5:00 – 5:30 PM",
      proofValue: "A42",
      createdAt: ago(60 * 24), // 1 day ago
    },
    {
      _id: "demo-order-history-2",
      requesterId: DEMO_CHARLIE_ID,
      fulfillerId: DEMO_ALICE_ID,
      location: "Subway",
      orderDetails: "Footlong Italian B.M.T.",
      originalPrice: 9.49,
      discountedPrice: 4.75,
      status: "COMPLETED",
      pickupWindow: "1:00 – 1:30 PM",
      proofValue: "B12",
      createdAt: ago(60 * 48), // 2 days ago
    },
    // Bob's History
    {
      _id: "demo-order-history-3",
      requesterId: DEMO_BOB_ID,
      fulfillerId: DEMO_FIONA_ID,
      location: "Smash N' Shake",
      orderDetails: "Classic Smash Beef Burger Combo",
      originalPrice: 10.00,
      discountedPrice: 5.00,
      status: "COMPLETED",
      pickupWindow: "6:00 – 6:30 PM",
      proofValue: "C99",
      createdAt: ago(60 * 72), // 3 days ago
    },
    {
      _id: "demo-order-history-4",
      requesterId: DEMO_DIANA_ID,
      fulfillerId: DEMO_BOB_ID,
      location: "Popeyes",
      orderDetails: "3Pc Tenders Combo",
      originalPrice: 10.49,
      discountedPrice: 5.25,
      status: "COMPLETED",
      pickupWindow: "12:00 – 12:30 PM",
      proofValue: "D44",
      createdAt: ago(60 * 96), // 4 days ago
    },
  ];
}

export function loadLocalOrders(): LocalOrder[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_STORAGE_KEY);
    if (!raw) {
      const initial = defaultDemoOrders();
      localStorage.setItem(LOCAL_ORDERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      const initial = defaultDemoOrders();
      localStorage.setItem(LOCAL_ORDERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed as LocalOrder[];
  } catch {
    const initial = defaultDemoOrders();
    try {
      localStorage.setItem(LOCAL_ORDERS_STORAGE_KEY, JSON.stringify(initial));
    } catch {
      /* ignore */
    }
    return initial;
  }
}

export function saveLocalOrders(orders: LocalOrder[]): void {
  try {
    localStorage.setItem(LOCAL_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    /* demo storage only */
  }
}

/** Same visibility as merging GET /api/orders?onlyOpen + /api/orders/my for a user. */
export function visibleOrdersForUser(all: LocalOrder[], userId: string): LocalOrder[] {
  const byId = new Map<string, LocalOrder>();
  for (const order of all) {
    if (
      order.status === "PENDING" ||
      order.requesterId === userId ||
      order.fulfillerId === userId
    ) {
      byId.set(order._id, order);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createLocalOrder(
  orders: LocalOrder[],
  input: {
    requesterId: string;
    location: string;
    orderDetails: string;
    originalPrice: number;
    pickupWindow: string;
  }
): { orders: LocalOrder[]; orderId: string } | { error: string } {
  const location = input.location.trim();
  const orderDetails = input.orderDetails.trim();
  const pickupWindow = input.pickupWindow.trim();
  const originalPrice = Number(input.originalPrice);
  if (
    !input.requesterId ||
    !location ||
    !orderDetails ||
    !pickupWindow ||
    Number.isNaN(originalPrice) ||
    originalPrice <= 0
  ) {
    return {
      error:
        "requesterId, location, orderDetails, pickupWindow, and originalPrice are required.",
    };
  }
  const discountedPrice = Number((originalPrice * 0.5).toFixed(2));
  const id = newOrderId();
  const now = new Date().toISOString();
  const row: LocalOrder = {
    _id: id,
    requesterId: input.requesterId,
    fulfillerId: null,
    location,
    orderDetails,
    originalPrice: Number(originalPrice.toFixed(2)),
    discountedPrice,
    status: "PENDING",
    pickupWindow,
    proofValue: "",
    createdAt: now,
  };
  return { orders: [row, ...orders], orderId: id };
}

export function claimLocalOrder(
  orders: LocalOrder[],
  orderId: string,
  fulfillerId: string
): { orders: LocalOrder[] } | { error: string } {
  if (!fulfillerId) {
    return { error: "fulfillerId is required." };
  }
  const idx = orders.findIndex((o) => o._id === orderId);
  if (idx === -1) {
    return { error: "Order not found." };
  }
  const existing = orders[idx];
  if (existing.requesterId === fulfillerId) {
    return {
      error:
        "You cannot claim your own request. Post as requester and have another student with dining dollars claim it—or use a second account for testing.",
    };
  }
  if (existing.status !== "PENDING") {
    return {
      error: "This order is no longer open—it may already be claimed. Try refreshing.",
    };
  }
  const next = orders.slice();
  next[idx] = { ...existing, fulfillerId, status: "CLAIMED" as const };
  return { orders: next };
}

export function markPlacedLocalOrder(
  orders: LocalOrder[],
  orderId: string,
  fulfillerId: string,
  proofValue: string
): { orders: LocalOrder[] } | { error: string } {
  const trimmedFulfiller = fulfillerId.trim();
  if (!trimmedFulfiller) {
    return { error: "fulfillerId is required." };
  }
  const idx = orders.findIndex((o) => o._id === orderId);
  if (idx === -1) {
    return { error: "Order cannot be marked as placed." };
  }
  const existing = orders[idx];
  if (existing.status !== "CLAIMED" || existing.fulfillerId !== trimmedFulfiller) {
    return { error: "Order cannot be marked as placed." };
  }
  const next = orders.slice();
  next[idx] = {
    ...existing,
    status: "PLACED",
    proofValue: proofValue.trim(),
  };
  return { orders: next };
}

export function markPickedUpLocalOrder(
  orders: LocalOrder[],
  orderId: string,
  requesterId: string
): { orders: LocalOrder[] } | { error: string } {
  if (!requesterId) {
    return { error: "requesterId is required." };
  }
  const idx = orders.findIndex((o) => o._id === orderId);
  if (idx === -1) {
    return { error: "Order cannot be marked as picked up." };
  }
  const existing = orders[idx];
  if (existing.status !== "PLACED" || existing.requesterId !== requesterId) {
    return { error: "Order cannot be marked as picked up." };
  }
  const next = orders.slice();
  next[idx] = { ...existing, status: "PICKED_UP" as const };
  return { orders: next };
}

export function completeLocalOrder(
  orders: LocalOrder[],
  orderId: string,
  requesterId: string
): { orders: LocalOrder[] } | { error: string } {
  if (!requesterId) {
    return { error: "requesterId is required." };
  }
  const idx = orders.findIndex((o) => o._id === orderId);
  if (idx === -1) {
    return { error: "Order cannot be marked as completed." };
  }
  const existing = orders[idx];
  if (
    (existing.status !== "PLACED" && existing.status !== "PICKED_UP") ||
    existing.requesterId !== requesterId
  ) {
    return { error: "Order cannot be marked as completed." };
  }
  const next = orders.slice();
  next[idx] = { ...existing, status: "COMPLETED" as const };
  return { orders: next };
}
