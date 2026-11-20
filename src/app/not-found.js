import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] bg-[#ffffff] text-[#1b1717] pt-36 pb-24 px-6 flex flex-col items-center justify-center text-center">
      <span className="text-[11px] uppercase tracking-[0.24em] text-[#5d100a] font-semibold">
        404 • Page Not Found
      </span>
      <h1 className="heading-serif text-3xl sm:text-4xl font-normal mt-2">
        This Page Could Not Be Found
      </h1>
      <p className="mt-3 text-xs sm:text-sm text-[#1b1717]/65 max-w-md">
        The link may be outdated or the page may have moved. Explore our latest seasonal weaves below.
      </p>
      <Link
        href="/collections"
        className="mt-7 px-7 py-3 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest transition-colors"
      >
        Explore Collection
      </Link>
    </div>
  );
}