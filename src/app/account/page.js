"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LogOut,
  Package,
  ShieldCheck,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  XCircle,
  Truck,
  Check,
  Copy,
  Printer,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import InteractiveInput from "@/components/ui/InteractiveInput";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { api, API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { formatINR } from "@/data/catalogData";
import { printOrderInvoice } from "@/lib/printInvoice";
import { useAiConcierge } from "@/context/AiConciergeContext";

const AdminPanel = dynamic(() => import("@/components/admin/AdminPanel"), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[70vh] pt-32 px-6 flex items-center justify-center text-xs uppercase tracking-[0.22em] text-[#1b1717]/60">
      Loading Admin Console...
    </div>
  ),
});

const EMPTY_ADDRESS = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function paiseToINR(paise) {
  return formatINR(Math.round((paise || 0) / 100));
}

function getOrderGstBreakdown(ord) {
  const totalPaise = ord.totalPaise || 0;
  const subtotalPaise = ord.subtotalPaise || totalPaise;
  const discountPaise = ord.discountPaise || 0;
  const taxableBasePaise = ord.taxableBasePaise ?? Math.round(totalPaise / 1.12);
  const gstPaise = ord.gstPaise ?? Math.max(0, totalPaise - taxableBasePaise);
  const isIntraState =
    ord.taxType === "CGST_SGST" ||
    (!ord.taxType &&
      (ord.shippingAddress?.state || "").trim().toLowerCase() === "west bengal");
  const cgstPaise = ord.cgstPaise ?? (isIntraState ? Math.round(gstPaise / 2) : 0);
  const sgstPaise = ord.sgstPaise ?? (isIntraState ? gstPaise - cgstPaise : 0);
  const igstPaise = ord.igstPaise ?? (isIntraState ? 0 : gstPaise);

  return {
    totalPaise,
    subtotalPaise,
    discountPaise,
    taxableBasePaise,
    gstPaise,
    isIntraState,
    cgstPaise,
    sgstPaise,
    igstPaise,
    hsnCode: ord.hsnCode || "6204",
  };
}

function canCancelOrder(status) {
  return ["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(status);
}

function canRequestReturn(ord) {
  if (ord.status !== "DELIVERED") return false;
  const refDate = ord.deliveredAt || ord.updatedAt || ord.createdAt;
  if (!refDate) return true;
  const daysSince = (Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 7;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isAdmin, authLoading, refreshSession, logout } = useShop();

  // Auth states
  const [step, setStep] = useState("email");
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpPurpose, setOtpPurpose] = useState("CUSTOMER_REGISTER");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [totpSetup, setTotpSetup] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer Portal states
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderActionId, setOrderActionId] = useState(null);
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [portalNotice, setPortalNotice] = useState({ type: "", text: "" });

  // Address Manager states
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);
  const { registerFormHandler } = useAiConcierge();

  useEffect(() => {
    if (!user || isAdmin) return;
    return registerFormHandler("account_address", (fields) => {
      setActiveTab("addresses");
      setEditingAddressId(null);
      setShowAddressForm(true);
      setAddressForm((prev) => ({
        ...prev,
        ...(fields.label ? { label: fields.label } : {}),
        ...(fields.fullName ? { fullName: fields.fullName } : {}),
        ...(fields.phone ? { phone: fields.phone } : {}),
        ...(fields.line1 ? { line1: fields.line1 } : {}),
        ...(fields.line2 ? { line2: fields.line2 } : {}),
        ...(fields.city ? { city: fields.city } : {}),
        ...(fields.state ? { state: fields.state } : {}),
        ...(fields.postalCode ? { postalCode: fields.postalCode } : {}),
      }));
    });
  }, [user, isAdmin, registerFormHandler]);

  const pageRef = useRef(null);
  const wasLoggedInRef = useRef(false);

  useEffect(() => {
    if (user) {
      wasLoggedInRef.current = true;
    } else if (!authLoading && wasLoggedInRef.current) {
      wasLoggedInRef.current = false;
      setStep("email");
      setAuthMode("login");
      setPassword("");
      setOtpCode("");
      setTotpSetup(null);
      setErrorMsg("");
      setOrders([]);
      setAddresses([]);
      setExpandedOrderId(null);
      setReturnModalOrder(null);
      setShowAddressForm(false);
      setPortalNotice({ type: "", text: "" });
      router.replace("/account");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || isAdmin) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("tab")) {
        router.replace("/account");
      }
    }
  }, [authLoading, isAdmin, router]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data } = await api.get("/checkout/orders");
      setOrders(data.data?.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const { data } = await api.get("/auth/addresses");
      setAddresses(data.data?.addresses || []);
    } catch {
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || isAdmin) return;
    fetchOrders();
    fetchAddresses();
  }, [user, isAdmin, fetchOrders, fetchAddresses]);

  useGSAP(
    () => {
      const items = pageRef.current?.querySelectorAll(".account-reveal");
      if (!items || items.length === 0) return;
      gsap.fromTo(
        items,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: "power3.out", clearProps: "transform" }
      );
    },
    { scope: pageRef, dependencies: [Boolean(user), step] }
  );

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErrorMsg("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/identify", { email: email.trim() });
      setAuthMode(data.data?.mode || "login");
      setStep("signin");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Please enter a valid email address."));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/continue", {
        email: email.trim(),
        password,
        ...(authMode === "register" && fullName.trim() ? { fullName: fullName.trim() } : {}),
      });

      const res = data.data || {};
      if (res.verificationType === "EMAIL_OTP") {
        setOtpPurpose(res.purpose);
        setMaskedTarget(res.maskedTarget || email);
        setOtpCode("");
        setStep("email_otp");
      } else if (res.verificationType === "TOTP") {
        setTotpSetup(
          res.needsTotpSetup
            ? { manualSecret: res.manualSecret, otpauthUrl: res.otpauthUrl }
            : null
        );
        setOtpCode("");
        setStep("totp");
      } else {
        await refreshSession();
        setPassword("");
        setStep("email");
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Authentication failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuperAdminEmailOtpFallback = async () => {
    setErrorMsg("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/super-admin-email-otp", {
        email: email.trim(),
        password,
      });
      setOtpPurpose("ADMIN_LOGIN");
      setMaskedTarget(data.data?.maskedTarget || "your email");
      setOtpCode("");
      setStep("email_otp");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not send Email OTP."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await api.post("/auth/verify-otp", {
        email: email.trim(),
        otp: otpCode.trim(),
        purpose: otpPurpose,
      });
      await refreshSession();
      setOtpCode("");
      setPassword("");
      setStep("email");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Invalid verification code."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyTotp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await api.post("/auth/verify-totp", {
        email: email.trim(),
        code: otpCode.trim(),
      });
      await refreshSession();
      setOtpCode("");
      setPassword("");
      setTotpSetup(null);
      setStep("email");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Invalid authenticator code."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (ord) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel ${ord.orderNumber}? Reserved or paid stock will be released immediately.`
      )
    ) {
      return;
    }
    setOrderActionId(ord._id);
    setPortalNotice({ type: "", text: "" });
    try {
      await api.post(`/checkout/orders/${encodeURIComponent(ord.orderNumber)}/cancel`, {
        reason: "Cancelled by customer from account page",
      });
      setPortalNotice({
        type: "success",
        text: "Order cancelled. If paid online, our team has been alerted to process your refund shortly.",
      });
      await fetchOrders();
    } catch (err) {
      setPortalNotice({
        type: "error",
        text: getApiErrorMessage(err, "Could not cancel order."),
      });
    } finally {
      setOrderActionId(null);
    }
  };

  const handleSubmitReturnRequest = async (e) => {
    e.preventDefault();
    if (!returnModalOrder || !returnReason.trim()) return;
    setOrderActionId(returnModalOrder._id);
    setPortalNotice({ type: "", text: "" });
    try {
      await api.post(
        `/checkout/orders/${encodeURIComponent(returnModalOrder.orderNumber)}/return`,
        { reason: returnReason.trim() }
      );
      setPortalNotice({
        type: "success",
        text: `Return request submitted for ${returnModalOrder.orderNumber}. Our concierge will review it shortly.`,
      });
      setReturnModalOrder(null);
      setReturnReason("");
      await fetchOrders();
    } catch (err) {
      setPortalNotice({
        type: "error",
        text: getApiErrorMessage(err, "Could not submit return request."),
      });
    } finally {
      setOrderActionId(null);
    }
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      ...EMPTY_ADDRESS,
      fullName: user?.fullName || "",
      isDefault: addresses.length === 0,
    });
    setShowAddressForm(true);
  };

  const openEditAddress = (addr) => {
    setEditingAddressId(addr._id);
    setAddressForm({
      label: addr.label || "Home",
      fullName: addr.fullName || "",
      phone: addr.phone || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      postalCode: addr.postalCode || "",
      country: addr.country || "India",
      isDefault: Boolean(addr.isDefault),
    });
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    setPortalNotice({ type: "", text: "" });
    try {
      if (editingAddressId) {
        await api.patch(`/auth/addresses/${editingAddressId}`, addressForm);
        setPortalNotice({ type: "success", text: "Address updated." });
      } else {
        await api.post("/auth/addresses", addressForm);
        setPortalNotice({ type: "success", text: "Address saved for faster checkout." });
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDRESS);
      await fetchAddresses();
    } catch (err) {
      setPortalNotice({
        type: "error",
        text: getApiErrorMessage(err, "Could not save address."),
      });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Delete this saved address?")) return;
    setPortalNotice({ type: "", text: "" });
    try {
      await api.delete(`/auth/addresses/${addressId}`);
      setPortalNotice({ type: "success", text: "Address removed." });
      await fetchAddresses();
    } catch (err) {
      setPortalNotice({
        type: "error",
        text: getApiErrorMessage(err, "Could not delete address."),
      });
    }
  };

  const handleSetDefaultAddress = async (addr) => {
    try {
      await api.patch(`/auth/addresses/${addr._id}`, { isDefault: true });
      await fetchAddresses();
    } catch (err) {
      setPortalNotice({
        type: "error",
        text: getApiErrorMessage(err, "Could not update default address."),
      });
    }
  };

  const copyManualSecret = async (secret) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  if (authLoading) {
    return (
      <div className="w-full pt-32 pb-24 px-[3vw] lg:px-10 max-w-[1140px] mx-auto space-y-6">
        <div className="h-10 w-64 bg-[#1b1717]/[0.07] animate-pulse" />
        <div className="h-4 w-44 bg-[#1b1717]/[0.05] animate-pulse" />
        <div className="grid grid-cols-1 gap-4 pt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full border border-[#1b1717]/10 bg-[#1b1717]/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (user && isAdmin) {
    return <AdminPanel />;
  }

  if (user) {
    return (
      <div ref={pageRef} className="w-full pt-28 sm:pt-36 lg:pt-40 pb-24 px-[3vw] lg:px-10 max-w-[1140px] mx-auto">
        <div className="account-reveal flex flex-wrap items-end justify-between gap-4 border-b border-[#1b1717]/15 pb-6">
          <div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
              Member Profile
            </span>
            <h1 className="heading-serif text-3xl sm:text-4xl font-normal mt-1">
              Welcome, {user.fullName || user.email}
            </h1>
            <p className="text-xs text-[#1b1717]/65 mt-1">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#1b1717] text-xs uppercase tracking-widest hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="account-reveal mt-7 flex flex-wrap items-center gap-2 border-b border-[#1b1717]/15 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#1b1717] text-[#ffffff]"
                : "border border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>My Orders ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("addresses")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors cursor-pointer ${
              activeTab === "addresses"
                ? "bg-[#1b1717] text-[#ffffff]"
                : "border border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Saved Addresses ({addresses.length})</span>
          </button>
        </div>

        {portalNotice.text && (
          <div
            className={`mt-5 p-3.5 text-xs border ${
              portalNotice.type === "error"
                ? "border-[#5d100a]/40 bg-[#5d100a]/5 text-[#5d100a]"
                : "border-[#1b1717]/25 bg-[#1b1717]/[0.03] text-[#1b1717]"
            }`}
          >
            {portalNotice.text}
          </div>
        )}

        {activeTab === "orders" && (
          <section className="mt-8">
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="border border-[#1b1717]/10 p-5 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="h-4 w-36 bg-[#1b1717]/[0.08] animate-pulse" />
                      <div className="h-3 w-48 bg-[#1b1717]/[0.05] animate-pulse" />
                    </div>
                    <div className="h-6 w-24 bg-[#1b1717]/[0.08] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="border border-[#1b1717]/15 p-10 text-center">
                <p className="text-sm text-[#1b1717]/70">You have not placed any orders yet.</p>
                <Link
                  href="/collections"
                  className="mt-5 inline-block px-6 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest transition-colors"
                >
                  Explore Collection
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => {
                  const isOpen = expandedOrderId === ord._id;
                  const gst = getOrderGstBreakdown(ord);

                  return (
                    <div key={ord._id} className="border border-[#1b1717]/15 bg-[#ffffff]">
                      <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider">
                            {ord.orderNumber}
                          </p>
                          <p className="text-[11px] text-[#1b1717]/60 mt-0.5">
                            {ord.items?.length || 0} item(s) •{" "}
                            {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                          <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest border border-[#1b1717]/20">
                            {ord.status}
                          </span>
                          <span className="text-sm font-semibold">
                            {paiseToINR(ord.totalPaise)}
                          </span>
                          <button
                            type="button"
                            onClick={() => printOrderInvoice(ord, { viewer: "customer" })}
                            title="Print Tax Invoice"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest border border-[#1b1717]/25 hover:border-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Invoice</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isOpen ? null : ord._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest border border-[#1b1717]/25 hover:border-[#5d100a] hover:text-[#5d100a] transition-colors cursor-pointer"
                          >
                            <span>{isOpen ? "Hide Details" : "Price & Details"}</span>
                            {isOpen ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-[#1b1717]/10 bg-[#1b1717]/[0.015] p-5 space-y-6">
                          <div className="space-y-3">
                            {(ord.items || []).map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-4 pb-3 border-b border-[#1b1717]/10 last:border-b-0 last:pb-0"
                              >
                                <div className="w-12 h-16 shrink-0 bg-[#1b1717]/5 overflow-hidden">
                                  <ResponsiveImage
                                    src={item.image}
                                    alt={item.title}
                                    preset="thumb"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/shop/${item.slug}`}
                                    className="heading-serif text-sm hover:text-[#5d100a] transition-colors line-clamp-1"
                                  >
                                    {item.title}
                                  </Link>
                                  <p className="text-[11px] text-[#1b1717]/60">
                                    Size: {item.size} • Qty: {item.quantity}
                                  </p>
                                </div>
                                <div className="text-xs font-semibold">
                                  {formatINR((item.unitPrice || 0) * (item.quantity || 1))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="border border-[#1b1717]/10 bg-[#ffffff] p-4 space-y-2 text-xs">
                              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                                Delivery &amp; Tracking
                              </h3>
                              <p className="font-medium">{ord.shippingAddress?.fullName}</p>
                              <p className="text-[#1b1717]/75">
                                {[
                                  ord.shippingAddress?.line1,
                                  ord.shippingAddress?.line2,
                                  ord.shippingAddress?.city,
                                  ord.shippingAddress?.state,
                                  ord.shippingAddress?.postalCode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                              <p className="text-[#1b1717]/65">Phone: {ord.shippingAddress?.phone}</p>

                              {ord.trackingNumber && (
                                <div className="mt-3 pt-2.5 border-t border-[#1b1717]/10 flex items-center gap-2 text-[11px]">
                                  <Truck className="w-3.5 h-3.5 text-[#5d100a]" />
                                  <span>
                                    <strong>{ord.courierName || "Courier"}:</strong>{" "}
                                    <span className="font-mono">{ord.trackingNumber}</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="border border-[#1b1717]/10 bg-[#ffffff] p-4 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                                  Tax &amp; Price Breakdown
                                </h3>
                                <span className="text-[10px] text-[#1b1717]/55 font-mono">
                                  HSN {gst.hsnCode}
                                </span>
                              </div>

                              <div className="flex justify-between text-[#1b1717]/75">
                                <span>MRP Subtotal (Incl. GST)</span>
                                <span>{paiseToINR(gst.subtotalPaise)}</span>
                              </div>

                              {gst.discountPaise > 0 && (
                                <div className="flex justify-between text-[#5d100a]">
                                  <span>Coupon Discount {ord.couponCode ? `(${ord.couponCode})` : ""}</span>
                                  <span>−{paiseToINR(gst.discountPaise)}</span>
                                </div>
                              )}

                              <div className="flex justify-between text-[#1b1717]/65 text-[11px] pt-1 border-t border-dashed border-[#1b1717]/10">
                                <span>Taxable Value</span>
                                <span>{paiseToINR(gst.taxableBasePaise)}</span>
                              </div>

                              {gst.isIntraState ? (
                                <>
                                  <div className="flex justify-between text-[#1b1717]/65 text-[11px]">
                                    <span>Included CGST (6%)</span>
                                    <span>{paiseToINR(gst.cgstPaise)}</span>
                                  </div>
                                  <div className="flex justify-between text-[#1b1717]/65 text-[11px]">
                                    <span>Included SGST (6%)</span>
                                    <span>{paiseToINR(gst.sgstPaise)}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex justify-between text-[#1b1717]/65 text-[11px]">
                                  <span>Included IGST (12%)</span>
                                  <span>{paiseToINR(gst.igstPaise)}</span>
                                </div>
                              )}

                              <div className="flex justify-between text-[#1b1717]/75">
                                <span>Insured Shipping</span>
                                <span>Complimentary</span>
                              </div>

                              <div className="flex justify-between font-semibold text-sm pt-2 border-t border-[#1b1717]/15">
                                <span>Total Paid</span>
                                <span>{paiseToINR(gst.totalPaise)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1b1717]/10">
                            <div className="text-[11px] text-[#1b1717]/60">
                              {ord.razorpayPaymentId && (
                                <span>Payment Ref: {ord.razorpayPaymentId}</span>
                              )}
                              {ord.returnRequest?.reason && (
                                <span className="block text-[#5d100a] mt-0.5">
                                  Return Note: {ord.returnRequest.reason}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => printOrderInvoice(ord, { viewer: "customer" })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Tax Invoice</span>
                              </button>

                              {canCancelOrder(ord.status) && (
                                <button
                                  type="button"
                                  disabled={orderActionId === ord._id}
                                  onClick={() => handleCancelOrder(ord)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#5d100a] text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff] text-[10px] uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>
                                    {orderActionId === ord._id ? "Cancelling..." : "Cancel Order"}
                                  </span>
                                </button>
                              )}

                              {canRequestReturn(ord) && (
                                <button
                                  type="button"
                                  disabled={orderActionId === ord._id}
                                  onClick={() => {
                                    setReturnModalOrder(ord);
                                    setReturnReason("");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-[10px] uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Request 7-Day Return</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "addresses" && (
          <section className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-[#1b1717]/65">
                Save your delivery addresses for 1-click filling during checkout.
              </p>
              <button
                type="button"
                onClick={openAddAddress}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Address</span>
              </button>
            </div>

            {showAddressForm && (
              <form
                onSubmit={handleSaveAddress}
                className="border border-[#1b1717]/20 p-5 sm:p-6 bg-[#ffffff] space-y-4"
              >
                <h3 className="heading-serif text-lg">
                  {editingAddressId ? "Edit Saved Address" : "Add Delivery Address"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      Label
                    </label>
                    <select
                      value={addressForm.label}
                      onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs bg-[#ffffff] outline-none focus:border-[#5d100a]"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.fullName}
                      onChange={(e) => setAddressForm((p) => ({ ...p, fullName: e.target.value }))}
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.line1}
                      onChange={(e) => setAddressForm((p) => ({ ...p, line1: e.target.value }))}
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      Address Line 2 (Optional)
                    </label>
                    <input
                      type="text"
                      value={addressForm.line2}
                      onChange={(e) => setAddressForm((p) => ({ ...p, line2: e.target.value }))}
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))}
                      placeholder="West Bengal"
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/65 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm((p) => ({ ...p, postalCode: e.target.value }))}
                      placeholder="700001"
                      className="w-full border border-[#1b1717]/25 px-3 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) =>
                      setAddressForm((p) => ({ ...p, isDefault: e.target.checked }))
                    }
                    className="accent-[#5d100a]"
                  />
                  <span>Set as default shipping address</span>
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="px-5 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingAddress ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false);
                      setEditingAddressId(null);
                    }}
                    className="px-4 py-2.5 border border-[#1b1717]/25 text-xs uppercase tracking-widest hover:border-[#1b1717] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {addressesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-36 border border-[#1b1717]/10 bg-[#1b1717]/[0.04] animate-pulse" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="border border-[#1b1717]/15 p-10 text-center text-sm text-[#1b1717]/65">
                No saved addresses yet. Add one above for faster checkout.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className={`border p-5 flex flex-col justify-between gap-4 bg-[#ffffff] ${
                      addr.isDefault ? "border-[#5d100a]" : "border-[#1b1717]/15"
                    }`}
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-[#5d100a]">
                          {addr.label || "Home"}
                        </span>
                        {addr.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#5d100a] text-[#ffffff] text-[9px] uppercase tracking-widest">
                            <Check className="w-2.5 h-2.5" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-[#1b1717]">{addr.fullName}</p>
                      <p className="text-[#1b1717]/75">
                        {[addr.line1, addr.line2, addr.city, addr.state, addr.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p className="text-[#1b1717]/60">Phone: {addr.phone}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#1b1717]/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => openEditAddress(addr)}
                        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-[#5d100a] cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="inline-flex items-center gap-1 uppercase tracking-wider text-[#5d100a] hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr)}
                          className="ml-auto uppercase tracking-wider underline text-[#1b1717]/70 hover:text-[#1b1717] cursor-pointer"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {returnModalOrder && (
          <div
            data-lenis-prevent
            onClick={(e) => {
              if (e.target === e.currentTarget) setReturnModalOrder(null);
            }}
            className="fixed inset-0 z-[1010] bg-black/50 flex items-center justify-center p-4"
          >
            <form
              onSubmit={handleSubmitReturnRequest}
              className="w-full max-w-md bg-[#ffffff] border border-[#1b1717]/20 p-6 space-y-4"
            >
              <h3 className="heading-serif text-xl">
                Request Return — {returnModalOrder.orderNumber}
              </h3>
              <p className="text-xs text-[#1b1717]/70">
                Please tell us why you would like to return this order. Unworn items with tags intact are eligible within 7 days of delivery.
              </p>
              <textarea
                required
                rows={4}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g., Size did not fit as expected, fabric/color difference..."
                className="w-full border border-[#1b1717]/25 p-3 text-xs outline-none focus:border-[#5d100a]"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReturnModalOrder(null)}
                  className="px-4 py-2 border border-[#1b1717]/25 text-xs uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderActionId === returnModalOrder._id}
                  className="px-5 py-2 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
                >
                  {orderActionId === returnModalOrder._id ? "Submitting..." : "Submit Return"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      id="account-page"
      className="w-full pt-28 sm:pt-36 lg:pt-40 pb-24 px-[8vw] sm:px-6 max-w-md mx-auto"
    >
      <div id="account-page-main-container" className="w-full">
        <h1 className="account-reveal account-page-heading heading-serif text-[8vw] sm:text-2xl lg:text-[28px] uppercase font-light leading-none text-center">
          My Divara Account
        </h1>

        {step === "email" && (
          <>
            <section className="account-reveal third-party-signin-section mt-7">
              <button
                type="button"
                onClick={() => (window.location.href = `${API_BASE_URL}/auth/google`)}
                className="google-signin-btn flex items-center justify-center gap-2.5 text-xs uppercase font-semibold w-full h-[3rem] border-[1.5px] border-zinc-800 rounded-[3px] cursor-pointer hover:bg-zinc-50 transition-colors"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </section>
            <span className="account-reveal block w-full text-center uppercase font-semibold text-xs my-5">
              or
            </span>
          </>
        )}

        <div className="account-reveal signin-heading-container mt-4">
          <h2 className="heading-serif text-lg lg:text-xl uppercase text-center font-normal">
            {step === "totp"
              ? "Super Admin Authenticator"
              : step === "email_otp"
              ? "Email Verification Code"
              : "Continue with your email address"}
          </h2>
          <p className="text-xs text-center mt-2.5 text-zinc-600">
            {step === "email" && "Sign in with your email and password or create a profile if you are new."}
            {step === "signin" &&
              (authMode === "register"
                ? "Create your DIVARA profile. We will send a 6-digit OTP to verify your email."
                : "Welcome back. Enter your password to continue.")}
            {step === "email_otp" && `Enter the 6-digit code sent to ${maskedTarget}.`}
            {step === "totp" &&
              (totpSetup
                ? "Add this private setup key manually in Microsoft Authenticator or Google Authenticator (Time-based), then enter the 6-digit code."
                : "Open Microsoft / Google Authenticator and enter your 6-digit code.")}
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 border border-[#5d100a]/30 bg-[#5d100a]/5 text-[#5d100a] text-xs text-center">
            {errorMsg}
          </div>
        )}

        {step === "email" && (
          <section className="account-reveal w-full py-5">
            <form onSubmit={handleEmailSubmit} className="w-full">
              <InteractiveInput
                variant="account"
                label="Email*"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[3rem] mt-6 bg-[#1b1717] hover:bg-[#5d100a] transition-colors rounded-[3px] text-[#ffffff] text-[0.7rem] uppercase font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitting ? "checking..." : "continue"}
              </button>
            </form>
          </section>
        )}

        {step === "signin" && (
          <section className="account-reveal w-full py-5">
            <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col gap-4">
              <InteractiveInput
                variant="account"
                label="Email*"
                type="email"
                value={email}
                disabled
                rightSlot={
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setPassword("");
                      setErrorMsg("");
                    }}
                    className="text-[10px] uppercase underline cursor-pointer"
                  >
                    Edit
                  </button>
                }
              />

              {authMode === "register" && (
                <InteractiveInput
                  variant="account"
                  label="Full Name*"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}

              <InteractiveInput
                variant="account"
                label="Password*"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-zinc-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[3rem] bg-[#1b1717] hover:bg-[#5d100a] transition-colors rounded-[3px] text-[#ffffff] text-[0.7rem] uppercase font-semibold cursor-pointer mt-2 disabled:opacity-50"
              >
                {submitting ? "verifying..." : authMode === "register" ? "send verification otp" : "continue"}
              </button>
            </form>
          </section>
        )}

        {step === "email_otp" && (
          <section className="account-reveal w-full py-5">
            <form onSubmit={handleVerifyEmailOtp} className="space-y-5">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono border border-[#1b1717]/30 focus:border-[#5d100a] outline-none"
              />
              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6}
                className="w-full h-[3rem] bg-[#5d100a] hover:bg-[#1b1717] transition-colors rounded-[3px] text-[#ffffff] text-[0.7rem] uppercase font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitting ? "verifying..." : "verify & continue"}
              </button>
            </form>
          </section>
        )}

        {step === "totp" && (
          <section className="account-reveal w-full py-5 space-y-5">
            {totpSetup && (
              <div className="border border-[#1b1717]/15 p-4 text-center space-y-3 bg-[#ffffff]">
                <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest text-[#5d100a] font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>First-Time Authenticator Setup</span>
                </div>
                <p className="text-[11px] text-[#1b1717]/70 leading-relaxed">
                  For security, your secret key is never sent to external QR generators. Copy this key into Microsoft or Google Authenticator (&ldquo;Enter a setup key&rdquo; → Time-based):
                </p>
                <div className="flex items-center justify-center gap-2 bg-[#1b1717]/[0.03] border border-[#1b1717]/15 px-3 py-2.5">
                  <code className="font-mono text-xs font-semibold text-[#1b1717] select-all break-all">
                    {totpSetup.manualSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyManualSecret(totpSetup.manualSecret)}
                    className="shrink-0 p-1.5 border border-[#1b1717]/20 hover:border-[#5d100a] hover:text-[#5d100a] cursor-pointer"
                    title="Copy secret key"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyTotp} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono border border-[#1b1717]/30 focus:border-[#5d100a] outline-none"
              />
              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6}
                className="w-full h-[3rem] bg-[#5d100a] hover:bg-[#1b1717] transition-colors rounded-[3px] text-[#ffffff] text-[0.7rem] uppercase font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitting ? "authenticating..." : "verify authenticator code"}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSuperAdminEmailOtpFallback}
                className="w-full py-2 text-[11px] uppercase tracking-widest underline text-[#1b1717]/75 hover:text-[#5d100a] cursor-pointer"
              >
                Verify using Email OTP instead
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}