"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogOut, Package, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import InteractiveInput from "@/components/ui/InteractiveInput";
import AdminPanel from "@/components/admin/AdminPanel";
import { api, API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { formatINR } from "@/data/catalogData";

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

export default function AccountPage() {
  const { user, isAdmin, authLoading, refreshSession, logout } = useShop();
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

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [orders, setOrders] = useState([]);
  const pageRef = useRef(null);

  useEffect(() => {
    if (!user || isAdmin) return;
    api
      .get("/checkout/orders")
      .then(({ data }) => setOrders(data.data?.orders || []))
      .catch(() => setOrders([]));
  }, [user, isAdmin]);

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
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Invalid authenticator code."));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full min-h-[65vh] flex items-center justify-center pt-32 text-xs uppercase tracking-[0.2em] text-[#1b1717]/60">
        Loading Account...
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

        <section className="account-reveal mt-10">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4 text-[#5d100a]" />
            <h2 className="heading-serif text-xl font-normal">Your Orders ({orders.length})</h2>
          </div>

          {orders.length === 0 ? (
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
              {orders.map((ord) => (
                <div key={ord._id} className="border border-[#1b1717]/15 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider">{ord.orderNumber}</p>
                    <p className="text-[11px] text-[#1b1717]/60 mt-0.5">
                      {ord.items?.length || 0} item(s) • {new Date(ord.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest border border-[#1b1717]/20">
                      {ord.status}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatINR(Math.round((ord.totalPaise || 0) / 100))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
                ? "Scan this QR code in Microsoft Authenticator or Google Authenticator, then enter the 6-digit code."
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
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    totpSetup.otpauthUrl
                  )}`}
                  alt="Super Admin TOTP QR Code"
                  className="mx-auto w-44 h-44 border border-[#1b1717]/10 p-1.5"
                />
                <div className="text-[11px] text-[#1b1717]/70">
                  Manual Key:{" "}
                  <code className="font-mono font-semibold text-[#1b1717] select-all">
                    {totpSetup.manualSecret}
                  </code>
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