"use client";

import { useEffect, useState } from "react";

export default function DemoStorePage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [itemCount, setItemCount] = useState(1);

  useEffect(() => {
    // Listen for custom Checkout click check
    const btn = document.getElementById("checkout-btn");
    if (!btn) return;

    function handleClick() {
      // In the broken store, data-checkout is missing
      const hasAttr = btn?.hasAttribute("data-checkout");
      if (hasAttr) {
        setOrderPlaced(true);
        setOrderError(false);
        setTimeout(() => setOrderPlaced(false), 5000);
      } else {
        setOrderError(true);
        setTimeout(() => setOrderError(false), 4000);
      }
    }

    btn.addEventListener("click", handleClick);
    return () => btn.removeEventListener("click", handleClick);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#fafaf9] text-zinc-900 font-sans selection:bg-orange-100"
      style={{
        // CSS variables used by store theme and patches
        ["--accent" as string]: "#f97316",
        ["--on-accent" as string]: "#ffffff",
      }}
    >
      {/* Snippet script tag: anti-flicker and PATCHWORK runtime agent */}
      <script
        src="/snippet.js"
        data-key="pw_live_c6a694dd6e73e913"
        async={false}
      />

      {/* Top bar announcement */}
      <div className="promo-banner bg-zinc-900 px-4 py-2 text-center text-xs font-medium text-zinc-200">
        <span>Nordic Fall Expedition Series — Free express delivery on orders over $150</span>
      </div>

      {/* Store Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-8">
          <span className="font-mono text-xl font-extrabold tracking-widest text-zinc-900">
            NORTHFOLD
          </span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 sm:flex">
            <span className="cursor-pointer text-zinc-900 font-semibold hover:text-black">Apparel</span>
            <span className="cursor-pointer hover:text-black">Equipment</span>
            <span className="cursor-pointer hover:text-black">Expeditions</span>
            <span className="cursor-pointer hover:text-black">Journal</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="bag-btn flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            <span>Shopping Bag</span>
            <span className="badge flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          </button>
        </div>
      </header>

      {/* Product Hero / Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
          <span>Home</span>
          <span>/</span>
          <span>Outerwear</span>
          <span>/</span>
          <span className="text-zinc-900 font-medium">Nordic Expedition Parka</span>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Product Image Showcase */}
          <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-sm p-8">
            <div className="flex flex-col items-center text-center">
              <span className="text-6xl mb-4">🧥</span>
              <span className="text-sm font-mono uppercase tracking-wider text-zinc-500">
                Weatherproof Shell 3L
              </span>
              <span className="mt-1 text-xs text-zinc-400">Tested in Kiruna, Arctic Circle</span>
            </div>
            <div className="absolute top-4 left-4 rounded-md bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 backdrop-blur">
              Northfold Lab
            </div>
          </div>

          {/* Product Purchasing Info */}
          <div className="flex flex-col justify-center">
            <div className="mb-2 inline-flex items-center gap-2">
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                Arctic Collection
              </span>
              <span className="text-xs text-emerald-600 font-medium">✓ Ready to ship</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Nordic Expedition Parka
            </h1>
            <p className="mt-2 text-2xl font-bold text-zinc-900">$280.00</p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Constructed from durable 3-layer breathable hardshell with taped seams, storm-proof hood,
              and thermal fleece lining. Engineered to withstand high arctic squalls and mountain terrain.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Size</span>
              <div className="flex gap-2">
                {["S", "M", "L", "XL"].map((sz) => (
                  <button
                    key={sz}
                    className={`h-10 w-12 rounded-lg border text-xs font-bold transition ${
                      sz === "L"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setItemCount((c) => c + 1);
                  setDrawerOpen(true);
                }}
                className="btn btn-primary flex-1 rounded-xl bg-zinc-900 py-3.5 text-center text-sm font-semibold text-white shadow transition hover:bg-zinc-800"
              >
                Add to Bag — $280
              </button>
              <button
                onClick={() => setDrawerOpen(true)}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Open Bag
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Bag Drawer (Slide-out) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="drawer relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900">Your Bag</h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {/* Bag Items */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex gap-4 border-b border-zinc-100 pb-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-3xl">
                  🧥
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Nordic Expedition Parka</h3>
                    <p className="text-xs text-zinc-500">Charcoal / Size L</p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Qty: {itemCount}</span>
                    <span className="text-sm font-bold text-zinc-900">${280 * itemCount}.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Totals & Checkout (The Target for the Hackathon Demo Patch) */}
            <div className="totals border-t border-zinc-200 bg-zinc-50 p-6">
              <div className="mb-4 flex flex-col gap-2 text-sm text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">${280 * itemCount}.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Shipping</span>
                  <span className="text-emerald-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
                  <span>Total</span>
                  <span>${280 * itemCount}.00</span>
                </div>
              </div>

              {/* The Checkout Button — starts with broken orange-on-orange text matching DEMO.md */}
              <button
                id="checkout-btn"
                className="btn btn-accent w-full rounded-xl py-4 text-center text-sm font-bold uppercase tracking-wider transition shadow-md hover:brightness-105 active:scale-[0.99]"
                style={{
                  backgroundColor: "#f97316",
                  color: "#f97316", // Intentionally broken: text same as background
                }}
              >
                Checkout
              </button>

              <p className="mt-2 text-center text-[11px] text-zinc-400">
                Encrypted 256-bit SSL Checkout
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Order feedback toasts */}
      {orderPlaced && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <span className="text-lg">✓</span>
          <div>
            <p className="font-bold">Order Placed Successfully!</p>
            <p className="text-xs font-normal text-emerald-100">
              The hotfixed Checkout button is working live in production.
            </p>
          </div>
        </div>
      )}

      {orderError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-zinc-900 px-5 py-4 text-sm font-medium text-white shadow-2xl">
          <span className="text-orange-400 text-lg">⚠</span>
          <div>
            <p className="font-semibold text-orange-200">Checkout Action Blocked</p>
            <p className="text-xs text-zinc-400">
              Missing <code className="text-orange-300">data-checkout</code> attribute on the button element.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
