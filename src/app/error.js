"use client";

import React from "react";
import Link from "next/link";

export default function GlobalError({ reset }) {
  return (
    <div className="min-h-[75vh] bg-[#ffffff] text-[#1b1717] pt-36 pb-24 px-6 flex flex-col items-center justify-center text-center">
      <span className="text-[11px] uppercase tracking-[0.24em] text-[#5d100a] font-semibold">
        Temporary Interruption
      </span>
      <h1 className="heading-serif text-3xl sm:text-4xl font-normal mt-2">
        Something Went Wrong
      </h1>
      <p className="mt-3 text-xs sm:text-sm text-[#1b1717]/65 max-w-md">
        We encountered an unexpected issue loading this view. Please try again or return to the homepage.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-3 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest transition-colors cursor-pointer"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-xs uppercase tracking-widest transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}