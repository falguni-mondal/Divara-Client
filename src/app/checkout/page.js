"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { MapPin, Check, X } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useToast } from "@/context/ToastContext";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/data/catalogData";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import InteractiveInput from "@/components/ui/InteractiveInput";
import { getStoredAttribution } from "@/components/analytics/UtmTracker";

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { scrollTo, refreshScroll } = useSmoothScroll();
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

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

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
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const paymentCompletedRef = useRef(false);

  // Scroll to top when entering verifying or confirmed state
  useEffect(() => {
    if (!verifying && !confirmedOrder) return;
    scrollTo(0, { immediate: true });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    const t = setTimeout(() => refreshScroll(), 120);
    return () => clearTimeout(t);
  }, [verifying, confirmedOrder, scrollTo, refreshScroll]);

  const applyAddress = (addr, userEmail) => {
    setSelectedAddressId(addr._id);
    setShipping({
      fullName: addr.fullName || "",
      email: userEmail || shipping.email || "",
      phone: addr.phone || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      postalCode: addr.postalCode || "",
      country: addr.country || "India",
    });
  };

  useEffect(() => {
    if (!user || isAdmin) return;
    // Hydrate fresh stock & prices when landing on checkout
    syncBagAndAutoCoupon();

    setShipping((prev) => ({
      ...prev,
      fullName: prev.fullName || user.fullName || "",
      email: prev.email || user.email || "",
      phone: prev.phone || user.phone || "",
    }));

    api
      .get("/auth/addresses")
      .then(({ data }) => {
        const list = data.data?.addresses || [];
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) applyAddress(def, user.email);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const grandTotalInr = Math.max(0, bagSubtotal - discountInr);
  const taxableBaseInr = Math.round(grandTotalInr / 1.12);
  const totalGstInr = grandTotalInr - taxableBaseInr;
  const isIntraState = shipping.state.trim().toLowerCase() === "west bengal";
  const cgstInr = isIntraState ? Math.floor(totalGstInr / 2) : 0;
  const sgstInr = isIntraState ? totalGstInr - cgstInr : 0;

  const handleCheckout = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (typeof window === "undefined" || !window.Razorpay) {
      const msg = "Payment gateway is still loading. Please wait a moment and try again.";
      setErrorMsg(msg);
      toast.warning(msg);
      return;
    }

    setSubmitting(true);
    paymentCompletedRef.current = false;

    try {
      // Step 1: Final live stock, active-status, price, and coupon preflight check BEFORE reserving
      const { data: preflightRes } = await api.post("/checkout/preflight", {
        couponCode: appliedCoupon?.code || null,
      });

      if (!preflightRes?.data?.ok) {
        const firstIssue =
          preflightRes?.data?.issues?.[0]?.reason ||
          "Some items in your bag are no longer available in the requested quantity.";
        setErrorMsg(firstIssue);
        toast.error(firstIssue);
        await syncBagAndAutoCoupon();
        return;
      }

      // Step 2: Authoritative MongoDB ACID transaction check + temporary 15m reservation + Razorpay order
      const { data } = await api.post("/checkout/session", {
        shippingAddress: shipping,
        couponCode: appliedCoupon?.code || null,
        attribution: getStoredAttribution(),
      });

      const session = data.data;

      if (!session?.razorpayKeyId) {
        const msg = "Online payments are temporarily unavailable. Please try again shortly.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      const rzp = new window.Razorpay({
        key: session.razorpayKeyId,
        amount: session.amountPaise,
        currency: session.currency,
        name: "DIVARA",
        description: `Order ${session.orderNumber}`,
        order_id: session.razorpayOrderId,
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        prefill: {
          name: shipping.fullName,
          email: shipping.email,
          contact: shipping.phone,
        },
        theme: { color: "#5d100a" },
        modal: {
          // Immediately release the 15-minute stock hold if the customer closes Razorpay without paying
          ondismiss: async () => {
            if (paymentCompletedRef.current) return;
            try {
              await api.post("/checkout/release", {
                orderId: session.orderId,
                razorpayOrderId: session.razorpayOrderId,
              });
              toast.info("Checkout closed — reserved stock has been released.");
            } catch {
              // Non-blocking; 15-min reclaimer remains as safety net
            }
          },
        },
        handler: async (response) => {
          paymentCompletedRef.current = true;
          setVerifying(true);
          setErrorMsg("");
          try {
            await api.post("/checkout/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setConfirmedOrder({ ...session, verified: true });
            toast.success(`Order ${session.orderNumber} confirmed!`);
            await syncBagAndAutoCoupon();
          } catch (verifyErr) {
            const msg = getApiErrorMessage(
              verifyErr,
              "Payment was captured, but verification timed out. Please check My Account."
            );
            setErrorMsg(msg);
            toast.error(msg);
          } finally {
            setVerifying(false);
          }
        },
      });

      rzp.on("payment.failed", async (failResp) => {
        const errObj = failResp?.error || {};
        const msg =
          errObj.description || "Payment was declined or cancelled. No amount was deducted.";
        setErrorMsg(msg);
        toast.error(msg);
        try {
          await api.post("/checkout/failure", {
            razorpayOrderId: session.razorpayOrderId,
            razorpayPaymentId: errObj.metadata?.payment_id || null,
            reason: errObj.description || errObj.reason || "Payment failed",
            code: errObj.code || "PAYMENT_FAILED",
          });
        } catch {
          // Non-blocking
        }
      });

      rzp.open();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Unable to initiate checkout.");
      setErrorMsg(msg);
      toast.error(msg);
      await syncBagAndAutoCoupon();
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || verifying) {
    return (
      <div className="min-h-[60vh] pt-28 flex items-center justify-center text-xs uppercase tracking-widest text-[#1b1717]/60">
        {verifying ? "Verifying Payment & Confirming Order..." : "Loading Checkout..."}
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
      <div className="min-h-[65vh] pt-36 pb-20 px-4 max-w-xl mx-auto text-center">
        <span className="text-xs uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Order Confirmed
        </span>
        <h1 className="heading-serif text-3xl font-normal mt-2">
          Thank You, {shipping.fullName}
        </h1>
        <p className="mt-3 text-sm text-[#1b1717]/75">
          Order reference <strong>{confirmedOrder.orderNumber}</strong> is confirmed and paid. A tax invoice receipt has been dispatched to <strong>{shipping.email}</strong>.
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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

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
              {savedAddresses.length > 0 && (
                <div className="border border-[#1b1717]/15 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Quick-Fill Saved Address</span>
                    </span>
                    <Link
                      href="/account"
                      className="text-[10px] uppercase tracking-wider underline text-[#1b1717]/65 hover:text-[#5d100a]"
                    >
                      Manage Addresses
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {savedAddresses.map((addr) => {
                      const active = selectedAddressId === addr._id;
                      return (
                        <button
                          key={addr._id}
                          type="button"
                          onClick={() => applyAddress(addr, user.email)}
                          className={`text-left p-3 border transition-colors cursor-pointer ${
                            active
                              ? "border-[#5d100a] bg-[#5d100a]/[0.04]"
                              : "border-[#1b1717]/15 hover:border-[#1b1717]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-[#5d100a]">
                              {addr.label || "Saved"}
                            </span>
                            {active && <Check className="w-3.5 h-3.5 text-[#5d100a]" />}
                          </div>
                          <p className="text-xs font-medium mt-1 truncate">{addr.fullName}</p>
                          <p className="text-[11px] text-[#1b1717]/65 truncate">
                            {addr.line1}, {addr.city} - {addr.postalCode}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <h2 className="heading-serif text-xl font-normal border-b border-[#1b1717]/15 pb-3">
                Shipping Details
              </h2>

              {errorMsg && (
                <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a] flex items-start justify-between gap-2">
                  <span>{errorMsg}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMsg("")}
                    aria-label="Dismiss error"
                    className="p-0.5 hover:text-[#1b1717] cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
                  ? "Verifying Live Stock & Opening Payment..."
                  : `Pay ${formatINR(grandTotalInr)} with Razorpay`}
              </button>
            </form>

            <aside className="lg:col-span-5 border border-[#1b1717]/15 p-6 h-fit space-y-5">
              <h2 className="heading-serif text-xl font-normal border-b border-[#1b1717]/15 pb-3">
                Order &amp; Tax Breakdown
              </h2>

              <div className="divide-y divide-[#1b1717]/10">
                {bag.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="py-3 flex items-center gap-3.5">
                    <ResponsiveImage
                      src={item.image}
                      alt={item.title}
                      preset="thumb"
                      className="w-12 h-16 object-cover bg-[#1b1717]/5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-[#1b1717]/60">
                        Size {item.size} × {item.quantity}
                      </p>
                      {item.stockWarning && (
                        <p className="text-[10px] text-[#5d100a] font-medium mt-0.5">
                          {item.stockWarning}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold shrink-0">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#1b1717]/15 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#1b1717]/75">
                  <span>MRP Subtotal (Incl. of all taxes)</span>
                  <span>{formatINR(bagSubtotal)}</span>
                </div>
                {discountInr > 0 && (
                  <div className="flex justify-between text-[#5d100a] font-medium">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>-{formatINR(discountInr)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#1b1717]/75">
                  <span>Insured Shipping</span>
                  <span>Complimentary</span>
                </div>

                <div className="pt-2 mt-2 border-t border-dashed border-[#1b1717]/15 space-y-1 text-[11px] text-[#1b1717]/65">
                  <div className="flex justify-between">
                    <span>Taxable Value (Excl. GST)</span>
                    <span>{formatINR(taxableBaseInr)}</span>
                  </div>
                  {isIntraState ? (
                    <>
                      <div className="flex justify-between">
                        <span>CGST (6%)</span>
                        <span>{formatINR(cgstInr)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (6%)</span>
                        <span>{formatINR(sgstInr)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>IGST (12%)</span>
                      <span>{formatINR(totalGstInr)}</span>
                    </div>
                  )}
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