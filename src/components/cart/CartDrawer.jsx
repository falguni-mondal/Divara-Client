"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { X, Plus, Minus, Tag, Loader2, Trash2 } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useToast } from "@/context/ToastContext";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { formatINR } from "@/data/catalogData";
import { getApiErrorMessage } from "@/lib/api";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

const CART_DEBOUNCE_MS = 350;

export default function CartDrawer() {
  const {
    user,
    bag,
    bagCount,
    isBagOpen,
    setIsBagOpen,
    setItemQuantity,
    bagSubtotal,
    appliedCoupon,
    discountInr,
    applyCoupon,
    removeCoupon,
    bagError,
    setBagError,
    syncBagAndAutoCoupon,
  } = useShop();

  const toast = useToast();
  const { stopScroll, startScroll } = useSmoothScroll();

  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);

  // Stores either a number or "" (while user temporarily clears input to type a new digit)
  const [draftQtyMap, setDraftQtyMap] = useState({});
  const [syncingKeys, setSyncingKeys] = useState({});

  const timersRef = useRef(new Map());
  const abortsRef = useRef(new Map());

  useEffect(() => {
    if (isBagOpen && user) {
      syncBagAndAutoCoupon();
    }
  }, [isBagOpen, user, syncBagAndAutoCoupon]);

  useEffect(() => {
    const timers = timersRef.current;
    const aborts = abortsRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      aborts.forEach((c) => c.abort());
    };
  }, []);

  useEffect(() => {
    if (isBagOpen) {
      stopScroll();
    } else {
      startScroll();
    }
    return () => startScroll();
  }, [isBagOpen, stopScroll, startScroll]);

  useEffect(() => {
    if (!isBagOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsBagOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBagOpen, setIsBagOpen]);

  const scheduleCartSync = useCallback(
    (item, targetQty) => {
      const key = `${item.id}::${item.size}`;

      if (timersRef.current.has(key)) {
        clearTimeout(timersRef.current.get(key));
      }
      if (abortsRef.current.has(key)) {
        abortsRef.current.get(key).abort();
      }

      setDraftQtyMap((prev) => ({ ...prev, [key]: targetQty }));
      setSyncingKeys((prev) => ({ ...prev, [key]: true }));

      const delay = targetQty <= 0 ? 0 : CART_DEBOUNCE_MS;
      const timer = setTimeout(async () => {
        const controller = new AbortController();
        abortsRef.current.set(key, controller);
        try {
          await setItemQuantity(item.id, item.size, targetQty, controller.signal);
        } finally {
          if (!controller.signal.aborted) {
            setDraftQtyMap((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
            setSyncingKeys((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }
        }
      }, delay);

      timersRef.current.set(key, timer);
    },
    [setItemQuantity]
  );

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Invalid coupon code"));
    } finally {
      setApplying(false);
    }
  };

  const hasStockBlocker = bag.some(
    (item) =>
      item.isActive === false ||
      (typeof item.availableStock === "number" &&
        (item.availableStock <= 0 || item.quantity > item.availableStock))
  );

  const netSubtotal = Math.max(0, bagSubtotal - discountInr);

  return (
    <>
      <div
        onClick={() => setIsBagOpen(false)}
        className={`fixed inset-0 z-[1000] bg-black/50 transition-opacity duration-500 ${
          isBagOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        data-lenis-prevent
        aria-label="Shopping Bag"
        className={`fixed top-0 right-0 z-[1001] h-dvh w-full max-w-sm bg-[#ffffff] text-[#1b1717] border-l border-[#1b1717]/15 flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          isBagOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b1717]/15">
          <h2 className="heading-serif uppercase text-base tracking-wider font-normal">
            Shopping Bag ({bagCount})
          </h2>
          <button
            type="button"
            onClick={() => setIsBagOpen(false)}
            aria-label="Close Bag"
            className="p-1.5 hover:text-[#5d100a] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {bagError && (
          <div className="px-5 py-2.5 bg-[#5d100a]/10 text-[#5d100a] text-[11px] font-medium border-b border-[#5d100a]/20 flex items-center justify-between gap-2">
            <span>{bagError}</span>
            <button
              type="button"
              onClick={() => setBagError("")}
              aria-label="Dismiss bag error"
              className="p-0.5 hover:text-[#1b1717] cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 divide-y divide-[#1b1717]/10">
          {!user ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <h3 className="heading-serif uppercase text-base tracking-wider">
                Sign In to Access Your Bag
              </h3>
              <p className="mt-2 text-xs text-[#1b1717]/65 max-w-[240px]">
                Your curated garments and exclusive member discounts are saved directly to your DIVARA account.
              </p>
              <Link
                href="/account"
                onClick={() => setIsBagOpen(false)}
                className="mt-5 inline-block bg-[#1b1717] hover:bg-[#5d100a] text-[#ffffff] px-6 py-2.5 text-xs uppercase font-semibold rounded-[2px] transition-colors"
              >
                Sign In / Create Account
              </Link>
            </div>
          ) : bag.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <h3 className="heading-serif uppercase text-base tracking-wider">
                Your Bag is Empty
              </h3>
              <Link
                href="/collections"
                onClick={() => setIsBagOpen(false)}
                className="mt-5 inline-block bg-[#5d100a] text-[#ffffff] px-6 py-2.5 text-xs uppercase font-semibold rounded-[2px]"
              >
                Shop Collection
              </Link>
            </div>
          ) : (
            bag.map((item) => {
              const key = `${item.id}::${item.size}`;
              const hasDraft = Object.prototype.hasOwnProperty.call(draftQtyMap, key);
              const inputDisplay = hasDraft ? draftQtyMap[key] : item.quantity;
              const numericQty =
                typeof inputDisplay === "number" ? inputDisplay : item.quantity;
              const isSyncing = Boolean(syncingKeys[key]);
              const maxAllowed =
                typeof item.maxOrderable === "number"
                  ? item.maxOrderable
                  : typeof item.availableStock === "number"
                  ? Math.min(10, item.availableStock)
                  : 10;
              const isSoldOut = item.isActive === false || maxAllowed <= 0;
              const canIncrement = !isSoldOut && numericQty < maxAllowed;

              return (
                <div key={key} className="py-4 first:pt-0 flex gap-3.5">
                  <Link
                    href={`/shop/${item.slug}`}
                    onClick={() => setIsBagOpen(false)}
                    className="h-24 w-[72px] shrink-0 overflow-hidden bg-[#1b1717]/5"
                  >
                    <ResponsiveImage
                      src={item.image}
                      alt={item.title}
                      preset="thumb"
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/shop/${item.slug}`}
                          onClick={() => setIsBagOpen(false)}
                          className="text-xs font-semibold uppercase tracking-wide hover:text-[#5d100a] transition-colors block truncate"
                        >
                          {item.title}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-[#1b1717]/60">
                          Size: {item.size}
                          {typeof item.availableStock === "number" && item.availableStock > 0 && (
                            <span className="ml-1.5 text-[10px] text-[#1b1717]/45">
                              • {item.availableStock} left
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => scheduleCartSync(item, 0)}
                        aria-label={`Remove ${item.title}`}
                        className="p-1 text-[#1b1717]/40 hover:text-[#5d100a] transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {item.stockWarning && (
                      <p className="mt-1 text-[10px] font-medium text-[#5d100a]">
                        {item.stockWarning}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center border border-[#1b1717]/25">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.title}`}
                          onClick={() => scheduleCartSync(item, Math.max(0, numericQty - 1))}
                          className="p-1.5 hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Quantity for ${item.title}`}
                          value={inputDisplay}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^\d]/g, "");
                            if (!digits) {
                              setDraftQtyMap((prev) => ({ ...prev, [key]: "" }));
                              return;
                            }
                            const nextVal = Math.max(1, Math.min(99, parseInt(digits, 10)));
                            scheduleCartSync(item, nextVal);
                          }}
                          onBlur={() => {
                            if (draftQtyMap[key] === "") {
                              setDraftQtyMap((prev) => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                            }
                          }}
                          className="w-8 text-center text-xs bg-transparent outline-none"
                        />

                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.title}`}
                          disabled={!canIncrement}
                          title={
                            !canIncrement
                              ? "Maximum available stock reached"
                              : "Increase quantity"
                          }
                          onClick={() => {
                            if (!canIncrement) return;
                            scheduleCartSync(item, Math.min(maxAllowed, numericQty + 1));
                          }}
                          className="p-1.5 hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#1b1717]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSyncing && <Loader2 className="w-3 h-3 animate-spin text-[#5d100a]" />}
                        <span className="text-xs font-semibold">
                          {formatINR(item.price * numericQty)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {user && bag.length > 0 && (
          <div className="border-t border-[#1b1717]/15 px-5 py-4 bg-[#ffffff] space-y-3">
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-[#5d100a]/5 border border-[#5d100a]/25 px-3 py-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-[#5d100a] font-semibold">
                  <Tag className="w-3.5 h-3.5" />
                  <span>
                    {appliedCoupon.code} ({appliedCoupon.applyMode === "AUTO" ? "Auto" : "Applied"})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-[10px] uppercase underline text-[#1b1717]/70 hover:text-[#5d100a] cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="PROMO CODE"
                  className="flex-1 border border-[#1b1717]/25 px-3 py-2 text-xs uppercase tracking-wider outline-none focus:border-[#5d100a]"
                />
                <button
                  type="submit"
                  disabled={applying}
                  className="px-4 py-2 bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest font-semibold hover:bg-[#5d100a] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {applying ? "..." : "Apply"}
                </button>
              </form>
            )}

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between text-[#1b1717]/70">
                <span>Subtotal (Incl. GST)</span>
                <span>{formatINR(bagSubtotal)}</span>
              </div>
              {discountInr > 0 && (
                <div className="flex items-center justify-between text-[#5d100a] font-medium">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-{formatINR(discountInr)}</span>
                </div>
              )}
              <div className="flex items-center justify-between uppercase font-semibold pt-1 border-t border-[#1b1717]/10">
                <span>Estimated Total</span>
                <span>{formatINR(netSubtotal)}</span>
              </div>
            </div>

            {hasStockBlocker ? (
              <div className="w-full py-2.5 px-3 bg-[#5d100a]/10 border border-[#5d100a]/25 text-center text-[11px] text-[#5d100a] font-medium">
                Please adjust or remove out-of-stock items before checkout.
              </div>
            ) : (
              <Link
                href="/checkout"
                onClick={() => setIsBagOpen(false)}
                className="w-full h-[2.8rem] flex items-center justify-center bg-[#5d100a] text-[#ffffff] text-xs uppercase font-semibold rounded-[2px] hover:bg-[#1b1717] transition-colors"
              >
                Proceed to Checkout
              </Link>
            )}
          </div>
        )}
      </aside>
    </>
  );
}