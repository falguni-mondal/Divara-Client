"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useShop } from "@/context/ShopContext";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/data/catalogData";
import { ikUrl } from "@/lib/imagekit";
import InteractiveInput from "@/components/ui/InteractiveInput";
import { getStoredAttribution } from "@/components/analytics/UtmTracker";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    user,
    isAdmin,
    authLoading,
    bag,
    bagSubtotal,
    appliedCoupon,
    discountInr,
    syncBagAndAutoCoupon,
  } = useShop();

  const [shipping, setShipping] = useState({
    fullName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    if (user) {
      setShipping((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  const taxableInr = Math.max(0, bagSubtotal - discountInr);
  const gstInr = Math.round(taxableInr * 0.12);
  const grandTotalInr = taxableInr + gstInr;

  const handleCheckout = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const { data } = await api.post("/checkout/session", {
        shippingAddress: shipping,
        couponCode: appliedCoupon?.code || null,
        attribution: getStoredAttribution(),
      });

      const session = data.data;

      if (session.razorpayKeyId && typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: session.razorpayKeyId,
          amount: session.amountPaise,
          currency: session.currency,
          name: "DIVARA",
          description: `Order ${session.orderNumber}`,
          order_id: session.razorpayOrderId,
          prefill: {
            name: shipping.fullName,
            email: shipping.email,
            contact: shipping.phone,
          },
          theme: { color: "#5d100a" },
          handler: async () => {
            setConfirmedOrder(session);
            await syncBagAndAutoCoupon();
          },
        });
        rzp.open();
      } else {
        setConfirmedOrder(session);
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Unable to initiate checkout."));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] pt-28 flex items-center justify-center text-xs uppercase tracking-widest text-[#1b1717]/60">
        Loading Checkout...
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-[60vh] pt-28 px-4 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Admin Mode Active
        </span>
        <h1 className="heading-serif text-2xl font-normal mt-2">
          Checkout Disabled for Admin Accounts
        </h1>
        <p className="mt-2 text-xs text-[#1b1717]/65 max-w-sm">
          Administrator accounts cannot place storefront orders. Manage orders directly from your Admin Console.
        </p>
        <Link
          href="/account"
          className="mt-6 px-7 py-3 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors"
        >
          Return to Admin Console
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] pt-28 px-4 flex flex-col items-center justify-center text-center">
        <h1 className="heading-serif text-2xl font-normal">Sign In to Checkout</h1>
        <p className="mt-2 text-xs text-[#1b1717]/65 max-w-sm">
          DIVARA checkout is exclusively available to signed-in members for secure order tracking and insured delivery.
        </p>
        <Link
          href="/account"
          className="mt-6 px-7 py-3 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors"
        >
          Sign In / Create Account
        </Link>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="min-h-[65vh] pt-28 px-4 max-w-xl mx-auto text-center">
        <span className="text-xs uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Order Initiated
        </span>
        <h1 className="heading-serif text-3xl font-normal mt-2">
          Thank You, {shipping.fullName}
        </h1>
        <p className="mt-3 text-sm text-[#1b1717]/75">
          Order reference <strong>{confirmedOrder.orderNumber}</strong> has been created. Once payment confirmation completes, you will receive an email receipt from DIVARA.
        </p>
        <button
          type="button"
          onClick={() => router.push("/account")}
          className="mt-8 px-7 py-3 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer"
        >
          View Order in My Account
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#ffffff] text-[#1b1717] pt-24 lg:pt-32 pb-20">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-[1280px] mx-auto px-[3vw] lg:px-10">
        <h1 className="heading-serif text-3xl sm:text-4xl font-normal mb-10">Checkout</h1>

        {bag.length === 0 ? (
          <div className="border border-[#1b1717]/15 p-12 text-center">
            <p className="text-sm text-[#1b1717]/70">Your shopping bag is currently empty.</p>
            <Link
              href="/collections"
              className="mt-5 inline-block px-6 py-2.5 bg-[#1b1717] text-[#ffffff] text-xs uppercase tracking-widest"
            >
              Return to Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
            <form onSubmit={handleCheckout} className="lg:col-span-7 space-y-5">
              <h2 className="heading-serif text-xl font-normal border-b border-[#1b1717]/15 pb-3">
                Shipping Details
              </h2>

              {errorMsg && (
                <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InteractiveInput
                  label="Full Name *"
                  required
                  value={shipping.fullName}
                  onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                />
                <InteractiveInput
                  label="Phone Number *"
                  required
                  value={shipping.phone}
                  onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>

              <InteractiveInput
                label="Email Address *"
                type="email"
                required
                value={shipping.email}
                onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
              />

              <InteractiveInput
                label="Address Line 1 *"
                required
                value={shipping.line1}
                onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                placeholder="House / Flat, Street"
              />

              <InteractiveInput
                label="Address Line 2 (Optional)"
                value={shipping.line2}
                onChange={(e) => setShipping({ ...shipping, line2: e.target.value })}
                placeholder="Landmark / Locality"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <InteractiveInput
                  label="City *"
                  required
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                />
                <InteractiveInput
                  label="State *"
                  required
                  value={shipping.state}
                  onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                />
                <InteractiveInput
                  label="PIN Code *"
                  required
                  value={shipping.postalCode}
                  onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#5d100a] hover:bg-[#1b1717] text-[#ffffff] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting
                  ? "Reserving Stock & Opening Payment..."
                  : `Pay ${formatINR(grandTotalInr)} with Razorpay`}
              </button>
            </form>

            <aside className="lg:col-span-5 border border-[#1b1717]/15 p-6 h-fit space-y-5">
              <h2 className="heading-serif text-xl font-normal border-b border-[#1b1717]/15 pb-3">
                Order Summary
              </h2>

              <div className="divide-y divide-[#1b1717]/10">
                {bag.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="py-3 flex items-center gap-3.5">
                    <img
                      src={ikUrl(item.image, { width: 140 })}
                      alt={item.title}
                      className="w-12 h-16 object-cover bg-[#1b1717]/5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-[#1b1717]/60">
                        Size {item.size} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-semibold">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#1b1717]/15 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#1b1717]/75">
                  <span>Subtotal</span>
                  <span>{formatINR(bagSubtotal)}</span>
                </div>
                {discountInr > 0 && (
                  <div className="flex justify-between text-[#5d100a] font-medium">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-{formatINR(discountInr)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#1b1717]/75">
                  <span>Insured Shipping</span>
                  <span>Complimentary</span>
                </div>
                <div className="flex justify-between text-[#1b1717]/75">
                  <span>GST (12%)</span>
                  <span>{formatINR(gstInr)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-[#1b1717]/15">
                  <span>Total Payable</span>
                  <span>{formatINR(grandTotalInr)}</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}