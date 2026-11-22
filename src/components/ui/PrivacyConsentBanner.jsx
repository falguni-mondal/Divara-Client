"use client";

import React from "react";
import Link from "next/link";
import { useActivity } from "@/context/ActivityContext";

export default function PrivacyConsentBanner() {
  const { consentStatus, acceptConsent, essentialOnlyConsent } = useActivity();

  if (consentStatus !== "unset") return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy and cookie preferences"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#1b1717] text-[#ffffff] border border-[#ffffff]/15 shadow-2xl p-5"
    >
      <p className="heading-serif text-sm tracking-wide mb-1.5">
        Your Privacy at Divara
      </p>
      <p className="text-xs font-light text-[#ffffff]/75 leading-relaxed mb-4">
        We use cookies and device recognition to personalize your atelier experience,
        keep your bag synced, and protect your account.{" "}
        <Link
          href="/policies/privacy-policy"
          className="underline text-[#ffffff] hover:text-[#ffffff]/80"
        >
          Privacy Policy
        </Link>
      </p>
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={essentialOnlyConsent}
          className="px-3.5 py-2 text-[11px] uppercase tracking-[0.16em] border border-[#ffffff]/30 text-[#ffffff]/85 hover:border-[#ffffff] hover:text-[#ffffff] transition-colors cursor-pointer"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={acceptConsent}
          className="px-4 py-2 text-[11px] uppercase tracking-[0.16em] bg-[#5d100a] text-[#ffffff] border border-[#5d100a] hover:bg-[#ffffff] hover:text-[#1b1717] hover:border-[#ffffff] transition-colors cursor-pointer"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}