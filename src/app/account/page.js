"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogOut, Package } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import InteractiveInput from "@/components/ui/InteractiveInput";
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
  const { user, authLoading, refreshSession, logout } = useShop();
  const [step, setStep] = useState("email");
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [orders, setOrders] = useState([]);
  const pageRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api
      .get("/checkout/orders")
      .then(({ data }) => setOrders(data.data?.orders || []))
      .catch(() => setOrders([]));
  }, [user]);

  useGSAP(
    () => {
      const items = pageRef.current?.querySelectorAll(".account-reveal");
      if (!items || items.length === 0) return;

      gsap.fromTo(
        items,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "transform",
        }
      );
    },
    { scope: pageRef, dependencies: [Boolean(user)] }
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
      await api.post("/auth/continue", {
        email: email.trim(),
        password,
        ...(authMode === "register" && fullName.trim() ? { fullName: fullName.trim() } : {}),
      });
      await refreshSession();
      setPassword("");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Authentication failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  if (authLoading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center pt-28 text-xs uppercase tracking-[0.2em] text-[#1b1717]/60">
        Loading Account...
      </div>
    );
  }

  if (user) {
    return (
      <div ref={pageRef} className="w-full pt-28 pb-20 px-[3vw] lg:px-10 max-w-[1140px] mx-auto">
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
      className="w-full pt-[80px] sm:pt-28 pb-20 px-[10vw] sm:px-6 max-w-md mx-auto"
    >
      <div id="account-page-main-container" className="w-full">
        <h1 className="account-reveal account-page-heading heading-serif text-[8.5vw] sm:text-2xl lg:text-[28px] uppercase font-light leading-none text-center">
          My Divara Account
        </h1>

        <section className="account-reveal third-party-signin-section mt-[5vh] sm:mt-7">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="google-signin-btn flex items-center justify-center gap-2.5 text-[3vw] sm:text-xs uppercase font-semibold w-full h-[3rem] border-[1.5px] border-zinc-800 rounded-[3px] cursor-pointer hover:bg-zinc-50 transition-colors"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>
        </section>

        <span className="account-reveal block w-full text-center uppercase font-semibold text-[3.5vw] sm:text-xs my-[3vh] sm:my-5">
          or
        </span>

        <div className="account-reveal signin-heading-container">
          <h2 className="heading-serif text-[6vw] sm:text-lg lg:text-xl uppercase text-center signin-heading font-normal">
            Continue with your email address
          </h2>
          <p className="signin-subheading text-[4vw] sm:text-xs text-center mt-[4vh] sm:mt-3 text-zinc-600">
            {step === "email"
              ? "Sign in with your email and password or create a profile if you are new."
              : authMode === "register"
              ? "Create your DIVARA profile with a password (min. 8 characters)."
              : "Welcome back. Enter your password to sign in."}
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 border border-[#5d100a]/30 bg-[#5d100a]/5 text-[#5d100a] text-xs text-center">
            {errorMsg}
          </div>
        )}

        {step === "email" ? (
          <section className="account-reveal w-full py-[3vh] sm:py-5" id="auth-base-form-section">
            <form onSubmit={handleEmailSubmit} className="w-full">
              <InteractiveInput
                variant="account"
                label="Email*"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="form-btn-container w-full mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-[3rem] bg-[#1b1717] hover:bg-[#5d100a] transition-colors rounded-[3px] text-[#ffffff] text-[0.7rem] uppercase font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "checking..." : "continue"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="account-reveal w-full py-[3vh] sm:py-5">
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
                {submitting ? "please wait..." : authMode === "register" ? "create account" : "sign in"}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}