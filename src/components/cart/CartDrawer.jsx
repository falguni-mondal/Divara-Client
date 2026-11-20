"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Plus, Minus, Tag } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { formatINR } from "@/data/catalogData";
import { getApiErrorMessage } from "@/lib/api";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

export default function CartDrawer() {
  const {
    user,
    bag,
    bagCount,
    isBagOpen,
    setIsBagOpen,
    updateQuantity,
    bagSubtotal,
    appliedCoupon,
    discountInr,
    applyCoupon,
    removeCoupon,
    bagError,
  } = useShop();

  const { stopScroll, startScroll } = useSmoothScroll();
  const [couponInput, setCouponInput] = useState("");
  const [couponFeedback, setCouponFeedback] = useState("");
  const [applying, setApplying] = useState(false);

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

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplying(true);
    setCouponFeedback("");
    try {
      const res = await applyCoupon(couponInput.trim());
      setCouponInput("");
      setCouponFeedback(`Applied ${res.code} (-${formatINR(res.discountInr)})`);
    } catch (err) {
      setCouponFeedback(getApiErrorMessage(err, "Invalid coupon code"));
    } finally {
      setApplying(false);
    }
  };

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
          <div className="px-5 py-2.5 bg-[#5d100a]/10 text-[#5d100a] text-[11px] font-medium border-b border-[#5d100a]/20">
            {bagError}
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
            bag.map((item) => (
              <div
                key={`${item.id}-${item.size}`}
                className="py-4 first:pt-0 flex gap-3.5"
              >
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

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/shop/${item.slug}`}
                      onClick={() => setIsBagOpen(false)}
                      className="text-xs font-semibold uppercase tracking-wide hover:text-[#5d100a] transition-colors block"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-[#1b1717]/60">
                      Size: {item.size}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#1b1717]/25">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.title}`}
                        onClick={() => updateQuantity(item.id, item.size, -1)}
                        className="p-1 hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2.5 text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.title}`}
                        onClick={() => updateQuantity(item.id, item.size, 1)}
                        className="p-1 hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="text-xs font-semibold">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
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

            {couponFeedback && (
              <p className="text-[11px] text-[#5d100a]">{couponFeedback}</p>
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

            <Link
              href="/checkout"
              onClick={() => setIsBagOpen(false)}
              className="w-full h-[2.8rem] flex items-center justify-center bg-[#5d100a] text-[#ffffff] text-xs uppercase font-semibold rounded-[2px] hover:bg-[#1b1717] transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}