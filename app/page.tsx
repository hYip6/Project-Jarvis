"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OrderStatus } from "@/lib/types";
import {
  USER_STORAGE_KEY,
  readStoredPersona,
  BOB_USER,
  ALICE_USER,
  DEMO_BOB_ID,
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
import { RequestOrderForm } from "./components/RequestOrderForm";
import { WaterBackground } from "./components/WaterBackground";

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

function pickupTimeToWindow(time: string): string {
  const t = time.trim();
  if (!t) return "Time TBD";
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return `Pickup ${t}`;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return `Pickup ${t}`;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return `Meet around ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

function formatVenueLabel(location: string): string {
  const t = location.trim();
  if (t.toLowerCase() === "jasmine") {
    return "JASMINE FOOD COURT";
  }
  return t.toUpperCase();
}

function formatMoney(n: number): string {
  return n.toFixed(2);
}

type MarketplaceOrderCardProps = {
  locationLabel: string;
  itemTitle: string;
  retail: number;
  cashPrice: number;
  action: ReactNode;
};

function MarketplaceOrderCard({
  locationLabel,
  itemTitle,
  retail,
  cashPrice,
  action,
}: MarketplaceOrderCardProps) {
  return (
    <article className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:bg-white/10">
      <p className="font-display text-xs text-[#0EA5E9] font-bold tracking-widest">
        {locationLabel}
      </p>
      <h3 className="font-sans text-xl font-semibold text-[#F0F9FF] mt-1">{itemTitle}</h3>
      <div className="mt-3 flex flex-row items-end justify-between gap-3">
        <p className="text-sm text-cyan-100/50 line-through font-sans">
          Retail: ${formatMoney(retail)}
        </p>
        <p className="font-display text-2xl font-black text-[#0EA5E9] shrink-0">
          Cash Price: ${formatMoney(cashPrice)}
        </p>
      </div>
      <div className="mt-4">{action}</div>
    </article>
  );
}

export default function Home() {
  const [user, setUser] = useState<AppUser>(BOB_USER);
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [postOpen, setPostOpen] = useState(false);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [proofDraft, setProofDraft] = useState<Record<string, string>>({});
  const [withdrawnTotal, setWithdrawnTotal] = useState(0);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawModalSession, setWithdrawModalSession] = useState(0);

  const localOrdersRef = useRef(localOrders);
  localOrdersRef.current = localOrders;

  useEffect(() => {
    setUser(readStoredPersona());
  }, []);

  useEffect(() => {
    setLocalOrders(loadLocalOrders());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCAL_ORDERS_STORAGE_KEY || e.newValue == null) return;
      try {
        const next = JSON.parse(e.newValue) as unknown;
        if (Array.isArray(next)) setLocalOrders(next as LocalOrder[]);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setWithdrawnTotal(readWithdrawnTotal(user._id));
  }, [user._id]);

  const visible = useMemo(
    () => visibleOrdersForUser(localOrders, user._id),
    [localOrders, user._id]
  );

  const pendingFeed = useMemo(
    () => visible.filter((o) => o.status === "PENDING"),
    [visible]
  );

  const activeDeals = useMemo(
    () =>
      visible.filter(
        (o) =>
          o.status !== "PENDING" &&
          o.status !== "COMPLETED" &&
          (o.requesterId === user._id || o.fulfillerId === user._id)
      ),
    [visible, user._id]
  );

  const stats = useMemo(() => {
    const claimedAsFulfiller = visible.filter(
      (order) => order.fulfillerId === user._id && order.status !== "PENDING"
    );
    const completedAsFulfiller = visible.filter(
      (order) => order.fulfillerId === user._id && order.status === "COMPLETED"
    );
    const completedAsRequester = visible.filter(
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
  }, [visible, user._id]);

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
    [user._id, stats.totalEarned, withdrawnTotal]
  );

  const openWithdrawModal = useCallback(() => {
    setWithdrawModalSession((s) => s + 1);
    setWithdrawModalOpen(true);
  }, []);

  const demoSwitchUser = useCallback(() => {
    setUser((prev) => {
      const next = prev._id === DEMO_BOB_ID ? ALICE_USER : BOB_USER;
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* demo */
      }
      return next;
    });
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      /* demo */
    }
    setUser(readStoredPersona());
    setError("");
  }, []);

  const refreshOrders = useCallback((next: LocalOrder[]) => {
    saveLocalOrders(next);
    setLocalOrders(next);
  }, []);

  const handleClaim = useCallback(
    (orderId: string) => {
      setError("");
      setClaimingId(orderId);
      const result = claimLocalOrder(localOrdersRef.current, orderId, user._id);
      if ("error" in result) {
        setError(result.error);
        setClaimingId(null);
        return;
      }
      refreshOrders(result.orders);
      setClaimingId(null);
    },
    [user._id, refreshOrders]
  );

  const handleCreate = useCallback(
    (input: {
      location: string;
      orderDetails: string;
      originalPrice: number;
      pickupWindow: string;
    }) => {
      setError("");
      const result = createLocalOrder(localOrdersRef.current, {
        requesterId: user._id,
        ...input,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      refreshOrders(result.orders);
      setPostOpen(false);
    },
    [user._id, refreshOrders]
  );

  const handleMarkPlaced = useCallback(
    (orderId: string) => {
      const proof = (proofDraft[orderId] ?? "").trim();
      setError("");
      const result = markPlacedLocalOrder(localOrdersRef.current, orderId, user._id, proof);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      refreshOrders(result.orders);
    },
    [user._id, proofDraft, refreshOrders]
  );

  const handleMarkPickedUp = useCallback(
    (orderId: string) => {
      setError("");
      const result = markPickedUpLocalOrder(localOrdersRef.current, orderId, user._id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      refreshOrders(result.orders);
    },
    [user._id, refreshOrders]
  );

  const handleComplete = useCallback(
    (orderId: string) => {
      setError("");
      const result = completeLocalOrder(localOrdersRef.current, orderId, user._id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      refreshOrders(result.orders);
    },
    [user._id, refreshOrders]
  );

  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden font-sans text-[#F0F9FF]">
      <WaterBackground />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[min(85vh,640px)] w-[min(140vw,960px)] -translate-x-1/2 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 0%, rgb(14 165 233), transparent 62%)",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-4 py-5 sm:px-8">
          <span className="font-display text-3xl font-black tracking-tight text-[#0EA5E9]">
            SEAWOLF EATS
          </span>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={demoSwitchUser}
              className="rounded-full bg-purple-100 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-200 sm:px-3 sm:text-xs"
              title={`Demo: Switch to ${user._id === DEMO_BOB_ID ? "Alice" : "Bob"}`}
            >
              Switch to {user._id === DEMO_BOB_ID ? "Alice" : "Bob"}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-500 hover:bg-stone-100 hover:text-gray-900 sm:px-3 sm:text-xs"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-2 sm:px-8">
          {error ? (
            <p
              className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-sans text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <section className="mx-auto mt-10 max-w-4xl">
            <h2 className="font-display text-center text-lg font-black uppercase tracking-wider text-[#F0F9FF]">
              Your wallet
            </h2>
            <p className="mt-1 text-center font-sans text-xs text-cyan-100/60">
              Money you earn fulfilling orders (Venmo in real life) · Savings when you post requests · Demo bank
              withdrawal
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#0EA5E9]/30 bg-white/5 p-5 shadow-xl backdrop-blur-md">
                <p className="font-display text-xs font-bold uppercase tracking-widest text-[#0EA5E9]">
                  Wallet (fulfilling)
                </p>
                <p className="mt-2 font-display text-3xl font-black text-[#F0F9FF]">
                  ${walletAvailable.toFixed(2)}
                </p>
                <p className="mt-1 font-sans text-xs text-cyan-100/60">
                  Available · Gross ${stats.totalEarned.toFixed(2)} · Withdrawn (demo) $
                  {withdrawnTotal.toFixed(2)}
                </p>
                <p className="mt-1 font-sans text-xs text-cyan-100/50">
                  {stats.fulfillJobsCount} active / completed fulfill jobs
                </p>
                <button
                  type="button"
                  onClick={openWithdrawModal}
                  className="mt-4 w-full rounded-xl border border-[#0EA5E9]/50 bg-white/10 py-2.5 font-sans text-sm font-semibold text-[#F0F9FF] transition-colors hover:bg-[#0EA5E9]/30"
                >
                  Withdraw to bank
                </button>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 shadow-xl backdrop-blur-md">
                <p className="font-display text-xs font-bold uppercase tracking-widest text-emerald-300">
                  Saved (posting)
                </p>
                <p className="mt-2 font-display text-3xl font-black text-emerald-200">
                  ${stats.totalSaved.toFixed(2)}
                </p>
                <p className="mt-1 font-sans text-xs text-cyan-100/60">
                  {stats.requesterCompletedCount} completed meals vs. full Nutrislice price
                </p>
                <p className="mt-3 font-sans text-xs leading-relaxed text-cyan-100/50">
                  When you post a request and complete pickup, you paid half the menu total — that difference is your
                  savings here.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-3xl font-black uppercase tracking-wider text-[#F0F9FF] sm:text-4xl md:text-5xl">
              The campus food exchange
            </h1>
            <p className="mx-auto mt-3 max-w-xl font-sans text-sm text-cyan-100/60 sm:text-base">
              Live dining-dollar requests across SBU. Claim a card, place the order, meet on campus.
            </p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setPostOpen(true);
              }}
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] px-8 py-3.5 font-sans text-base font-bold text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] transition hover:brightness-110"
            >
              Post a Food Request
            </button>
          </section>

          <section className="mt-16">
            <h2 className="font-display text-center text-2xl font-black uppercase tracking-wider text-[#F0F9FF] sm:text-3xl">
              Live Marketplace
            </h2>
            <p className="mt-2 text-center font-sans text-sm text-cyan-100/60">
              Active food requests
            </p>

            {pendingFeed.length === 0 ? (
              <p className="mt-10 text-center font-sans text-sm text-cyan-100/60">
                No open requests right now. Be the first to post one.
              </p>
            ) : (
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pendingFeed.map((order) => {
                  const own = order.requesterId === user._id;
                  return (
                    <MarketplaceOrderCard
                      key={order._id}
                      locationLabel={formatVenueLabel(order.location)}
                      itemTitle={order.orderDetails}
                      retail={order.originalPrice}
                      cashPrice={order.discountedPrice}
                      action={
                        own ? (
                          <p className="font-sans text-center text-sm text-cyan-100/60">
                            Your request — another student can claim this.
                          </p>
                        ) : (
                          <button
                            type="button"
                            disabled={claimingId === order._id}
                            onClick={() => handleClaim(order._id)}
                            className="w-full rounded-lg border border-[#0EA5E9]/50 bg-white/10 py-2 font-sans font-semibold text-white transition-colors hover:bg-[#0EA5E9] disabled:opacity-50"
                          >
                            {claimingId === order._id ? "Claiming…" : "Claim Order"}
                          </button>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>

          {activeDeals.length > 0 ? (
            <section className="mt-16">
              <h2 className="font-display text-xl font-black uppercase tracking-wider text-[#F0F9FF]">
                Your active exchanges
              </h2>
              <p className="mt-1 font-sans text-sm text-cyan-100/60">
                Fulfill steps or confirm pickup for orders you&apos;re involved in.
              </p>
              <ul className="mt-6 space-y-4">
                {activeDeals.map((order) => (
                  <ActiveDealRow
                    key={order._id}
                    order={order}
                    userId={user._id}
                    proofValue={proofDraft[order._id] ?? order.proofValue}
                    onProofChange={(v) =>
                      setProofDraft((prev) => ({ ...prev, [order._id]: v }))
                    }
                    onMarkPlaced={() => handleMarkPlaced(order._id)}
                    onMarkPickedUp={() => handleMarkPickedUp(order._id)}
                    onComplete={() => handleComplete(order._id)}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </main>
      </div>

      {postOpen ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/55 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-order-sheet-title"
        >
          <h2 id="post-order-sheet-title" className="sr-only">
            Post a food request
          </h2>
          <div className="mx-auto flex w-full max-w-3xl shrink-0 justify-end pb-2">
            <button
              type="button"
              onClick={() => setPostOpen(false)}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 font-sans text-sm font-semibold text-[#F0F9FF] hover:bg-white/20"
            >
              Close
            </button>
          </div>
          <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto overscroll-contain pb-4">
            <RequestOrderForm
              onSubmit={(order) =>
                handleCreate({
                  location: order.location,
                  orderDetails: order.orderDetails,
                  originalPrice: order.originalPrice,
                  pickupWindow: pickupTimeToWindow(order.pickupTime),
                })
              }
            />
          </div>
        </div>
      ) : null}

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

  useEffect(() => {
    if (!open) return;
    const c = Math.round(available * 100) / 100;
    setAmountStr(c > 0 ? c.toFixed(2) : "");
    setStep(1);
  }, [open, available]);

  if (!open) {
    return null;
  }

  const cap = Math.round(available * 100) / 100;
  const amount = parseFloat(amountStr);
  const valid = !Number.isNaN(amount) && amount > 0 && amount <= cap + 0.005;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 p-4"
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
              Nothing available to withdraw yet. Fulfill orders and wait for requesters to confirm payment so your
              earnings show up here.
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

function statusLabel(s: OrderStatus): string {
  switch (s) {
    case "CLAIMED":
      return "Claimed";
    case "PLACED":
      return "Placed";
    case "PICKED_UP":
      return "Picked up";
    default:
      return s;
  }
}

function ActiveDealRow({
  order,
  userId,
  proofValue,
  onProofChange,
  onMarkPlaced,
  onMarkPickedUp,
  onComplete,
}: {
  order: LocalOrder;
  userId: string;
  proofValue: string;
  onProofChange: (v: string) => void;
  onMarkPlaced: () => void;
  onMarkPickedUp: () => void;
  onComplete: () => void;
}) {
  const isFulfiller = order.fulfillerId === userId;
  const isRequester = order.requesterId === userId;

  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-[#0EA5E9]">
          {formatVenueLabel(order.location)}
        </p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-sans text-xs text-cyan-100/60">
          {statusLabel(order.status)}
        </span>
      </div>
      <p className="mt-1 font-sans text-sm text-[#F0F9FF]">{order.orderDetails}</p>
      <p className="mt-1 font-sans text-xs text-cyan-100/60">
        Pickup: {order.pickupWindow}
      </p>

      {order.status === "CLAIMED" && isFulfiller ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            type="text"
            placeholder="Order # / proof"
            value={proofValue}
            onChange={(e) => onProofChange(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-[#081B29]/60 px-3 py-2 font-sans text-sm text-[#F0F9FF] outline-none focus:ring-2 focus:ring-[#0EA5E9]/40"
          />
          <button
            type="button"
            onClick={onMarkPlaced}
            className="rounded-lg border border-[#0EA5E9]/50 bg-white/10 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-[#0EA5E9]"
          >
            Mark placed
          </button>
        </div>
      ) : null}

      {order.status === "PLACED" && isRequester ? (
        <button
          type="button"
          onClick={onMarkPickedUp}
          className="mt-3 rounded-lg border border-[#0EA5E9]/50 bg-white/10 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-[#0EA5E9]"
        >
          Confirm picked up
        </button>
      ) : null}

      {order.status === "PICKED_UP" && isRequester ? (
        <button
          type="button"
          onClick={onComplete}
          className="mt-3 rounded-lg border border-[#0EA5E9]/50 bg-white/10 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-[#0EA5E9]"
        >
          Confirm payment sent
        </button>
      ) : null}
    </li>
  );
}
