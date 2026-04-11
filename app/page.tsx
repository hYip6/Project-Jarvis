"use client";

import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";

const USER_STORAGE_KEY = "hackathon-user-v2";
const WITHDRAWN_STORAGE_KEY = "hackathon-wallet-withdrawn-v1";
const POLL_MS = 20000;

function readWithdrawnTotal(userId: string): number {
  if (typeof window === "undefined") {
    return 0;
  }
  try {
    const raw = localStorage.getItem(WITHDRAWN_STORAGE_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const v = parsed[userId];
    return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
  } catch {
    return 0;
  }
}

function persistWithdrawnTotal(userId: string, cumulativeWithdrawn: number) {
  try {
    const raw = localStorage.getItem(WITHDRAWN_STORAGE_KEY);
    const parsed: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[userId] = Math.max(0, cumulativeWithdrawn);
    localStorage.setItem(WITHDRAWN_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* demo storage only */
  }
}

const LOCATIONS = [
  "SAC Food Court",
  "Savor",
  "Smash N' Shake",
  "Popeyes",
  "Subway",
  "East Side Dining",
  "Jasmine",
  "West Side Dining",
] as const;

type MenuItem = { id: string; name: string; price: number; category: string };

const SAVOR_MENU: MenuItem[] = [
  { id: "ps", name: "Pasta Sauté", price: 11.85, category: "Pasta Sauté" },
  { id: "psc", name: "Pasta Sauté with Chicken", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "psp", name: "Pasta Sauté with Pork Sausage", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "psvm", name: "Pasta Sauté with Vegan Meatballs", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "psbpm", name: "Pasta Sauté with Beef & Pork Meatballs", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "bcp", name: "Baked Chicken Parmesan", price: 13.95, category: "Specials" },
  { id: "pm", name: "Penne Marinara", price: 13.95, category: "Specials" },
  { id: "coke", name: "Coca-Cola", price: 2.20, category: "Beverages" },
  { id: "dcoke", name: "Diet Coke", price: 2.20, category: "Beverages" },
  { id: "sprite", name: "Sprite", price: 2.20, category: "Beverages" },
  { id: "drp", name: "Dr. Pepper", price: 2.00, category: "Beverages" },
  { id: "fanta", name: "Orange Fanta", price: 2.10, category: "Beverages" },
  { id: "punch", name: "Fruit Punch", price: 2.00, category: "Beverages" },
  { id: "lem", name: "Lemonade", price: 2.20, category: "Beverages" },
  { id: "tea", name: "Sweet Iced Tea", price: 2.00, category: "Beverages" },
  { id: "water", name: "Dasani Water, 20 oz", price: 2.70, category: "Beverages" },
];

const SMASH_MENU: MenuItem[] = [
  { id: "sns_c1", name: "To The Max Burger Combo", price: 11.40, category: "Combos" },
  { id: "sns_c2", name: "BBQ Bacon Cheddar Ranch Burger Combo", price: 13.45, category: "Combos" },
  { id: "sns_c3", name: "Classic Smash Beef Burger Combo", price: 10.00, category: "Combos" },
  { id: "sns_c4", name: "Grilled Chicken Sandwich Combo", price: 12.60, category: "Combos" },
  { id: "sns_c5", name: "Turkey Burger Combo", price: 10.00, category: "Combos" },
  { id: "sns_c6", name: "Beyond Burger Combo", price: 13.45, category: "Combos" },
  { id: "sns_c7", name: "The Wolf Attack Combo", price: 13.45, category: "Combos" },
  { id: "sns_c8", name: "Smash Mushroom, Swiss Cheese Combo", price: 12.45, category: "Combos" },
  { id: "sns_f1", name: "Classic Smash Beef Burger", price: 6.45, category: "Favorites" },
  { id: "sns_f2", name: "Grilled Chicken Sandwich", price: 8.85, category: "Favorites" },
  { id: "sns_f3", name: "Turkey Burger", price: 6.45, category: "Favorites" },
  { id: "sns_f4", name: "Beyond Burger", price: 6.65, category: "Favorites" },
  { id: "sns_f5", name: "Malibu Garden Burger", price: 6.65, category: "Favorites" },
  { id: "sns_f6", name: "The Wolf Attack", price: 10.00, category: "Favorites" },
  { id: "sns_s1", name: "Hot Shaker Fries", price: 3.80, category: "Sides & Shakes" },
  { id: "sns_s2", name: "Vanilla Milkshake", price: 5.65, category: "Sides & Shakes" },
  { id: "sns_s3", name: "Chocolate Milkshake", price: 5.65, category: "Sides & Shakes" },
  { id: "sns_s4", name: "Strawberry Milkshake", price: 5.65, category: "Sides & Shakes" },
  { id: "sns_coke", name: "Coca-Cola", price: 2.20, category: "Fountain Beverages" },
  { id: "sns_dcoke", name: "Diet Coke", price: 2.20, category: "Fountain Beverages" },
  { id: "sns_sprite", name: "Sprite", price: 2.20, category: "Fountain Beverages" },
];

const POPEYES_MENU: MenuItem[] = [
  { id: "pop_c1", name: "Classic Chicken Sandwich Combo", price: 9.99, category: "Combos" },
  { id: "pop_c2", name: "Spicy Chicken Sandwich Combo", price: 9.99, category: "Combos" },
  { id: "pop_c3", name: "3Pc Tenders Combo", price: 10.49, category: "Combos" },
  { id: "pop_c4", name: "5Pc Tenders Combo", price: 12.49, category: "Combos" },
  { id: "pop_c5", name: "2Pc Signature Chicken Combo", price: 9.49, category: "Combos" },
  { id: "pop_s1", name: "Classic Chicken Sandwich", price: 4.99, category: "Sandwiches & Chicken" },
  { id: "pop_s2", name: "Spicy Chicken Sandwich", price: 4.99, category: "Sandwiches & Chicken" },
  { id: "pop_s3", name: "3Pc Tenders", price: 6.49, category: "Sandwiches & Chicken" },
  { id: "pop_sd1", name: "Cajun Fries", price: 3.29, category: "Sides" },
  { id: "pop_sd2", name: "Red Beans & Rice", price: 3.29, category: "Sides" },
  { id: "pop_sd3", name: "Mashed Potatoes with Gravy", price: 3.29, category: "Sides" },
  { id: "pop_sd4", name: "Mac & Cheese", price: 3.29, category: "Sides" },
  { id: "pop_b1", name: "Biscuit", price: 1.99, category: "Sides" },
  { id: "pop_d1", name: "Fountain Drink", price: 2.49, category: "Beverages" },
];

const SUBWAY_MENU: MenuItem[] = [
  { id: "sub_1", name: "Footlong Italian B.M.T.", price: 9.49, category: "Footlong Subs" },
  { id: "sub_2", name: "Footlong Spicy Italian", price: 8.99, category: "Footlong Subs" },
  { id: "sub_3", name: "Footlong Turkey Breast", price: 8.99, category: "Footlong Subs" },
  { id: "sub_4", name: "Footlong Tuna", price: 8.99, category: "Footlong Subs" },
  { id: "sub_5", name: "Footlong Meatball Marinara", price: 8.49, category: "Footlong Subs" },
  { id: "sub_6", name: "Footlong Veggie Delite", price: 7.49, category: "Footlong Subs" },
  { id: "sub_7", name: "6-inch Italian B.M.T.", price: 6.49, category: "6-inch Subs" },
  { id: "sub_8", name: "6-inch Turkey Breast", price: 5.99, category: "6-inch Subs" },
  { id: "sub_9", name: "6-inch Tuna", price: 5.99, category: "6-inch Subs" },
  { id: "sub_10", name: "6-inch Veggie Delite", price: 4.99, category: "6-inch Subs" },
  { id: "sub_c1", name: "Chocolate Chip Cookie", price: 1.29, category: "Sides & Drinks" },
  { id: "sub_c2", name: "Bag of Chips", price: 1.59, category: "Sides & Drinks" },
  { id: "sub_d1", name: "Fountain Drink", price: 2.29, category: "Sides & Drinks" },
];

type PageId = "home" | "marketplace" | "request" | "status" | "profile";
type OrderStatus = "PENDING" | "CLAIMED" | "PLACED" | "PICKED_UP" | "COMPLETED";

type AppUser = {
  _id: string;
  name: string;
  sbuEmail: string;
  venmoHandle: string;
  year: string;
};

type ApiOrder = {
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

type UiOrder = {
  id: string;
  requesterId: string;
  requesterName: string;
  fulfillerId: string | null;
  fulfillerName: string | null;
  location: string;
  orderDetails: string;
  originalPrice: number;
  discountedPrice: number;
  status: OrderStatus;
  createdAt: string;
  venmoHandle: string;
  pickupTime: string;
  orderConfirmation: string | null;
};

type UserIndex = Record<string, { _id: string; name: string; venmoHandle: string }>;

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: "Open",
    dot: "bg-stone-400",
    bg: "bg-stone-100",
    text: "text-stone-600",
    border: "border-stone-200",
  },
  CLAIMED: {
    label: "Claimed",
    dot: "bg-sbu",
    bg: "bg-sbu-50",
    text: "text-sbu-dark",
    border: "border-sbu-100",
  },
  PLACED: {
    label: "Order Placed",
    dot: "bg-sbu",
    bg: "bg-sbu-50",
    text: "text-sbu-dark",
    border: "border-sbu-100",
  },
  PICKED_UP: {
    label: "Picked Up",
    dot: "bg-sbu",
    bg: "bg-sbu-50",
    text: "text-sbu-dark",
    border: "border-sbu-100",
  },
  COMPLETED: {
    label: "Done",
    dot: "bg-green-500",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
};

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return name;
  }
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

/** Shown on Home / Profile rows so requesters see claim vs. still waiting. */
function activeOrderHintForViewer(order: UiOrder, viewerId: string): string | null {
  if (order.requesterId === viewerId) {
    if (order.status === "PENDING") {
      return "Waiting for a student to claim — not placed on Nutrislice yet.";
    }
    if (order.status === "CLAIMED") {
      const who = order.fulfillerName ?? "A student";
      return `${who} claimed your order and is placing it on Nutrislice.`;
    }
    if (order.status === "PLACED") {
      return "Placed on Nutrislice — pick up when ready, then confirm below.";
    }
    if (order.status === "PICKED_UP") {
      return "Marked picked up — finish payment confirmation if needed.";
    }
  }
  if (order.fulfillerId === viewerId) {
    if (order.status === "CLAIMED") {
      return "You claimed this — place it on Nutrislice.";
    }
    if (order.status === "PLACED") {
      return "You placed this — waiting for requester to confirm pickup.";
    }
  }
  return null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) {
    return `${mins} min ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function toUiOrder(order: ApiOrder, users: UserIndex): UiOrder {
  const requester = users[order.requesterId];
  const fulfiller = order.fulfillerId ? users[order.fulfillerId] : null;
  return {
    id: order._id,
    requesterId: order.requesterId,
    requesterName: requester ? shortName(requester.name) : "Student",
    fulfillerId: order.fulfillerId,
    fulfillerName: fulfiller ? shortName(fulfiller.name) : null,
    location: order.location,
    orderDetails: order.orderDetails,
    originalPrice: order.originalPrice,
    discountedPrice: order.discountedPrice,
    status: order.status,
    createdAt: timeAgo(order.createdAt),
    venmoHandle: fulfiller?.venmoHandle ?? requester?.venmoHandle ?? "",
    pickupTime: order.pickupWindow,
    orderConfirmation: order.proofValue || null,
  };
}

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (!saved) {
      return null;
    }
    try {
      const raw = JSON.parse(saved) as Record<string, unknown>;
      if (
        typeof raw._id !== "string" ||
        typeof raw.name !== "string" ||
        typeof raw.sbuEmail !== "string" ||
        typeof raw.venmoHandle !== "string"
      ) {
        return null;
      }
      return {
        _id: raw._id,
        name: raw.name,
        sbuEmail: raw.sbuEmail,
        venmoHandle: raw.venmoHandle,
        year: typeof raw.year === "string" ? raw.year : "Student",
      };
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState<PageId>("home");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proofByOrderId, setProofByOrderId] = useState<Record<string, string>>({});
  const [withdrawnTotal, setWithdrawnTotal] = useState(0);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawModalSession, setWithdrawModalSession] = useState(0);

  const [loginForm, setLoginForm] = useState({
    name: "",
    sbuEmail: "",
    venmoHandle: "",
    year: "",
  });

  const loadUsers = useCallback(async (ids: string[]) => {
    const filtered = [...new Set(ids.filter(Boolean))];
    if (filtered.length === 0) {
      return {} as UserIndex;
    }
    const response = await fetch(`/api/users?ids=${filtered.join(",")}`);
    const payload = await response.json();
    if (!response.ok) {
      return {} as UserIndex;
    }
    const index: UserIndex = {};
    for (const row of payload.users ?? []) {
      index[row._id] = {
        _id: row._id,
        name: row.name,
        venmoHandle: row.venmoHandle ?? "",
      };
    }
    return index;
  }, []);

  const refreshOrders = useCallback(
    async (activeUser: AppUser) => {
      const [openRes, myRes] = await Promise.all([
        fetch("/api/orders?onlyOpen=true"),
        fetch(`/api/orders/my?userId=${activeUser._id}`),
      ]);
      const openData = await openRes.json();
      const myData = await myRes.json();
      if (!openRes.ok || !myRes.ok) {
        throw new Error(openData.error ?? myData.error ?? "Failed to load orders");
      }

      const allApiOrders = [
        ...(openData.orders ?? []),
        ...(myData.requested ?? []),
        ...(myData.claimed ?? []),
      ] as ApiOrder[];

      const byId = new Map<string, ApiOrder>();
      for (const order of allApiOrders) {
        byId.set(order._id, order);
      }
      const merged = [...byId.values()];
      const ids = merged.flatMap((order) => [order.requesterId, order.fulfillerId ?? ""]);
      const freshUsers = await loadUsers(ids);
      const lookup = freshUsers;
      setOrders(merged.map((order) => toUiOrder(order, lookup)));
    },
    [loadUsers]
  );

  useEffect(() => {
    if (!user) {
      setWithdrawnTotal(0);
      return;
    }
    setWithdrawnTotal(readWithdrawnTotal(user._id));
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        await refreshOrders(user);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to refresh orders");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    const timer = setInterval(() => void run(), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refreshOrders, user]);

  const navigate = (target: PageId, orderId?: string) => {
    setPage(target);
    setSelectedOrderId(orderId ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const persistUser = (nextUser: AppUser) => {
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const signOut = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setPage("home");
    setSelectedOrderId(null);
    setOrders([]);
    setError("");
    setProofByOrderId({});
    setLoginForm({
      name: "",
      sbuEmail: "",
      venmoHandle: "",
      year: "",
    });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: loginForm.name,
        sbuEmail: loginForm.sbuEmail,
        venmoHandle: loginForm.venmoHandle,
        roles: ["requester", "fulfiller"],
      }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.user) {
      setError(payload.error ?? "Login failed");
      return;
    }

    const nextUser: AppUser = {
      _id: payload.user._id,
      name: payload.user.name,
      sbuEmail: payload.user.sbuEmail,
      venmoHandle: payload.user.venmoHandle,
      year: loginForm.year || "Student",
    };
    persistUser(nextUser);
  };

  const demoSwitchUser = async () => {
    if (!user) return;
    
    const isAlice = user.sbuEmail === "alice@stonybrook.edu";
    
    const nextProfile = isAlice ? {
      name: "Bob (Demo)",
      sbuEmail: "bob@stonybrook.edu",
      venmoHandle: "@bob-venmo",
      year: "Freshman"
    } : {
      name: "Alice (Demo)",
      sbuEmail: "alice@stonybrook.edu",
      venmoHandle: "@alice-venmo",
      year: "Senior"
    };

    setLoading(true);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nextProfile.name,
        sbuEmail: nextProfile.sbuEmail,
        venmoHandle: nextProfile.venmoHandle,
        roles: ["requester", "fulfiller"],
      }),
    });
    const payload = await response.json();
    setLoading(false);
    
    if (response.ok && payload.user) {
      persistUser({
        _id: payload.user._id,
        ...nextProfile
      });
      navigate("home");
    } else {
      setError("Failed to switch demo user");
    }
  };

  const claimOrder = async (orderId: string) => {
    if (!user) {
      return;
    }
    const response = await fetch(`/api/orders/${orderId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfillerId: user._id }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Unable to claim");
      return;
    }
    await refreshOrders(user);
    navigate("status", orderId);
  };

  const updateOrderStatus = async (
    orderId: string,
    status: Exclude<OrderStatus, "PENDING" | "CLAIMED">,
    extra?: { orderConfirmation?: string }
  ) => {
    if (!user) {
      return;
    }
    if (status === "PLACED" && !user._id) {
      setError("Sign in to mark this order placed.");
      return;
    }
    const routeMap: Record<string, string> = {
      PLACED: "place",
      PICKED_UP: "picked-up",
      COMPLETED: "complete",
    };
    const route = routeMap[status];
    const body =
      status === "PLACED"
        ? {
            fulfillerId: user._id,
            proofValue: (extra?.orderConfirmation ?? "").trim(),
          }
        : { requesterId: user._id };

    const response = await fetch(`/api/orders/${orderId}/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Status update failed");
      return;
    }
    await refreshOrders(user);
  };

  const addOrder = async (order: {
    location: string;
    orderDetails: string;
    originalPrice: number;
    pickupTime: string;
  }) => {
    if (!user) {
      return;
    }
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterId: user._id,
        location: order.location,
        orderDetails: order.orderDetails,
        originalPrice: order.originalPrice,
        pickupWindow: order.pickupTime,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Failed to create order");
      return;
    }
    await refreshOrders(user);
    navigate("status", payload.orderId);
  };

  const stats = useMemo(() => {
    if (!user) {
      return {
        totalEarned: 0,
        totalSaved: 0,
        fulfillJobsCount: 0,
        requesterCompletedCount: 0,
      };
    }
    const claimedAsFulfiller = orders.filter(
      (order) => order.fulfillerId === user._id && order.status !== "PENDING"
    );
    const completedAsFulfiller = orders.filter(
      (order) => order.fulfillerId === user._id && order.status === "COMPLETED"
    );
    const completedAsRequester = orders.filter(
      (order) => order.requesterId === user._id && order.status === "COMPLETED"
    );
    return {
      totalEarned: completedAsFulfiller.reduce((sum, order) => sum + order.discountedPrice, 0),
      totalSaved: completedAsRequester.reduce(
        (sum, order) => sum + (order.originalPrice - order.discountedPrice),
        0
      ),
      fulfillJobsCount: claimedAsFulfiller.length,
      requesterCompletedCount: completedAsRequester.length,
    };
  }, [orders, user]);

  const walletAvailable = useMemo(() => {
    if (!user) {
      return 0;
    }
    return Math.max(0, Math.round((stats.totalEarned - withdrawnTotal) * 100) / 100);
  }, [user, stats.totalEarned, withdrawnTotal]);

  const confirmWithdraw = useCallback(
    (amount: number) => {
      if (!user) {
        return;
      }
      const rounded = Math.round(amount * 100) / 100;
      const cap = Math.max(0, Math.round((stats.totalEarned - withdrawnTotal) * 100) / 100);
      if (rounded <= 0 || rounded > cap + 0.001) {
        return;
      }
      const next = Math.round((withdrawnTotal + rounded) * 100) / 100;
      setWithdrawnTotal(next);
      persistWithdrawnTotal(user._id, next);
      setWithdrawModalOpen(false);
    },
    [user, stats.totalEarned, withdrawnTotal]
  );

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sbu">
              The Campus Food Exchange
            </p>
            <h1 className="font-display text-4xl font-bold text-gray-900">Connect your account</h1>
            <p className="mt-2 text-sm text-gray-600">
              <strong>Turn Dining Dollars into cash, or eat for half price.</strong>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              One account can post requests and claim others&apos; orders. Use Demo Switch Account or sign out
              to try a second student in the same browser.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              className="input-field"
              placeholder="Full name"
              value={loginForm.name}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <input
              className="input-field"
              type="email"
              placeholder="SBU email"
              value={loginForm.sbuEmail}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, sbuEmail: event.target.value }))
              }
            />
            <input
              className="input-field"
              placeholder="Venmo handle"
              value={loginForm.venmoHandle}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, venmoHandle: event.target.value }))
              }
            />
            <input
              className="input-field"
              placeholder="Year (optional)"
              value={loginForm.year}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, year: event.target.value }))
              }
            />
            <button className="btn-primary" disabled={loading}>
              {loading ? "Entering..." : "Enter app"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F7F6F3] font-sans">
      <Navbar page={page} navigate={navigate} signOut={signOut} demoSwitchUser={demoSwitchUser} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 md:pb-12 md:pt-6 lg:px-8">
        {page === "home" && (
          <HomeView
            navigate={navigate}
            user={user}
            orders={orders}
            claimOrder={claimOrder}
            stats={stats}
            wallet={{
              grossEarned: stats.totalEarned,
              withdrawn: withdrawnTotal,
              available: walletAvailable,
            }}
            onOpenWithdraw={() => {
              setWithdrawModalSession((s) => s + 1);
              setWithdrawModalOpen(true);
            }}
          />
        )}
        {page === "marketplace" && (
          <MarketplaceView
            orders={orders}
            user={user}
            navigate={navigate}
            claimOrder={claimOrder}
          />
        )}
        {page === "request" && <RequestOrderView addOrder={addOrder} />}
        {page === "status" && (
          <OrderStatusView
            orderId={selectedOrderId}
            orders={orders}
            user={user}
            proofByOrderId={proofByOrderId}
            setProofByOrderId={setProofByOrderId}
            updateOrderStatus={updateOrderStatus}
            navigate={navigate}
          />
        )}
        {page === "profile" && (
          <ProfileView
            user={user}
            orders={orders}
            stats={stats}
            navigate={navigate}
            signOut={signOut}
            demoSwitchUser={demoSwitchUser}
            wallet={{
              grossEarned: stats.totalEarned,
              withdrawn: withdrawnTotal,
              available: walletAvailable,
            }}
            onOpenWithdraw={() => {
              setWithdrawModalSession((s) => s + 1);
              setWithdrawModalOpen(true);
            }}
          />
        )}
        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}
      </main>
      <WithdrawToBankModal
        key={withdrawModalSession}
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        available={walletAvailable}
        onConfirm={confirmWithdraw}
      />
    </div>
  );
}

function WithdrawToBankModal({
  open,
  onClose,
  available,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  available: number;
  onConfirm: (amount: number) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amountStr, setAmountStr] = useState(() => {
    const c = Math.round(available * 100) / 100;
    return c > 0 ? c.toFixed(2) : "";
  });

  if (!open) {
    return null;
  }

  const cap = Math.round(available * 100) / 100;
  const amount = parseFloat(amountStr);
  const valid = !Number.isNaN(amount) && amount > 0 && amount <= cap + 0.005;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-title"
    >
      <div className="card relative max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-stone-100 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {cap <= 0 ? (
          <div className="space-y-3 pr-8">
            <h2 id="withdraw-title" className="font-display text-xl font-bold text-gray-900">
              Withdraw to bank
            </h2>
            <p className="text-sm text-gray-600">
              Nothing available to withdraw yet. Fulfill orders and wait for requesters to confirm pickup.
            </p>
            <button type="button" className="btn-primary w-full" onClick={onClose}>
              OK
            </button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4 pr-8">
            <h2 id="withdraw-title" className="font-display text-xl font-bold text-gray-900">
              Withdraw to bank
            </h2>
            <p className="text-sm text-gray-500">
              Demo only—no real money moves. Simulates sending your TradeEats balance to a linked account.
            </p>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Linked account</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                    IB
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Island Federal Credit Union</p>
                    <p className="text-xs text-gray-500">Checking ·•••• 7890</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-sbu">Change</span>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="withdraw-amount">
                Amount
              </label>
              <input
                id="withdraw-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={cap}
                className="input-field"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">Available: ${cap.toFixed(2)}</p>
            </div>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setAmountStr(cap.toFixed(2))}
            >
              Withdraw all (${cap.toFixed(2)})
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={!valid}
                onClick={() => valid && setStep(2)}
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pr-8">
            <h2 className="font-display text-xl font-bold text-gray-900">Confirm transfer</h2>
            <p className="text-sm text-gray-600">
              Send{" "}
              <span className="font-bold text-gray-900">${amount.toFixed(2)}</span> to Checking ·•••• 7890?
            </p>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Standard ACH (demo): funds typically arrive in 1–3 business days.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  if (valid) {
                    onConfirm(amount);
                  }
                }}
              >
                Confirm withdrawal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Navbar({
  page,
  navigate,
  signOut,
  demoSwitchUser,
}: {
  page: PageId;
  navigate: (target: PageId, orderId?: string) => void;
  signOut: () => void;
  demoSwitchUser: () => void;
}) {
  const navItems = [
    { id: "home" as const, label: "Home" },
    { id: "marketplace" as const, label: "Orders" },
    { id: "request" as const, label: "Post", primary: true },
    { id: "profile" as const, label: "Profile" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-100 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-8">
            <button
              onClick={() => navigate("home")}
              className="shrink-0 rounded focus-visible:ring-2 focus-visible:ring-sbu/30"
            >
              <span className="font-display text-xl font-bold tracking-tight text-gray-900">
                Trade<span className="text-sbu">Eats</span>
              </span>
            </button>
            <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:flex lg:gap-1">
              {navItems.map((item) => {
                const target = item.id;
                const isActive = page === target;
                if (item.primary) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => navigate(target)}
                      className="ml-1 shrink-0 rounded-full bg-sbu px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sbu-dark"
                    >
                      {item.label}
                    </button>
                  );
                }
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(target)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "font-semibold text-sbu"
                        : "text-gray-500 hover:bg-stone-50 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={demoSwitchUser}
              className="rounded-full bg-purple-100 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-200 sm:px-3 sm:text-xs"
              title="Demo: Switch to another account"
            >
              Demo Switch Account
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-500 hover:bg-stone-100 hover:text-gray-900 sm:px-3 sm:text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-100 bg-white md:hidden">
        <div
          className="mx-auto flex h-16 max-w-lg items-center justify-around px-1"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {navItems.map((item) => {
            const target = item.id;
            const isActive = page === target;
            if (item.primary) {
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(target)}
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-bold ${
                    isActive ? "text-sbu" : "text-gray-500"
                  }`}
                >
                  <span className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-sbu text-sm text-white">
                    +
                  </span>
                  {item.label}
                </button>
              );
            }
            return (
              <button
                key={item.label}
                onClick={() => navigate(target)}
                className={`min-w-0 flex-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${
                  isActive ? "text-sbu" : "text-gray-400"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function StatusBadge({ status, size = "sm" }: { status: OrderStatus; size?: "sm" | "lg" }) {
  const config = STATUS_CONFIG[status];
  const textSize = size === "lg" ? "text-sm" : "text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${textSize} ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function HomeView({
  navigate,
  user,
  orders,
  claimOrder,
  stats,
  wallet,
  onOpenWithdraw,
}: {
  navigate: (target: PageId, orderId?: string) => void;
  user: AppUser;
  orders: UiOrder[];
  claimOrder: (orderId: string) => Promise<void>;
  stats: {
    totalEarned: number;
    totalSaved: number;
    fulfillJobsCount: number;
    requesterCompletedCount: number;
  };
  wallet: { grossEarned: number; withdrawn: number; available: number };
  onOpenWithdraw: () => void;
}) {
  const [locationFilter, setLocationFilter] = useState("All");
  const marketplacePendingOrders = orders.filter((order) => order.status === "PENDING");
  const myPostedInProgress = orders.filter(
    (order) => order.requesterId === user._id && order.status !== "COMPLETED"
  );
  const myActiveOrders = orders.filter(
    (order) =>
      (order.requesterId === user._id || order.fulfillerId === user._id) &&
      order.status !== "COMPLETED"
  );
  const homeOpenOrders = marketplacePendingOrders.filter(
    (order) => locationFilter === "All" || order.location === locationFilter
  );

  const scrollToOpenOrders = () => {
    document.getElementById("open-orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToMyInProgress = () => {
    document.getElementById("my-in-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-10 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-400">
            {user.year} · {user.sbuEmail.split("@")[1]}
          </p>
        </div>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="p-6 pb-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sbu">
                The Campus Food Exchange
              </p>
              <h1 className="mb-3 font-display text-[2rem] font-bold leading-tight text-gray-900">
                Turn Dining Dollars into cash, or eat for half price.
              </h1>
              <div className="mb-6 space-y-2 text-sm leading-relaxed text-gray-600">
                <p>
                  <strong className="text-gray-900">Got extra Dining Dollars?</strong> Pay for someone&apos;s meal
                  on Nutrislice and collect real money.
                </p>
                <p>
                  <strong className="text-gray-900">No meal plan?</strong> Post what you want to eat, pay upfront,
                  and save 50% off the menu price.
                </p>
              </div>
              <div className="grid gap-3 pb-6 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate("request")}
                  className="btn-primary flex flex-col items-center justify-center gap-1 py-4"
                >
                  <span className="text-base">Get 50% off food</span>
                  <span className="text-xs font-normal opacity-80">Post a request</span>
                </button>
                <button
                  type="button"
                  onClick={scrollToOpenOrders}
                  className="btn-primary flex flex-col items-center justify-center gap-1 bg-green-700 py-4 hover:bg-green-800"
                >
                  <span className="text-base">Cash out Dining Dollars</span>
                  <span className="text-xs font-normal opacity-80">Fulfill open orders</span>
                </button>
              </div>
            </div>
            <div
              className="border-t border-stone-100 px-6 py-5"
              style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 75%)" }}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-800/80">
                Your pending requests
              </p>
              <p className="font-display text-3xl font-bold text-gray-900">{myPostedInProgress.length}</p>
              <p className="mt-2 text-sm text-gray-600">
                Food requests you posted that aren&apos;t finished yet — waiting for a match, pickup, or
                confirmation.
              </p>
              {myPostedInProgress.length > 0 ? (
                <button
                  type="button"
                  onClick={scrollToMyInProgress}
                  className="btn-secondary mt-4 w-full border-amber-200/80 text-sm font-semibold text-amber-950 hover:bg-amber-50"
                >
                  View in progress
                </button>
              ) : (
                <p className="mt-3 text-xs text-gray-400">
                  None right now. Use &quot;Get 50% off food&quot; to post a request.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className="card border-sbu-100 p-5"
              style={{ background: "linear-gradient(135deg, #FFF0F0 0%, #fff 70%)" }}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Wallet (fulfilling)
              </p>
              <p className="font-display text-3xl font-bold text-sbu">${wallet.available.toFixed(2)}</p>
              <p className="mt-1 text-xs text-gray-400">
                Available · Gross ${wallet.grossEarned.toFixed(2)} · Withdrawn (demo) $
                {wallet.withdrawn.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-gray-400">{stats.fulfillJobsCount} active / completed jobs</p>
              <button
                type="button"
                className="btn-secondary mt-3 w-full border-sbu/30 text-sm font-semibold text-sbu-dark"
                onClick={onOpenWithdraw}
              >
                Withdraw to bank
              </button>
            </div>
            <div
              className="card border-green-200 p-5"
              style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #fff 70%)" }}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Saved (posting)
              </p>
              <p className="font-display text-3xl font-bold text-green-700">
                ${stats.totalSaved.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-gray-400">{stats.requesterCompletedCount} meals completed</p>
            </div>
          </div>

          {myActiveOrders.length > 0 && (
            <div id="my-in-progress" className="scroll-mt-28">
              <p className="mb-2 text-sm font-semibold text-gray-600">In progress</p>
              <div className="space-y-2">
                {myActiveOrders.map((order) => {
                  const hint = activeOrderHintForViewer(order, user._id);
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => navigate("status", order.id)}
                      className="card flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-stone-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{order.location}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{order.orderDetails}</p>
                        {hint ? (
                          <p
                            className={`mt-2 text-xs font-medium leading-snug ${
                              order.requesterId === user._id && order.status === "PENDING"
                                ? "text-amber-700"
                                : order.requesterId === user._id &&
                                    (order.status === "CLAIMED" || order.status === "PLACED")
                                  ? "text-green-700"
                                  : "text-gray-600"
                            }`}
                          >
                            {hint}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge status={order.status} />
                        <span className="text-gray-300">›</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <section id="open-orders" className="scroll-mt-28 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900">Open orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              {homeOpenOrders.length} waiting · claim, place on Nutrislice, get paid when they confirm pickup
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("marketplace")}
            className="shrink-0 text-sm font-semibold text-sbu hover:underline"
          >
            All locations & filters
          </button>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {["All", ...LOCATIONS].slice(0, 8).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocationFilter(loc)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
                locationFilter === loc
                  ? "bg-sbu text-white"
                  : "border border-stone-200 bg-white text-gray-600"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        {homeOpenOrders.length === 0 ? (
          <div className="card p-8">
            <p className="mb-1 font-display text-xl font-bold text-gray-900">No open orders here</p>
            <p className="text-sm text-gray-400">Try another location or post the first request.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homeOpenOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                user={user}
                onTake={claimOrder}
                onViewStatus={(orderId) => navigate("status", orderId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MarketplaceView({
  orders,
  user,
  navigate,
  claimOrder,
}: {
  orders: UiOrder[];
  user: AppUser;
  navigate: (target: PageId, orderId?: string) => void;
  claimOrder: (orderId: string) => Promise<void>;
}) {
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const visibleOrders = orders
    .filter((order) => order.status === "PENDING")
    .filter((order) => locationFilter === "All" || order.location === locationFilter);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h2 className="font-display text-3xl font-bold text-gray-900">Open Orders</h2>
        <p className="mt-1 text-sm text-gray-400">
          {visibleOrders.length} order{visibleOrders.length !== 1 ? "s" : ""} waiting · claim, place on
          Nutrislice, get paid when the requester confirms pickup
        </p>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {["All", ...LOCATIONS].slice(0, 6).map((loc) => (
          <button
            key={loc}
            onClick={() => setLocationFilter(loc)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
              locationFilter === loc
                ? "bg-sbu text-white"
                : "border border-stone-200 bg-white text-gray-600"
            }`}
          >
            {loc}
          </button>
        ))}
      </div>

      {visibleOrders.length === 0 ? (
        <div className="card p-8">
          <p className="mb-1 font-display text-xl font-bold text-gray-900">No open orders</p>
          <p className="text-sm text-gray-400">New requests come in throughout the day.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              user={user}
              onTake={claimOrder}
              onViewStatus={(orderId) => navigate("status", orderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  user,
  onTake,
  onViewStatus,
}: {
  order: UiOrder;
  user: AppUser;
  onTake: (orderId: string) => Promise<void>;
  onViewStatus: (orderId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const isPending = order.status === "PENDING";
  const isOwnRequest = order.requesterId === user._id;
  const isMyOrder = isOwnRequest || order.fulfillerId === user._id;
  const canClaim = isPending && !isOwnRequest;

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-600">{order.location}</p>
          <p className="text-xs text-gray-400">{order.createdAt}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <p className="text-sm leading-relaxed text-gray-800">&quot;{order.orderDetails}&quot;</p>
      <p className="text-xs text-gray-400">
        Requested by <span className="font-medium text-gray-600">{order.requesterName}</span>
      </p>

      <div className="flex items-center justify-between border-t border-stone-100 pt-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Nutrislice / menu</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold text-gray-900">
              ${order.originalPrice.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">full price</span>
          </div>
        </div>
        {canClaim && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-xl bg-sbu px-3.5 py-2 text-sm font-semibold text-white"
          >
            Take it
          </button>
        )}
      </div>

      {isPending && isOwnRequest && (
        <p className="text-xs text-amber-700">
          This is your request—only another student can claim it. Track it from Home or Profile.
        </p>
      )}

      {confirming && canClaim && (
        <div className="space-y-3 border-t border-stone-100 pt-2">
          <p className="text-xs text-gray-600">
            Order on Nutrislice with dining dollars, then collect payment automatically.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => void onTake(order.id)}
              className="flex-1 rounded-xl bg-sbu py-2.5 text-xs font-semibold text-white"
            >
              Confirm claim
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl bg-stone-100 py-2.5 text-xs font-semibold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isMyOrder && (
        <button
          type="button"
          onClick={() => onViewStatus(order.id)}
          className="w-full py-1 text-center text-sm font-semibold text-sbu"
        >
          View status →
        </button>
      )}
    </div>
  );
}

function RequestOrderView({
  addOrder,
}: {
  addOrder: (order: {
    location: string;
    orderDetails: string;
    originalPrice: number;
    pickupTime: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    location: "",
    orderDetails: "",
    originalPrice: "",
    pickupTime: "",
    customizations: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const isSavor = form.location === "Savor";
  const isSmash = form.location === "Smash N' Shake";
  const isPopeyes = form.location === "Popeyes";
  const isSubway = form.location === "Subway";
  const activeMenu = isSavor ? SAVOR_MENU : isSmash ? SMASH_MENU : isPopeyes ? POPEYES_MENU : isSubway ? SUBWAY_MENU : null;

  const derivedCart = useMemo(() => {
    let total = 0;
    const details: string[] = [];
    if (activeMenu) {
      for (const [id, qty] of Object.entries(cart)) {
        if (qty > 0) {
          const item = activeMenu.find((m) => m.id === id);
          if (item) {
            total += item.price * qty;
            details.push(`${qty}x ${item.name}`);
          }
        }
      }
    }
    return {
      originalPrice: total > 0 ? total.toFixed(2) : "",
      orderDetails: details.join(", "),
    };
  }, [cart, activeMenu]);

  const effectiveOriginalPrice = activeMenu ? derivedCart.originalPrice : form.originalPrice;
  const effectiveOrderDetails = activeMenu 
    ? derivedCart.orderDetails + (form.customizations.trim() ? `\n\nCustomizations:\n${form.customizations.trim()}` : "")
    : form.orderDetails;

  const updateCart = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const discountedPrice = effectiveOriginalPrice ? (parseFloat(effectiveOriginalPrice) / 2).toFixed(2) : null;

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.location) {
      nextErrors.location = "Pick a location";
    }
    if (!effectiveOrderDetails.trim()) {
      nextErrors.orderDetails = activeMenu ? "Add at least one item from the menu" : "Describe your order";
    }
    if (
      !effectiveOriginalPrice ||
      Number.isNaN(parseFloat(effectiveOriginalPrice)) ||
      parseFloat(effectiveOriginalPrice) <= 0
    ) {
      nextErrors.originalPrice = "Enter menu price";
    }
    if (!form.pickupTime.trim()) {
      nextErrors.pickupTime = "Add a pickup window";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    if (!showPreview) {
      setShowPreview(true);
      return;
    }
    await addOrder({
      location: form.location,
      orderDetails: effectiveOrderDetails,
      originalPrice: parseFloat(effectiveOriginalPrice),
      pickupTime: form.pickupTime,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-2">
      <div>
        <h2 className="font-display text-3xl font-bold text-gray-900">Post a Request</h2>
        <p className="mt-1 text-sm text-gray-400">
          Students with dining dollars will see this and place your order.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Dining Location</label>
          <select
            className={`input-field ${errors.location ? "border-red-400" : ""}`}
            value={form.location}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, location: event.target.value }));
              setCart({}); // Reset cart on location change
            }}
          >
            <option value="">Choose a location…</option>
            {LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location} {["Savor", "Smash N' Shake", "Popeyes", "Subway"].includes(location) ? "(Menu Available)" : ""}
              </option>
            ))}
          </select>
        </div>

        {activeMenu ? (
          <div className="space-y-6">
            {Object.entries(
              activeMenu.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, MenuItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-display text-lg font-bold text-gray-900">{category}</h3>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {items.map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id} className="card flex flex-col justify-between p-3">
                        <div className="mb-3">
                          <p className="text-xs font-bold text-gray-900">{item.name}</p>
                          <p className="text-[11px] text-gray-500">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          {qty > 0 ? (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => updateCart(item.id, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-gray-600 hover:bg-stone-200"
                              >
                                -
                              </button>
                              <span className="text-sm font-bold text-gray-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateCart(item.id, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-sbu text-white hover:bg-sbu-dark"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateCart(item.id, 1)}
                              className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-stone-200"
                            >
                              Add +
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {isSubway && (
              <div className="space-y-3 pt-2">
                <h3 className="font-display text-lg font-bold text-gray-900">Customizations</h3>
                <p className="text-xs text-gray-500">List your bread, cheese, veggies, and sauces here.</p>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="e.g. Italian Herbs & Cheese, Pepper Jack, toasted, lettuce, tomatoes, chipotle southwest"
                  value={form.customizations}
                  onChange={(event) => setForm((prev) => ({ ...prev, customizations: event.target.value }))}
                />
              </div>
            )}

            {errors.orderDetails && <p className="text-sm text-red-500">{errors.orderDetails}</p>}
          </div>
        ) : (
          <>
            <div>
              <label className="label">What do you want?</label>
              <textarea
                rows={4}
                className={`input-field resize-none ${errors.orderDetails ? "border-red-400" : ""}`}
                value={form.orderDetails}
                onChange={(event) => setForm((prev) => ({ ...prev, orderDetails: event.target.value }))}
              />
            </div>

            <div>
              <label className="label">Menu price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`input-field ${errors.originalPrice ? "border-red-400" : ""}`}
                value={form.originalPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, originalPrice: event.target.value }))}
              />
            </div>
          </>
        )}

        <div>
          <label className="label">Pickup window</label>
          <input
            type="time"
            className={`input-field ${errors.pickupTime ? "border-red-400" : ""}`}
            value={form.pickupTime}
            onChange={(event) => setForm((prev) => ({ ...prev, pickupTime: event.target.value }))}
          />
        </div>
      </div>

      {discountedPrice && (
        <div className="card border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">Your deal</p>
          <p className="text-sm text-gray-500">
            You pay <span className="text-xl font-black text-green-700">${discountedPrice}</span> (50%
            off)
          </p>
        </div>
      )}

      {showPreview && (
        <div className="card border-sbu/20 bg-sbu-50 p-4 text-sm space-y-3">
          <p className="font-semibold text-gray-900">Payment Details</p>
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-10 items-center justify-center rounded bg-stone-100">
                <span className="text-[10px] font-bold text-gray-500">CARD</span>
              </div>
              <span className="font-medium text-gray-700">•••• 4242</span>
            </div>
            <span className="text-xs font-semibold text-sbu">Change</span>
          </div>
          <p className="text-xs text-gray-500">
            Your card will be charged <span className="font-bold">${discountedPrice}</span> now. The fulfiller will receive this money once you confirm pickup.
          </p>
        </div>
      )}
      <button onClick={() => void submit()} className="btn-primary">
        {showPreview ? `Pay $${discountedPrice} & post order` : "Proceed to payment"}
      </button>
    </div>
  );
}

function OrderStatusView({
  orderId,
  orders,
  user,
  proofByOrderId,
  setProofByOrderId,
  updateOrderStatus,
  navigate,
}: {
  orderId: string | null;
  orders: UiOrder[];
  user: AppUser;
  proofByOrderId: Record<string, string>;
  setProofByOrderId: Dispatch<SetStateAction<Record<string, string>>>;
  updateOrderStatus: (
    orderId: string,
    status: Exclude<OrderStatus, "PENDING" | "CLAIMED">,
    extra?: { orderConfirmation?: string }
  ) => Promise<void>;
  navigate: (target: PageId, orderId?: string) => void;
}) {
  const order = orders.find((row) => row.id === orderId);
  if (!order) {
    return (
      <div className="pt-2">
        <div className="card p-6">
          <p className="mb-1 font-display text-2xl font-bold text-gray-900">Order not found</p>
          <button className="btn-primary" onClick={() => navigate("marketplace")}>
            Orders
          </button>
        </div>
      </div>
    );
  }

  const isRequester = order.requesterId === user._id;
  const isFulfiller = order.fulfillerId === user._id;

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold text-gray-900">{order.location}</h2>
          <p className="text-xs text-gray-400">{order.createdAt}</p>
        </div>
        <StatusBadge status={order.status} size="lg" />
      </div>

      <div className="card space-y-2 p-4">
        <p className="section-title">Order details</p>
        <p className="text-sm text-gray-800">&quot;{order.orderDetails}&quot;</p>
        <p className="text-sm text-gray-500">Pickup: {order.pickupTime}</p>
        {order.orderConfirmation && (
          <p className="text-sm text-sbu">Confirmation: {order.orderConfirmation}</p>
        )}
      </div>

      {isRequester && order.status === "PENDING" && (
        <div className="card border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Still on the marketplace</p>
          <p className="mt-1 text-xs text-amber-800">
            No one has claimed this yet. A student with dining dollars still needs to tap &quot;Take it&quot;
            before anything is ordered on Nutrislice.
          </p>
        </div>
      )}

      {isRequester && order.status === "CLAIMED" && (
        <div className="card border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">Someone took your order</p>
          <p className="mt-1 text-xs text-green-800">
            {order.fulfillerName ? (
              <>
                <span className="font-semibold">{order.fulfillerName}</span> claimed it and should be
                placing it on Nutrislice now. You&apos;ll see &quot;Order Placed&quot; when they finish.
              </>
            ) : (
              <>A fulfiller claimed it and is placing it on Nutrislice. Status will update when they mark it placed.</>
            )}
          </p>
        </div>
      )}

      {isFulfiller && order.status === "CLAIMED" && (
        <div className="card space-y-3 p-4">
          <p className="section-title">Mark as placed</p>
          <input
            className="input-field"
            placeholder="Nutrislice confirmation number (optional)"
            value={proofByOrderId[order.id] ?? ""}
            onChange={(event) =>
              setProofByOrderId((prev) => ({ ...prev, [order.id]: event.target.value }))
            }
          />
          <p className="text-xs text-gray-500">
            Add a confirmation if you have one; you can still mark placed without it.
          </p>
          <button
            className="btn-primary"
            onClick={() =>
              void updateOrderStatus(order.id, "PLACED", {
                orderConfirmation: proofByOrderId[order.id] ?? "",
              })
            }
          >
            I placed the order ✓
          </button>
        </div>
      )}

      {isRequester && order.status === "PLACED" && (
        <div className="card space-y-3 p-4">
          <p className="text-sm font-semibold text-gray-900">Did you receive your food?</p>
          <p className="text-xs text-gray-500">
            Your payment of <span className="font-bold">${order.discountedPrice.toFixed(2)}</span> is currently held in escrow. Confirming pickup will release these funds to the fulfiller.
          </p>
          <button className="btn-primary" onClick={() => void updateOrderStatus(order.id, "COMPLETED")}>
            I got the order ✓
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileView({
  user,
  orders,
  stats,
  navigate,
  signOut,
  demoSwitchUser,
  wallet,
  onOpenWithdraw,
}: {
  user: AppUser;
  orders: UiOrder[];
  stats: {
    totalEarned: number;
    totalSaved: number;
    fulfillJobsCount: number;
    requesterCompletedCount: number;
  };
  navigate: (target: PageId, orderId?: string) => void;
  signOut: () => void;
  demoSwitchUser: () => void;
  wallet: { grossEarned: number; withdrawn: number; available: number };
  onOpenWithdraw: () => void;
}) {
  const myOrders = orders.filter(
    (order) => order.requesterId === user._id || order.fulfillerId === user._id
  );
  const activeOrders = myOrders.filter((order) => order.status !== "COMPLETED");
  const historyOrders = myOrders.filter((order) => order.status === "COMPLETED");

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-base font-bold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-400">{user.sbuEmail}</p>
                <p className="text-xs text-gray-400">{user.year}</p>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                Student
              </span>
            </div>
            <div className="mb-4 rounded-xl bg-stone-50 px-3 py-2.5">
              <span className="text-xs text-gray-400">Wallet (available)</span>
              <p className="text-lg font-bold text-gray-900">${wallet.available.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-gray-500">
                Gross from fulfillments ${wallet.grossEarned.toFixed(2)} · Sent to bank (demo) $
                {wallet.withdrawn.toFixed(2)}
              </p>
              <button
                type="button"
                className="btn-secondary mt-3 w-full border-sbu/30 text-sm font-semibold text-sbu-dark"
                onClick={onOpenWithdraw}
              >
                Withdraw to bank
              </button>
            </div>
            <button
              type="button"
              onClick={demoSwitchUser}
              className="btn-secondary border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
            >
              Demo: Switch Account
            </button>
            <button
              type="button"
              onClick={signOut}
              className="btn-secondary mt-2 border border-stone-200 text-gray-600 hover:bg-red-50 hover:text-red-800"
            >
              Sign out
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              Demo switch jumps between two test accounts. Sign out to use any SBU email.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard value={`$${stats.totalEarned.toFixed(2)}`} label="Gross earned" accent />
            <StatCard value={`$${wallet.withdrawn.toFixed(2)}`} label="Withdrawn (demo)" />
            <StatCard value={`$${stats.totalSaved.toFixed(2)}`} label="Saved (post)" />
            <StatCard value={`${stats.fulfillJobsCount}`} label="Fulfill jobs" />
            <StatCard value={`${stats.requesterCompletedCount}`} label="Posts completed" />
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {activeOrders.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-600">In progress</p>
              <div className="space-y-2">
                {activeOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    viewerId={user._id}
                    onOpen={() => navigate("status", order.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {historyOrders.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-600">History</p>
              <div className="space-y-2">
                {historyOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    viewerId={user._id}
                    onOpen={() => navigate("status", order.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card p-4 ${accent ? "border-sbu-100" : ""}`}
      style={accent ? { background: "linear-gradient(135deg, #FFF0F0 0%, #fff 70%)" } : undefined}
    >
      <p className={`font-display text-3xl font-bold ${accent ? "text-sbu" : "text-gray-900"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-gray-600">{label}</p>
    </div>
  );
}

function OrderRow({
  order,
  viewerId,
  onOpen,
}: {
  order: UiOrder;
  viewerId: string;
  onOpen: () => void;
}) {
  const hint = activeOrderHintForViewer(order, viewerId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-stone-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{order.location}</p>
        <p className="line-clamp-2 text-xs text-gray-400">{order.orderDetails}</p>
        <p className="mt-1 text-xs text-gray-400">{order.createdAt}</p>
        {hint ? (
          <p
            className={`mt-2 text-xs font-medium leading-snug ${
              order.requesterId === viewerId && order.status === "PENDING"
                ? "text-amber-700"
                : order.requesterId === viewerId &&
                    (order.status === "CLAIMED" || order.status === "PLACED")
                  ? "text-green-700"
                  : "text-gray-600"
            }`}
          >
            {hint}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <StatusBadge status={order.status} />
        <p className="mt-2 text-sm font-bold text-gray-900">${order.originalPrice.toFixed(2)}</p>
        <p className="text-[10px] text-gray-400">menu</p>
      </div>
    </button>
  );
}
