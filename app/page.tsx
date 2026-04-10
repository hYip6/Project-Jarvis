"use client";

import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";

const USER_STORAGE_KEY = "hackathon-user-v2";
const POLL_MS = 20000;

const LOCATIONS = [
  "SAC Food Court",
  "Roth Café",
  "East Side Dining",
  "Jasmine",
  "West Side Dining",
  "Tabler Dining",
  "Chapin Dining",
] as const;

type Role = "requester" | "fulfiller";
type PageId = "home" | "marketplace" | "request" | "status" | "profile";
type OrderStatus = "PENDING" | "CLAIMED" | "PLACED" | "PICKED_UP" | "COMPLETED";

type AppUser = {
  _id: string;
  name: string;
  sbuEmail: string;
  venmoHandle: string;
  role: Role;
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
      return JSON.parse(saved) as AppUser;
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

  const [loginForm, setLoginForm] = useState({
    name: "",
    sbuEmail: "",
    venmoHandle: "",
    year: "",
    role: "fulfiller" as Role,
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
      role: loginForm.role,
      year: loginForm.year || "Student",
    };
    persistUser(nextUser);
  };

  const toggleRole = () => {
    if (!user) {
      return;
    }
    persistUser({ ...user, role: user.role === "requester" ? "fulfiller" : "requester" });
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
    const routeMap: Record<string, string> = {
      PLACED: "place",
      PICKED_UP: "picked-up",
      COMPLETED: "complete",
    };
    const route = routeMap[status];
    const body =
      status === "PLACED"
        ? { fulfillerId: user._id, proofValue: extra?.orderConfirmation ?? "" }
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
      return { totalEarned: 0, totalSaved: 0, completedOrders: 0, diningBalance: 0 };
    }
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
      completedOrders: completedAsFulfiller.length,
      diningBalance: 0,
    };
  }, [orders, user]);

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              SBU Trade Eats
            </p>
            <h1 className="font-display text-4xl font-bold text-gray-900">Connect your account</h1>
            <p className="mt-1 text-sm text-gray-500">
              Log in once to replace mock data with live marketplace orders.
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
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLoginForm((prev) => ({ ...prev, role: "requester" }))}
                className={`btn-secondary ${loginForm.role === "requester" ? "ring-2 ring-sbu/20" : ""}`}
              >
                Requester
              </button>
              <button
                type="button"
                onClick={() => setLoginForm((prev) => ({ ...prev, role: "fulfiller" }))}
                className={`btn-secondary ${loginForm.role === "fulfiller" ? "ring-2 ring-sbu/20" : ""}`}
              >
                Fulfiller
              </button>
            </div>
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
      <Navbar page={page} navigate={navigate} user={user} toggleRole={toggleRole} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 md:pb-12 md:pt-6 lg:px-8">
        {page === "home" && (
          <HomeView
            navigate={navigate}
            user={user}
            orders={orders}
            toggleRole={toggleRole}
            stats={stats}
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
        {page === "request" && <RequestOrderView user={user} addOrder={addOrder} />}
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
            toggleRole={toggleRole}
          />
        )}
        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}
      </main>
    </div>
  );
}

function Navbar({
  page,
  navigate,
  user,
  toggleRole,
}: {
  page: PageId;
  navigate: (target: PageId, orderId?: string) => void;
  user: AppUser;
  toggleRole: () => void;
}) {
  const isFulfiller = user.role === "fulfiller";
  const navItems = [
    { id: "home", label: "Home" },
    { id: "marketplace", label: "Browse" },
    {
      id: isFulfiller ? "marketplace" : "request",
      label: isFulfiller ? "Earn" : "Post",
      primary: true,
    },
    { id: "profile", label: "Profile" },
  ] as const;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-100 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate("home")}
              className="rounded focus-visible:ring-2 focus-visible:ring-sbu/30"
            >
              <span className="font-display text-xl font-bold tracking-tight text-gray-900">
                Trade<span className="text-sbu">Eats</span>
              </span>
            </button>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item, index) => {
                const target = item.id as PageId;
                const isActive = page === target;
                if (index === 2) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => navigate(target)}
                      className="ml-1 rounded-full bg-sbu px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sbu-dark"
                    >
                      {item.label}
                    </button>
                  );
                }
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(target)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
          <button
            onClick={toggleRole}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isFulfiller
                ? "border-sbu-100 bg-sbu-50 text-sbu-dark"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {isFulfiller ? "Fulfiller" : "Requester"} ↕
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-100 bg-white md:hidden">
        <div
          className="mx-auto flex h-16 max-w-md items-center justify-around px-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {navItems.map((item, index) => {
            const target = item.id as PageId;
            const isActive = page === target;
            if (index === 2) {
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(target)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sbu text-white"
                >
                  +
                </button>
              );
            }
            return (
              <button
                key={item.label}
                onClick={() => navigate(target)}
                className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${
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
  toggleRole,
  stats,
}: {
  navigate: (target: PageId, orderId?: string) => void;
  user: AppUser;
  orders: UiOrder[];
  toggleRole: () => void;
  stats: { totalEarned: number; totalSaved: number; completedOrders: number; diningBalance: number };
}) {
  const pendingOrders = orders.filter((order) => order.status === "PENDING");
  const avgPayout =
    pendingOrders.length > 0
      ? (
          pendingOrders.reduce((sum, order) => sum + order.discountedPrice, 0) /
          pendingOrders.length
        ).toFixed(2)
      : "0.00";
  const myActiveOrders = orders.filter(
    (order) =>
      (order.requesterId === user._id || order.fulfillerId === user._id) &&
      order.status !== "COMPLETED"
  );
  const isFulfiller = user.role === "fulfiller";

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-400">
            {user.year} · {user.sbuEmail.split("@")[1]}
          </p>
        </div>
        <button
          onClick={toggleRole}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            isFulfiller
              ? "border border-sbu-100 bg-sbu-50 text-sbu-dark"
              : "border border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {isFulfiller ? "Fulfiller" : "Requester"} ↕
        </button>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-5">
          <div className="card p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {isFulfiller ? "Dining dollars → real cash" : "Campus food, half price"}
            </p>
            <h1 className="mb-3 font-display text-[2rem] font-bold leading-tight text-gray-900">
              {isFulfiller ? (
                <>
                  Your balance is expiring.
                  <br />
                  <span className="text-sbu">Make it count.</span>
                </>
              ) : (
                <>
                  Skip the $10 burger.
                  <br />
                  <span className="text-sbu">Pay $5 instead.</span>
                </>
              )}
            </h1>
            <p className="mb-5 text-sm leading-relaxed text-gray-500">
              {isFulfiller
                ? "Browse requests. Order on Nutrislice, get paid via Venmo."
                : "Post what you want. A student with dining dollars places it. You pay half."}
            </p>
            <button
              onClick={() => navigate(isFulfiller ? "marketplace" : "request")}
              className="btn-primary"
            >
              {isFulfiller ? `Browse ${pendingOrders.length} open orders` : "Post a food request"}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {isFulfiller ? (
            <div className="space-y-3">
              <div
                className="card border-sbu-100 p-5"
                style={{ background: "linear-gradient(135deg, #FFF0F0 0%, #fff 70%)" }}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total earned
                </p>
                <p className="font-display text-4xl font-bold text-sbu">
                  ${stats.totalEarned.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  via Venmo · {stats.completedOrders} orders
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                  <p className="font-display text-2xl font-bold text-gray-900">
                    ${stats.diningBalance.toFixed(0)}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">Dining balance</p>
                </div>
                <div className="card p-4">
                  <p className="font-display text-2xl font-bold text-gray-900">
                    {pendingOrders.length}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">Open orders</p>
                  <p className="text-xs text-gray-400">${avgPayout} avg</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="card border-green-200 p-5"
                style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #fff 70%)" }}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total saved
                </p>
                <p className="font-display text-4xl font-bold text-green-700">
                  ${stats.totalSaved.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-gray-400">vs menu price</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                  <p className="font-display text-2xl font-bold text-gray-900">
                    {pendingOrders.length}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">Fulfillers ready</p>
                </div>
                <div className="card p-4">
                  <p className="font-display text-2xl font-bold text-gray-900">~50%</p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">You save</p>
                </div>
              </div>
            </div>
          )}

          {myActiveOrders.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-600">In progress</p>
              <div className="space-y-2">
                {myActiveOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => navigate("status", order.id)}
                    className="card flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-stone-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{order.location}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{order.orderDetails}</p>
                    </div>
                    <span className="ml-3 text-gray-300">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
          {visibleOrders.length} order{visibleOrders.length !== 1 ? "s" : ""} waiting
          {user.role === "fulfiller" && " · Claim, place on Nutrislice, collect via Venmo"}
        </p>
      </div>

      {user.role === "requester" && (
        <div className="card border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-sm font-semibold text-amber-800">You are in Requester mode</p>
          <p className="text-xs text-amber-600">
            Switch to Fulfiller mode to claim and earn from these orders.
          </p>
        </div>
      )}

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
  const isFulfiller = user.role === "fulfiller";
  const isMyOrder = order.requesterId === user._id || order.fulfillerId === user._id;

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
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold text-gray-900">
            ${order.discountedPrice.toFixed(2)}
          </span>
          <span className="text-sm text-gray-400 line-through">${order.originalPrice.toFixed(2)}</span>
        </div>
        {isFulfiller && isPending && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-xl bg-sbu px-3.5 py-2 text-sm font-semibold text-white"
          >
            Take it
          </button>
        )}
      </div>

      {confirming && (
        <div className="space-y-3 border-t border-stone-100 pt-2">
          <p className="text-xs text-gray-600">
            Order on Nutrislice with dining dollars, then collect payment via Venmo.
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
        <button onClick={() => onViewStatus(order.id)} className="w-full py-1 text-center text-sm font-semibold text-sbu">
          View status →
        </button>
      )}
    </div>
  );
}

function RequestOrderView({
  user,
  addOrder,
}: {
  user: AppUser;
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
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  if (user.role === "fulfiller") {
    return (
      <div className="pt-2">
        <div className="card p-6">
          <p className="mb-1 font-display text-2xl font-bold text-gray-900">Requester mode only</p>
          <p className="text-sm text-gray-500">
            Switch to Requester mode using the badge at top right.
          </p>
        </div>
      </div>
    );
  }

  const discountedPrice = form.originalPrice ? (parseFloat(form.originalPrice) / 2).toFixed(2) : null;

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.location) {
      nextErrors.location = "Pick a location";
    }
    if (!form.orderDetails.trim()) {
      nextErrors.orderDetails = "Describe your order";
    }
    if (
      !form.originalPrice ||
      Number.isNaN(parseFloat(form.originalPrice)) ||
      parseFloat(form.originalPrice) <= 0
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
      orderDetails: form.orderDetails,
      originalPrice: parseFloat(form.originalPrice),
      pickupTime: form.pickupTime,
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-5 pt-2">
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
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
          >
            <option value="">Choose a location…</option>
            {LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

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

        <div>
          <label className="label">Pickup window</label>
          <input
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
        <div className="card border-sbu/20 bg-sbu-50 p-4 text-sm">Review ready. Confirm to post.</div>
      )}
      <button onClick={() => void submit()} className="btn-primary">
        {showPreview ? "Confirm & post order" : "Preview order"}
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
            Browse marketplace
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

      {isFulfiller && order.status === "CLAIMED" && (
        <div className="card space-y-3 p-4">
          <p className="section-title">Mark as placed</p>
          <input
            className="input-field"
            placeholder="Nutrislice confirmation number"
            value={proofByOrderId[order.id] ?? ""}
            onChange={(event) =>
              setProofByOrderId((prev) => ({ ...prev, [order.id]: event.target.value }))
            }
          />
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
        <button className="btn-primary" onClick={() => void updateOrderStatus(order.id, "PICKED_UP")}>
          I picked it up ✓
        </button>
      )}

      {order.status === "PICKED_UP" && (
        <div className="card space-y-3 p-4">
          <a
            href={`https://venmo.com/${order.venmoHandle?.replace("@", "")}?txn=pay&amount=${order.discountedPrice}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-center no-underline"
          >
            Open Venmo
          </a>
          {isRequester && (
            <button className="btn-secondary" onClick={() => void updateOrderStatus(order.id, "COMPLETED")}>
              I sent the payment ✓
            </button>
          )}
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
  toggleRole,
}: {
  user: AppUser;
  orders: UiOrder[];
  stats: { totalEarned: number; totalSaved: number; completedOrders: number; diningBalance: number };
  navigate: (target: PageId, orderId?: string) => void;
  toggleRole: () => void;
}) {
  const myOrders = orders.filter(
    (order) => order.requesterId === user._id || order.fulfillerId === user._id
  );
  const activeOrders = myOrders.filter((order) => order.status !== "COMPLETED");
  const completedOrders = myOrders.filter((order) => order.status === "COMPLETED");
  const isFulfiller = user.role === "fulfiller";

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
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  isFulfiller ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {isFulfiller ? "Fulfiller" : "Requester"}
              </span>
            </div>
            <div className="mb-4 rounded-xl bg-stone-50 px-3 py-2.5">
              <span className="text-xs text-gray-400">Venmo</span>
              <p className="text-sm font-semibold text-gray-800">{user.venmoHandle}</p>
            </div>
            <button onClick={toggleRole} className="btn-secondary">
              Switch to {isFulfiller ? "Requester" : "Fulfiller"} mode
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isFulfiller ? (
              <>
                <StatCard value={`$${stats.totalEarned.toFixed(2)}`} label="Total earned" accent />
                <StatCard value={`${stats.completedOrders}`} label="Orders completed" />
              </>
            ) : (
              <>
                <StatCard value={`$${stats.totalSaved.toFixed(2)}`} label="Total saved" accent />
                <StatCard value={`${completedOrders.length}`} label="Orders completed" />
              </>
            )}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {activeOrders.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-600">In progress</p>
              <div className="space-y-2">
                {activeOrders.map((order) => (
                  <OrderRow key={order.id} order={order} onOpen={() => navigate("status", order.id)} />
                ))}
              </div>
            </div>
          )}

          {completedOrders.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-600">History</p>
              <div className="space-y-2">
                {completedOrders.map((order) => (
                  <OrderRow key={order.id} order={order} onOpen={() => navigate("status", order.id)} />
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

function OrderRow({ order, onOpen }: { order: UiOrder; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-stone-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{order.location}</p>
        <p className="truncate text-xs text-gray-400">{order.orderDetails}</p>
        <p className="mt-1 text-xs text-gray-400">{order.createdAt}</p>
      </div>
      <div className="shrink-0 text-right">
        <StatusBadge status={order.status} />
        <p className="mt-2 text-sm font-bold text-gray-900">${order.discountedPrice.toFixed(2)}</p>
      </div>
    </button>
  );
}
