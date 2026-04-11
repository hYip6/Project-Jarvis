"use client";

import { useMemo, useState } from "react";
import {
  ORDER_LOCATIONS,
  MENU_LOCATION_IDS,
  SAVOR_MENU,
  SMASH_MENU,
  POPEYES_MENU,
  SUBWAY_MENU,
  type MenuItem,
} from "@/lib/nutrislice-menus";

export type RequestOrderPayload = {
  location: string;
  orderDetails: string;
  originalPrice: number;
  pickupTime: string;
};

export function RequestOrderForm({
  onSubmit,
}: {
  onSubmit: (order: RequestOrderPayload) => void;
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
  const activeMenu = isSavor
    ? SAVOR_MENU
    : isSmash
      ? SMASH_MENU
      : isPopeyes
        ? POPEYES_MENU
        : isSubway
          ? SUBWAY_MENU
          : null;

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
    ? derivedCart.orderDetails +
      (form.customizations.trim() ? `\n\nCustomizations:\n${form.customizations.trim()}` : "")
    : form.orderDetails;

  const updateCart = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const discountedPrice = effectiveOriginalPrice
    ? (parseFloat(effectiveOriginalPrice) / 2).toFixed(2)
    : null;

  const submit = () => {
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
    onSubmit({
      location: form.location,
      orderDetails: effectiveOrderDetails,
      originalPrice: parseFloat(effectiveOriginalPrice),
      pickupTime: form.pickupTime,
    });
  };

  return (
    <div className="mx-auto max-w-3xl pb-6 pt-1">
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
              {ORDER_LOCATIONS.map((location) => {
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
                    activeMenu.reduce(
                      (acc, item) => {
                        if (!acc[item.category]) acc[item.category] = [];
                        acc[item.category]!.push(item);
                        return acc;
                      },
                      {} as Record<string, MenuItem[]>
                    )
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
