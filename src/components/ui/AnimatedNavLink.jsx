"use client";

import React from "react";
import Link from "next/link";

/**
 * Classic Luxury NavLink Micro-Interaction:
 * 1. Character-by-character overflow slide-up with staggered cubic-bezier delay on hover.
 * 2. Sleek 1px animated underline shown ONLY when `active` is true (no underline on hover).
 */
export default function AnimatedNavLink({
  href = "/",
  label = "",
  onClick,
  className = "",
  active = false,
  underlineColor = "bg-current",
}) {
  const characters = Array.from(label);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative inline-flex flex-col items-start py-1 select-none ${className}`}
    >
      <span
        className="relative inline-flex overflow-hidden leading-[1.15]"
        aria-label={label}
      >
        {characters.map((char, index) => {
          const displayChar = char === " " ? "\u00A0" : char;
          const delayStyle = { transitionDelay: `${index * 18}ms` };

          return (
            <span
              key={`${char}-${index}`}
              className="relative inline-block overflow-hidden"
            >
              {/* Primary Character */}
              <span
                style={delayStyle}
                className="inline-block translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full"
              >
                {displayChar}
              </span>
              {/* Duplicate Overflow Character */}
              <span
                style={delayStyle}
                aria-hidden="true"
                className="absolute inset-0 inline-block translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0"
              >
                {displayChar}
              </span>
            </span>
          );
        })}
      </span>

      {/* Animated 1px Underline strictly for Active state (no underline on hover) */}
      <span
        className={`mt-0.5 h-[1px] w-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${underlineColor} ${
          active ? "scale-x-100 origin-left" : "scale-x-0 origin-right"
        }`}
      />
    </Link>
  );
}