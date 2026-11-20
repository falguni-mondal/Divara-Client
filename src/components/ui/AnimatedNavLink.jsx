"use client";

import React from "react";
import Link from "next/link";

export default function AnimatedNavLink({
  href = "/",
  label = "",
  onClick,
  className = "",
  active = false,
  underlineColor = "bg-current",
}) {
  const characters = Array.from(label);
  const isExternal = /^https?:\/\//i.test(href);

  const innerContent = (
    <>
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
              <span
                style={delayStyle}
                className="inline-block translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full"
              >
                {displayChar}
              </span>
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

      <span
        className={`mt-0.5 h-[1px] w-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${underlineColor} ${
          active ? "scale-x-100 origin-left" : "scale-x-0 origin-right"
        }`}
      />
    </>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={`group relative inline-flex flex-col items-start py-1 select-none ${className}`}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative inline-flex flex-col items-start py-1 select-none ${className}`}
    >
      {innerContent}
    </Link>
  );
}