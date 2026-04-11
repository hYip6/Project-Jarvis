"use client";

import { HelpCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const SEAWOLF_RED = "#990000";

export function HelpGuide() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-center drop-shadow-[0_3px_10px_rgba(0,0,0,0.18)] md:bottom-8 md:right-8">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="help-guide-panel"
          aria-label={open ? "Close help guide" : "Open how Seawolf Eats works"}
          onClick={() => setOpen((v) => !v)}
          className={`relative z-[1] flex h-11 w-11 items-center justify-center rounded-full border-2 bg-white transition-transform duration-200 hover:animate-none md:h-12 md:w-12 motion-reduce:animate-none ${
            open
              ? ""
              : "animate-help-fab hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
          }`}
          style={{
            borderColor: SEAWOLF_RED,
            color: SEAWOLF_RED,
          }}
        >
          <span
            className={`inline-flex origin-center will-change-transform ${
              open ? "" : "animate-help-icon motion-reduce:animate-none"
            }`}
            aria-hidden
          >
            <HelpCircle className="h-5 w-5 stroke-[2] md:h-[22px] md:w-[22px] md:stroke-[2.25]" />
          </span>
        </button>
        {/* Speech-bubble tail (mockup) — hidden while drawer open */}
        {!open ? (
          <div
            className="pointer-events-none relative z-0 -mt-1.5 h-0 w-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-white"
            aria-hidden
          />
        ) : null}
      </div>

      <div
        className={`fixed inset-0 z-50 bg-black/45 transition-opacity duration-300 md:bg-black/40 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={close}
      />

      <aside
        id="help-guide-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-guide-title"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(100vw,26rem)] flex-col border-l-2 bg-white transition-transform duration-300 ease-out sm:max-w-md ${
          open ? "pointer-events-auto translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        style={{ borderLeftColor: SEAWOLF_RED }}
      >
        <div className="relative shrink-0 border-b border-neutral-200 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md p-2 transition-colors hover:bg-neutral-100 sm:right-4 sm:top-4"
          >
            <X className="h-6 w-6 stroke-[2.5]" style={{ color: SEAWOLF_RED }} aria-hidden />
          </button>
          <h2
            id="help-guide-title"
            className="pr-12 font-sans text-2xl font-black uppercase leading-tight tracking-tight text-neutral-900 sm:text-3xl sm:leading-none"
          >
            How Seawolf Eats Works
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-10 sm:gap-12">
            <section className="flex flex-col gap-4">
              <h3
                className="border-b-2 pb-2 font-sans text-lg font-black text-neutral-900 sm:text-xl"
                style={{ borderBottomColor: SEAWOLF_RED }}
              >
                I Need Food (Requesters)
              </h3>
              <ol className="grid gap-4">
                <li className="flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-black text-white sm:h-10 sm:w-10 sm:text-base"
                    style={{ backgroundColor: SEAWOLF_RED }}
                  >
                    1
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-800 sm:text-base">
                    Post your order from Nutrislice.
                  </p>
                </li>
                <li className="flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-black text-white sm:h-10 sm:w-10 sm:text-base"
                    style={{ backgroundColor: SEAWOLF_RED }}
                  >
                    2
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-800 sm:text-base">
                    Set your discounted cash price (50% off).
                  </p>
                </li>
                <li className="flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-black text-white sm:h-10 sm:w-10 sm:text-base"
                    style={{ backgroundColor: SEAWOLF_RED }}
                  >
                    3
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-800 sm:text-base">
                    Pick up your food and Venmo the fulfiller.
                  </p>
                </li>
              </ol>
            </section>

            <section className="flex flex-col gap-4">
              <h3
                className="border-b-2 pb-2 font-sans text-lg font-black text-neutral-900 sm:text-xl"
                style={{ borderBottomColor: SEAWOLF_RED }}
              >
                I Have Dining Dollars (Fulfillers)
              </h3>
              <ol className="grid gap-4">
                <li className="flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-black text-white sm:h-10 sm:w-10 sm:text-base"
                    style={{ backgroundColor: SEAWOLF_RED }}
                  >
                    1
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-800 sm:text-base">
                    Claim an active order on the feed.
                  </p>
                </li>
                <li className="flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-black text-white sm:h-10 sm:w-10 sm:text-base"
                    style={{ backgroundColor: SEAWOLF_RED }}
                  >
                    2
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-800 sm:text-base">
                    Buy it on the Nutrislice app using your dining balance.
                  </p>
                </li>
                <li className="flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-black text-white sm:h-10 sm:w-10 sm:text-base"
                    style={{ backgroundColor: SEAWOLF_RED }}
                  >
                    3
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-800 sm:text-base">
                    Get paid real cash via Venmo upon handoff.
                  </p>
                </li>
              </ol>
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}
