"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { OrderStatus } from "@/lib/types";
import {
  USER_STORAGE_KEY,
  readStoredPersona,
  BOB_USER,
  ALICE_USER,
  DEMO_USER_LOOKUP,
  DEMO_BOB_ID,
  DEMO_BOB_EMAIL,
  type AppUser,
} from "@/lib/demo-personas";
import {
  LOCAL_ORDERS_STORAGE_KEY,
  loadLocalOrders,
  saveLocalOrders,
  visibleOrdersForUser,
  createLocalOrder,
  claimLocalOrder,
  markPlacedLocalOrder,
  markPickedUpLocalOrder,
  completeLocalOrder,
  type LocalOrder,
} from "@/lib/local-orders";

const WITHDRAWN_STORAGE_KEY = "hackathon-wallet-withdrawn-v1";

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

const MENU_LOCATION_IDS = new Set<string>(["Savor", "Smash N' Shake", "Popeyes", "Subway"]);

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

function toUiOrder(order: LocalOrder, users: typeof DEMO_USER_LOOKUP): UiOrder {
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
  const [user, setUser] = useState<AppUser>(BOB_USER);
  const [page, setPage] = useState<PageId>("home");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [error, setError] = useState("");
  const [proofByOrderId, setProofByOrderId] = useState<Record<string, string>>({});
  const [withdrawnTotal, setWithdrawnTotal] = useState(0);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawModalSession, setWithdrawModalSession] = useState(0);

  useEffect(() => {
    setUser(readStoredPersona());
  }, []);

  useEffect(() => {
    setLocalOrders(loadLocalOrders());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCAL_ORDERS_STORAGE_KEY || e.newValue == null) {
        return;
      }
      try {
        const next = JSON.parse(e.newValue) as unknown;
        if (Array.isArray(next)) {
          setLocalOrders(next as LocalOrder[]);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const orders = useMemo(
    () =>
      visibleOrdersForUser(localOrders, user._id).map((order) =>
        toUiOrder(order, DEMO_USER_LOOKUP)
      ),
    [localOrders, user._id]
  );

  const localOrdersRef = useRef<LocalOrder[]>(localOrders);
  localOrdersRef.current = localOrders;

  useEffect(() => {
    setWithdrawnTotal(readWithdrawnTotal(user._id));
  }, [user]);

  const navigate = (target: PageId, orderId?: string) => {
    setPage(target);
    setSelectedOrderId(orderId ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const switchAccount = useCallback(() => {
    setUser((prev) => {
      const next = prev._id === DEMO_BOB_ID ? ALICE_USER : BOB_USER;
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* demo storage */
      }
      return next;
    });
    setPage("home");
    setSelectedOrderId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const claimOrder = useCallback(
    (orderId: string) => {
      const result = claimLocalOrder(localOrdersRef.current, orderId, user._id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      saveLocalOrders(result.orders);
      setLocalOrders(result.orders);
      setError("");
      navigate("status", orderId);
    },
    [user._id]
  );

  const updateOrderStatus = useCallback(
    (
      orderId: string,
      status: Exclude<OrderStatus, "PENDING" | "CLAIMED">,
      extra?: { orderConfirmation?: string }
    ) => {
      const prev = localOrdersRef.current;
      const result =
        status === "PLACED"
          ? markPlacedLocalOrder(prev, orderId, user._id, extra?.orderConfirmation ?? "")
          : status === "PICKED_UP"
            ? markPickedUpLocalOrder(prev, orderId, user._id)
            : completeLocalOrder(prev, orderId, user._id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      saveLocalOrders(result.orders);
      setLocalOrders(result.orders);
      setError("");
    },
    [user._id]
  );

  const addOrder = useCallback(
    (order: {
      location: string;
      orderDetails: string;
      originalPrice: number;
      pickupTime: string;
    }) => {
      const result = createLocalOrder(localOrdersRef.current, {
        requesterId: user._id,
        location: order.location,
        orderDetails: order.orderDetails,
        originalPrice: order.originalPrice,
        pickupWindow: order.pickupTime,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      saveLocalOrders(result.orders);
      setLocalOrders(result.orders);
      setError("");
      navigate("status", result.orderId);
    },
    [user._id]
  );

  const stats = useMemo(() => {
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
    return Math.max(0, Math.round((stats.totalEarned - withdrawnTotal) * 100) / 100);
  }, [stats.totalEarned, withdrawnTotal]);

  const confirmWithdraw = useCallback(
    (amount: number) => {
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

  return (
    <div className="min-h-dvh bg-[#F7F6F3] font-sans">
      <Navbar page={page} navigate={navigate} user={user} switchAccount={switchAccount} />
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
              Demo only—no real money moves. Simulates sending your SeawolfEats balance to a linked account.
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
  user,
  switchAccount,
}: {
  page: PageId;
  navigate: (target: PageId, orderId?: string) => void;
  user: AppUser;
  switchAccount: () => void;
}) {
  const isBob = user.sbuEmail.trim().toLowerCase() === DEMO_BOB_EMAIL;
  const switchLabel = isBob ? "Switch to Alice" : "Switch to Bob";
  const navItems = [
    { id: "home" as const, label: "Home" },
    { id: "marketplace" as const, label: "Orders" },
    { id: "request" as const, label: "Post" },
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
                Seawolf<span className="text-sbu">Eats</span>
              </span>
            </button>
            <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:flex lg:gap-1">
              {navItems.map((item) => {
                const target = item.id;
                const isActive = page === target;
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
              onClick={switchAccount}
              className="rounded-full bg-purple-100 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-200 sm:px-3 sm:text-xs"
              title={switchLabel}
            >
              {switchLabel}
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
  claimOrder: (orderId: string) => void;
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
  claimOrder: (orderId: string) => void;
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
  onTake: (orderId: string) => void;
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
  }) => void;
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
    <div className="mx-auto max-w-3xl pb-10 pt-2">
      <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-card">
        <div className="relative border-b border-stone-100 bg-gradient-to-br from-sbu-50 via-white to-amber-50/50 px-5 py-7 sm:px-8 sm:py-9">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-sbu/[0.06]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-300/15"
            aria-hidden
          />
          <p className="relative text-xs font-semibold uppercase tracking-wider text-sbu">Campus marketplace</p>
          <h2 className="relative mt-1 font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Post a request
          </h2>
          <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
            A student with dining dollars claims your request, orders on Nutrislice, and you meet on campus. You pay{" "}
            <strong className="font-semibold text-gray-900">half the menu price</strong> — they get paid when you
            confirm pickup.
          </p>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200/90 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 shadow-sm">
              <span className="text-green-600" aria-hidden>
                ✓
              </span>
              50% off Nutrislice total
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
              Open to all dining locations
            </span>
          </div>
        </div>

        <div className="space-y-10 p-5 sm:p-8">
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sbu text-sm font-bold text-white shadow-sm">
                1
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="font-display text-lg font-bold text-gray-900">Where are you eating?</h3>
                <p className="text-xs text-gray-500">
                  Spots with a <span className="font-semibold text-sbu">Menu</span> tag include built-in Nutrislice
                  items; elsewhere, describe your order free-form.
                </p>
              </div>
            </div>
            <div
              className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${errors.location ? "rounded-2xl ring-2 ring-red-300/80 ring-offset-2 ring-offset-white" : ""}`}
            >
              {LOCATIONS.map((location) => {
                const hasMenu = MENU_LOCATION_IDS.has(location);
                const selected = form.location === location;
                return (
                  <button
                    key={location}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, location }));
                      setCart({});
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.location;
                        return next;
                      });
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                      selected
                        ? "border-sbu bg-sbu-50 text-sbu-dark shadow-sm ring-2 ring-sbu/20"
                        : "border-stone-200 bg-stone-50/70 text-gray-800 hover:border-stone-300 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    <span className="line-clamp-2 text-sm font-semibold leading-snug">{location}</span>
                    {hasMenu ? (
                      <span className="mt-2 inline-block rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sbu">
                        Menu
                      </span>
                    ) : (
                      <span className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        Custom
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.location ? <p className="text-sm font-medium text-red-600">{errors.location}</p> : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                  form.location ? "bg-sbu text-white" : "bg-stone-200 text-gray-500"
                }`}
              >
                2
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="font-display text-lg font-bold text-gray-900">What&apos;s on the order?</h3>
                <p className="text-xs text-gray-500">
                  {activeMenu
                    ? "Tap items to build your cart — totals match Nutrislice list prices."
                    : form.location
                      ? "Describe exactly what you want so a fulfiller can order it correctly."
                      : "Pick a location first."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-gradient-to-b from-stone-50/80 to-white p-4 sm:p-5">
              {activeMenu ? (
                <div className="space-y-8">
                  {Object.entries(
                    activeMenu.reduce((acc, item) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    }, {} as Record<string, MenuItem[]>)
                  ).map(([category, items]) => (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-display text-base font-bold text-gray-900">{category}</h4>
                        <span className="h-px flex-1 bg-gradient-to-r from-stone-200 to-transparent" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => {
                          const qty = cart[item.id] || 0;
                          const inCart = qty > 0;
                          return (
                            <div
                              key={item.id}
                              className={`flex flex-col justify-between rounded-2xl border bg-white p-3.5 transition-all ${
                                inCart
                                  ? "border-sbu/35 shadow-md ring-2 ring-sbu/15"
                                  : "border-stone-100 shadow-card hover:border-stone-200 hover:shadow-card-hover"
                              }`}
                            >
                              <div className="mb-3 min-h-[2.75rem]">
                                <p className="text-sm font-bold leading-snug text-gray-900">{item.name}</p>
                                <p className="mt-1 font-display text-lg font-bold text-sbu">${item.price.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center justify-between border-t border-stone-100 pt-2">
                                {qty > 0 ? (
                                  <div className="flex w-full items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => updateCart(item.id, -1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-lg font-medium text-gray-700 transition-colors hover:bg-stone-200"
                                      aria-label="Decrease quantity"
                                    >
                                      −
                                    </button>
                                    <span className="min-w-[2ch] text-center text-base font-bold tabular-nums text-gray-900">
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateCart(item.id, 1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-sbu text-lg font-medium text-white transition-colors hover:bg-sbu-dark"
                                      aria-label="Increase quantity"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => updateCart(item.id, 1)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 text-xs font-bold text-gray-800 transition-colors hover:border-sbu/30 hover:bg-sbu-50/50 hover:text-sbu-dark"
                                  >
                                    Add to order
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
                    <div className="space-y-2 border-t border-stone-200 pt-6">
                      <h4 className="font-display text-base font-bold text-gray-900">Customizations</h4>
                      <p className="text-xs text-gray-500">
                        Bread, cheese, veggies, sauces — helps your fulfiller build it right on Nutrislice.
                      </p>
                      <textarea
                        rows={3}
                        className="input-field resize-none bg-white"
                        placeholder="e.g. Italian Herbs & Cheese, Pepper Jack, toasted, lettuce, tomatoes, chipotle southwest"
                        value={form.customizations}
                        onChange={(event) => setForm((prev) => ({ ...prev, customizations: event.target.value }))}
                      />
                    </div>
                  )}

                  {errors.orderDetails ? (
                    <p className="text-sm font-medium text-red-600">{errors.orderDetails}</p>
                  ) : null}
                </div>
              ) : form.location ? (
                <div className="space-y-4">
                  <div>
                    <label className="label">Order details</label>
                    <textarea
                      rows={5}
                      className={`input-field resize-none bg-white ${errors.orderDetails ? "border-red-400" : ""}`}
                      placeholder="Be specific: entrée, sides, drink, size, and any dietary notes."
                      value={form.orderDetails}
                      onChange={(event) => setForm((prev) => ({ ...prev, orderDetails: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Full menu price</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`input-field bg-white pl-8 ${errors.originalPrice ? "border-red-400" : ""}`}
                        placeholder="0.00"
                        value={form.originalPrice}
                        onChange={(event) => setForm((prev) => ({ ...prev, originalPrice: event.target.value }))}
                      />
                    </div>
                  </div>
                  {errors.originalPrice ? (
                    <p className="text-sm font-medium text-red-600">{errors.originalPrice}</p>
                  ) : null}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">Choose a dining hall or venue in step 1.</p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                  form.location ? "bg-sbu text-white" : "bg-stone-200 text-gray-500"
                }`}
              >
                3
              </span>
              <div className="min-w-0 flex-1 pt-0.5 sm:flex sm:items-start sm:justify-between sm:gap-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900">Pickup window</h3>
                  <p className="text-xs text-gray-500">When you can meet on campus to grab the food.</p>
                </div>
                <div className="mt-3 w-full sm:mt-0 sm:max-w-[220px]">
                  <label className="label sr-only" htmlFor="post-pickup-time">
                    Time
                  </label>
                  <input
                    id="post-pickup-time"
                    type="time"
                    className={`input-field bg-white ${errors.pickupTime ? "border-red-400" : ""}`}
                    value={form.pickupTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, pickupTime: event.target.value }))}
                  />
                </div>
              </div>
            </div>
            {errors.pickupTime ? <p className="text-sm font-medium text-red-600">{errors.pickupTime}</p> : null}
          </section>

          {discountedPrice && effectiveOriginalPrice ? (
            <div className="overflow-hidden rounded-2xl border border-green-200/90 bg-gradient-to-br from-green-50 via-white to-emerald-50/40 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Your price</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Menu total</p>
                  <p className="font-display text-2xl font-bold text-gray-400 line-through decoration-stone-300">
                    ${parseFloat(effectiveOriginalPrice).toFixed(2)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium text-green-800">You pay (50%)</p>
                  <p className="font-display text-4xl font-black tracking-tight text-green-700">${discountedPrice}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-gray-600">
                The rest covers your fulfiller after you confirm pickup — same flow as the rest of the app.
              </p>
            </div>
          ) : null}

          {showPreview && discountedPrice ? (
            <div className="space-y-3 rounded-2xl border border-sbu/25 bg-gradient-to-br from-sbu-50 to-white p-5 shadow-sm">
              <p className="font-display text-base font-bold text-gray-900">Payment preview</p>
              <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 ring-1 ring-stone-200">
                    <span className="text-[9px] font-bold tracking-tight text-gray-500">VISA</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Demo card</p>
                    <p className="font-semibold text-gray-800">•••• 4242</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-sbu">Change</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600">
                Your card will be charged <span className="font-bold text-gray-900">${discountedPrice}</span> now.
                Funds release to the fulfiller when you mark the order received.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-row-reverse">
            <button type="button" onClick={() => void submit()} className="btn-primary sm:flex-1">
              {showPreview ? `Pay $${discountedPrice} & post` : "Proceed to payment"}
            </button>
            {showPreview ? (
              <button
                type="button"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[148px]"
                onClick={() => setShowPreview(false)}
              >
                Edit order
              </button>
            ) : null}
          </div>
        </div>
      </div>
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
  ) => void;
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

  const STATUS_STEPS = ["PENDING", "CLAIMED", "PLACED", "COMPLETED"];
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const progressPercent = Math.max(5, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100);

  return (
    <div className="space-y-5 pt-2">
      {isRequester ? (
        <div className="mb-8">
          <div className="relative mb-6 h-1.5 w-full rounded-full bg-stone-200">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-sbu transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {order.status === "PENDING" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
                <div
                  className="absolute inset-0 animate-ping rounded-full bg-sbu/20"
                  style={{ animationDuration: "2s" }}
                />
                <div
                  className="absolute inset-2 animate-ping rounded-full bg-sbu/30"
                  style={{ animationDuration: "2s", animationDelay: "0.5s" }}
                />
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-sbu text-white shadow-lg">
                  <svg className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900">Finding a match...</h3>
              <p className="mt-2 max-w-xs text-sm text-gray-500">
                Your request is live. We&apos;re looking for a student with dining dollars to claim your order.
              </p>
            </div>
          )}
          {order.status === "CLAIMED" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-50">
                <svg
                  className="h-10 w-10 animate-bounce text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900">Match found!</h3>
              <p className="mt-2 max-w-xs text-sm text-gray-500">
                <strong className="font-semibold text-gray-900">{order.fulfillerName || "Someone"}</strong> is
                placing your order on Nutrislice right now.
              </p>
            </div>
          )}
          {order.status === "PLACED" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900">Ready for pickup</h3>
              <p className="mt-2 max-w-xs text-sm text-gray-500">
                Your order has been placed. Head to the dining location during your pickup window.
              </p>
            </div>
          )}
          {order.status === "COMPLETED" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-stone-100">
                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900">Order complete</h3>
              <p className="mt-2 max-w-xs text-sm text-gray-500">Enjoy your food!</p>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold text-gray-900">{order.location}</h2>
          <p className="text-xs text-gray-400">{order.createdAt}</p>
        </div>
        {!isRequester && <StatusBadge status={order.status} size="lg" />}
      </div>

      <div className="card space-y-2 p-4">
        <p className="section-title">Order details</p>
        <p className="text-sm text-gray-800">&quot;{order.orderDetails}&quot;</p>
        <p className="text-sm text-gray-500">Pickup: {order.pickupTime}</p>
        {order.orderConfirmation && (
          <p className="text-sm text-sbu">Confirmation: {order.orderConfirmation}</p>
        )}
      </div>

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
  wallet: { grossEarned: number; withdrawn: number; available: number };
  onOpenWithdraw: () => void;
}) {
  const myOrders = orders.filter(
    (order) => order.requesterId === user._id || order.fulfillerId === user._id
  );
  const activeOrders = myOrders.filter((order) => order.status !== "COMPLETED");
  const historyOrders = myOrders.filter((order) => order.status === "COMPLETED");

  const getTier = (fulfillCount: number) => {
    if (fulfillCount >= 15) return { name: "Gold Tier", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "🏆" };
    if (fulfillCount >= 5) return { name: "Silver Tier", color: "bg-slate-100 text-slate-800 border-slate-200", icon: "🥈" };
    return { name: "Bronze Tier", color: "bg-orange-100 text-orange-800 border-orange-200", icon: "🥉" };
  };

  const tier = getTier(stats.fulfillJobsCount);

  return (
    <div className="space-y-6 pt-2 pb-10">
      <div className="space-y-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="card overflow-hidden">
            <div className="relative bg-gradient-to-br from-sbu to-sbu-dark p-6 text-white">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10"
                aria-hidden
              />
              <div className="relative flex items-center justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold shadow-sm backdrop-blur-sm">
                  {user.name.charAt(0)}
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm">
                    <span className="text-yellow-300">★</span> 5.0 <span className="opacity-80">({stats.fulfillJobsCount + stats.requesterCompletedCount})</span>
                  </div>
                </div>
              </div>
              <h2 className="relative mt-4 font-display text-2xl font-bold">{user.name}</h2>
              <p className="relative text-sm opacity-90">{user.sbuEmail}</p>
              <div className="relative mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <span className="rounded bg-black/20 px-2 py-1">{user.year}</span>
                <span className={`rounded border px-2 py-1 ${tier.color.replace('bg-', 'bg-white/90 text-').split(' ')[1]} border-white/20 bg-white/90 shadow-sm`}>
                  {tier.icon} {tier.name}
                </span>
              </div>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Trust & Safety</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">✓</span>
                    SBU Email Verified
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">✓</span>
                    Venmo Linked <span className="font-medium text-gray-900">({user.venmoHandle || "—"})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Card */}
          <div className="card overflow-hidden">
            <div className="border-b border-stone-100 bg-stone-50/50 p-5">
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Available Balance</p>
                  <p className="font-display text-4xl font-bold text-gray-900">${wallet.available.toFixed(2)}</p>
                </div>
                <div className="text-right pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total Earned</p>
                  <p className="text-sm font-bold text-green-600">${wallet.grossEarned.toFixed(2)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Withdrawn to bank (demo): ${wallet.withdrawn.toFixed(2)}
              </p>
            </div>
            <div className="p-5">
              <button
                type="button"
                className="btn-primary w-full"
                onClick={onOpenWithdraw}
              >
                Withdraw to Bank
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard value={`$${stats.totalSaved.toFixed(2)}`} label="Saved (post)" />
            <StatCard value={`${stats.fulfillJobsCount}`} label="Fulfill jobs" />
            <StatCard value={`${stats.requesterCompletedCount}`} label="Posts completed" />
            <div className="card p-4 flex flex-col justify-center items-center text-center bg-stone-50 border-dashed">
              <p className="text-xs font-medium text-gray-500">More stats coming soon</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {activeOrders.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-gray-900">In Progress</h3>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {activeOrders.length} Active
                </span>
              </div>
              <div className="space-y-3">
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

          {historyOrders.length > 0 ? (
            <div>
              <h3 className="mb-3 font-display text-xl font-bold text-gray-900">Recent History</h3>
              <div className="space-y-3">
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
          ) : (
            <div className="card flex flex-col items-center justify-center p-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                <span className="text-2xl opacity-50">🧾</span>
              </div>
              <h3 className="font-display text-lg font-bold text-gray-900">No history yet</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                When you complete requests or fulfill orders for others, they&apos;ll show up here.
              </p>
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
