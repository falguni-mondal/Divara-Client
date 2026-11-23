"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Lock, ShieldCheck } from "lucide-react";
import { useActivity } from "@/context/ActivityContext";

function ConsentToggle({ checked, disabled = false, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (!disabled && onChange) onChange(!checked);
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
        disabled
          ? "bg-[#5d100a]/65 cursor-not-allowed"
          : checked
          ? "bg-[#5d100a] cursor-pointer"
          : "bg-[#1b1717]/25 cursor-pointer"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#ffffff] transition-transform duration-200 ${
          checked ? "translate-x-4.5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function PrivacyConsentBanner() {
  const {
    consent,
    consentLoaded,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
    acceptAllConsent,
    saveConsentPreferences,
  } = useActivity();

  // Optional toggles strictly default to OFF (DPDP Act & GDPR compliant)
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [personalizationOn, setPersonalizationOn] = useState(false);
  const [entered, setEntered] = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    if (isPreferencesOpen) {
      setAnalyticsOn(Boolean(consent.analytics));
      setPersonalizationOn(Boolean(consent.personalization));
    }
  }, [isPreferencesOpen, consent.analytics, consent.personalization]);

  // Smooth slide/fade animation whenever switching between banner and choices popup
  useEffect(() => {
    setEntered(false);
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [isPreferencesOpen, consent.decided]);

  // Clicking outside the "Make Choices" popup (or pressing Escape) closes it
  // and returns to the 1st dialogue in the exact same bottom-right spot if undecided
  useEffect(() => {
    if (!isPreferencesOpen) return;

    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closePreferences();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closePreferences();
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick, { passive: true });
      window.addEventListener("keydown", handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPreferencesOpen, closePreferences]);

  if (!consentLoaded) return null;

  const showBanner = !consent.decided && !isPreferencesOpen;
  if (!showBanner && !isPreferencesOpen) return null;

  return (
    <div
      ref={panelRef}
      data-lenis-prevent
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[390px] z-[1100] transition-all duration-300 ease-out ${
        entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.98]"
      }`}
    >
      {showBanner ? (
        /* Layer 1: Compact Bottom-Right 2-Button Banner */
        <div
          role="dialog"
          aria-label="Cookie and privacy consent"
          className="bg-[#1b1717] text-[#ffffff] border border-[#ffffff]/15 shadow-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#ffffff]/80 shrink-0" />
            <p className="heading-serif text-sm tracking-wide">
              Your Privacy at Divara
            </p>
          </div>
          <p className="text-xs font-light text-[#ffffff]/75 leading-relaxed mb-4">
            We use essential cookies for your bag and checkout, plus optional analytics and
            personalization to refine your atelier experience.{" "}
            <Link
              href="/policies/privacy-policy"
              className="underline text-[#ffffff] hover:text-[#ffffff]/80"
            >
              Privacy Policy
            </Link>
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={openPreferences}
              className="py-2.5 px-3 text-[11px] uppercase tracking-[0.15em] font-medium border border-[#ffffff]/55 text-[#ffffff] hover:border-[#ffffff] hover:bg-[#ffffff]/10 transition-colors cursor-pointer text-center"
            >
              Make Choices
            </button>
            <button
              type="button"
              onClick={acceptAllConsent}
              className="py-2.5 px-3 text-[11px] uppercase tracking-[0.15em] font-semibold bg-[#5d100a] text-[#ffffff] border border-[#5d100a] hover:bg-[#ffffff] hover:text-[#1b1717] hover:border-[#ffffff] transition-colors cursor-pointer text-center"
            >
              Accept All
            </button>
          </div>
        </div>
      ) : (
        /* Layer 2: Compact Bottom-Right Animated Choices Popup */
        <div
          role="dialog"
          aria-label="Manage cookie preferences"
          className="bg-[#ffffff] text-[#1b1717] border border-[#1b1717]/20 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1b1717]/12 bg-[#faf8f6]">
            <div>
              <h2 className="heading-serif text-sm font-normal tracking-wide">
                Privacy Choices
              </h2>
              <p className="text-[10.5px] text-[#1b1717]/60">
                Select optional categories below.
              </p>
            </div>
            <button
              type="button"
              onClick={closePreferences}
              aria-label="Close privacy choices"
              className="p-1 text-[#1b1717]/60 hover:text-[#1b1717] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2.5 max-h-[55vh] overflow-y-auto">
            {/* Strictly Necessary — Locked ON */}
            <div className="p-3 bg-[#faf8f6] border border-[#1b1717]/12">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Lock className="w-3 h-3 text-[#5d100a] shrink-0" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#1b1717] truncate">
                    Strictly Necessary
                  </span>
                  <span className="px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider bg-[#1b1717]/10 text-[#1b1717]/75 font-semibold shrink-0">
                    Always On
                  </span>
                </div>
                <ConsentToggle
                  checked={true}
                  disabled={true}
                  label="Strictly necessary cookies (always active)"
                />
              </div>
              <p className="mt-1.5 text-[11px] font-light text-[#1b1717]/65 leading-snug">
                Sign-in security, shopping bag, checkout payments, and fraud protection.
              </p>
            </div>

            {/* Analytics & Performance — Default OFF */}
            <div className="p-3 border border-[#1b1717]/12">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#1b1717]">
                  Analytics &amp; Performance
                </span>
                <ConsentToggle
                  checked={analyticsOn}
                  onChange={setAnalyticsOn}
                  label="Toggle analytics and performance cookies"
                />
              </div>
              <p className="mt-1.5 text-[11px] font-light text-[#1b1717]/65 leading-snug">
                Measures collection interest, site speed, and returning device recognition.
              </p>
            </div>

            {/* Personalization — Default OFF */}
            <div className="p-3 border border-[#1b1717]/12">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#1b1717]">
                  Personalization
                </span>
                <ConsentToggle
                  checked={personalizationOn}
                  onChange={setPersonalizationOn}
                  label="Toggle personalization cookies"
                />
              </div>
              <p className="mt-1.5 text-[11px] font-light text-[#1b1717]/65 leading-snug">
                Remembers preferred fabrics, colors, and sizes for tailored recommendations.
              </p>
            </div>
          </div>

          <div className="px-4 py-3 bg-[#faf8f6] border-t border-[#1b1717]/12 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                saveConsentPreferences({
                  analytics: analyticsOn,
                  personalization: personalizationOn,
                })
              }
              className="py-2 px-3 text-[10.5px] uppercase tracking-[0.14em] font-medium border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer text-center"
            >
              Save Choices
            </button>
            <button
              type="button"
              onClick={acceptAllConsent}
              className="py-2 px-3 text-[10.5px] uppercase tracking-[0.14em] font-semibold bg-[#5d100a] text-[#ffffff] border border-[#5d100a] hover:bg-[#1b1717] hover:border-[#1b1717] transition-colors cursor-pointer text-center"
            >
              Accept All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}