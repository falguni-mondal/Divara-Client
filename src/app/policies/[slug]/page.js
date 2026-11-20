"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

const POLICY_TABS = [
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "shipping-returns", label: "Shipping & Returns" },
  { slug: "terms-of-service", label: "Terms of Service" },
];

function PolicyContent() {
  const params = useParams();
  const slug = params?.slug;
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get(`/policies/${slug}`)
      .then(({ data }) => setPolicy(data.data?.policy || null))
      .catch(() => setPolicy(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[70vh] pt-36 sm:pt-44 text-center text-xs uppercase tracking-[0.22em] text-[#1b1717]/55">
        Loading Policy Document...
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-[70vh] pt-36 sm:pt-44 px-4 text-center">
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal">Policy Not Found</h1>
        <Link
          href="/"
          className="mt-6 inline-block px-7 py-3 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest transition-colors"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#ffffff] text-[#1b1717] pt-28 sm:pt-36 lg:pt-40 pb-24 lg:pb-32 px-[4vw] lg:px-10">
      <div className="max-w-4xl mx-auto">
        {/* Top Back Link & Policy Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-[#1b1717]/15">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#1b1717]/70 hover:text-[#5d100a] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            {POLICY_TABS.map((tab) => {
              const active = tab.slug === slug;
              return (
                <Link
                  key={tab.slug}
                  href={`/policies/${tab.slug}`}
                  className={`px-3.5 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] border transition-colors ${
                    active
                      ? "bg-[#1b1717] border-[#1b1717] text-[#ffffff]"
                      : "border-[#1b1717]/20 text-[#1b1717]/75 hover:border-[#5d100a] hover:text-[#5d100a]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Policy Header */}
        <header className="mt-10 sm:mt-14">
          <span className="text-[11px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            DIVARA Legal &amp; Client Care • Effective {policy.effectiveDate}
          </span>
          <h1 className="heading-serif text-3xl sm:text-4xl lg:text-[42px] font-normal mt-3 tracking-tight">
            {policy.title}
          </h1>
          {policy.summary && (
            <p className="mt-4 text-sm sm:text-base text-[#1b1717]/70 font-light leading-relaxed max-w-3xl">
              {policy.summary}
            </p>
          )}
        </header>

        {/* Detailed Sections */}
        <div className="mt-12 sm:mt-16 space-y-10 border-t border-[#1b1717]/15 pt-10 sm:pt-12">
          {(policy.sections || []).map((sec) => (
            <section key={sec.heading} className="space-y-3">
              <h2 className="heading-serif text-xl sm:text-2xl font-normal text-[#1b1717]">
                {sec.heading}
              </h2>
              <p className="text-sm sm:text-[15px] font-light leading-[1.85] text-[#1b1717]/80">
                {sec.body}
              </p>
            </section>
          ))}
        </div>

        {/* Client Support Footer Note */}
        <div className="mt-16 pt-8 border-t border-[#1b1717]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#1b1717]/70">
          <p>
            Questions regarding this policy? Reach our Kolkata atelier at{" "}
            <span className="font-medium text-[#1b1717]">support@divara.byfalguni.com</span> or{" "}
            <span className="font-medium text-[#1b1717]">+91 (033) 2284-9100</span>.
          </p>
          <Link
            href="/contact"
            className="shrink-0 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#5d100a] hover:text-[#1b1717] transition-colors"
          >
            Contact Client Support →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PolicyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#ffffff]" />}>
      <PolicyContent />
    </Suspense>
  );
}