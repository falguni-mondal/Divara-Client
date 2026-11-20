"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

/**
 * Awwwards-Level Kinetic Input Engine (Preserves 100% Original Input UI)
 *
 * Keeps the exact original visual layout for:
 * - "contact": Standard bordered input / textarea on Contact Us page
 * - "account": Compact 3rem floating-label box (Email* / Password*) on Account page
 * - "footer":  Minimal bottom-border newsletter input with inline Join button in Footer
 *
 * Awwwards Typing Micro-Interactions (Zero UI Clutter):
 * 1. 3D Silk-Ink Character Reveal & Neighbour Kerning Wave: Each typed character
 *    unfolds in 3D (y, rotateX, blur -> crisp) while rippling adjacent characters.
 * 2. Spring-Inertia Gliding Caret: A custom 1.5px caret glides smoothly with
 *    spring physics (`gsap.quickTo`) instead of snapping like a native caret.
 * 3. Elastic SVG Plucked-String Baseline: Every keystroke plucks an SVG Bezier
 *    string along the bottom border at the exact caret X coordinate, vibrating
 *    with `elastic.out(1.35, 0.22)` physics.
 */
export default function InteractiveInput({
  variant = "contact", // "contact" | "account" | "footer"
  as = "input",
  type = "text",
  label = "",
  value = "",
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  rows = 5,
  rightSlot = null,
  className = "",
}) {
  const [isFocused, setIsFocused] = useState(false);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const mirrorTrackRef = useRef(null);
  const caretRef = useRef(null);
  const svgPathRef = useRef(null);
  const measureSpanRef = useRef(null);
  const prevLenRef = useRef(String(value).length);

  const strValue = String(value ?? "");
  const displayChars =
    type === "password" ? "•".repeat(strValue.length) : strValue;

  // Pluck the bottom SVG Bezier string at normalized X (0..100)
  const pluckString = useCallback(
    (normX = 50, intensity = 1) => {
      if (!svgPathRef.current) return;
      const clampedX = Math.max(8, Math.min(92, normX));
      const peakY = 10 + Math.min(9, 5.5 * intensity);

      const proxy = { y: peakY, x: clampedX };
      gsap.killTweensOf(proxy);

      gsap.to(proxy, {
        y: 10,
        duration: 0.85,
        ease: "elastic.out(1.35, 0.22)",
        onUpdate: () => {
          if (svgPathRef.current) {
            svgPathRef.current.setAttribute(
              "d",
              `M 0 10 Q ${proxy.x.toFixed(1)} ${proxy.y.toFixed(2)} 100 10`
            );
          }
        },
      });
    },
    []
  );

  // Update spring-gliding caret position & trigger character wave
  const syncCaretAndAnimateChar = useCallback(
    (isAddition = false) => {
      if (as === "textarea") return;
      const trackEl = mirrorTrackRef.current;
      const caretEl = caretRef.current;
      const boxEl = wrapperRef.current;
      if (!trackEl || !caretEl || !boxEl) return;

      const chars = trackEl.querySelectorAll(".k-char");
      const lastCharEl = chars.length > 0 ? chars[chars.length - 1] : null;

      // Measure width of text to position gliding caret
      const textWidth = measureSpanRef.current
        ? measureSpanRef.current.offsetWidth
        : 0;
      const boxWidth = Math.max(1, boxEl.clientWidth - 36);

      // Horizontal auto-scroll if text exceeds visible input width
      const overflowX = Math.max(0, textWidth - boxWidth);
      gsap.to(trackEl, {
        x: -overflowX,
        duration: 0.22,
        ease: "power3.out",
        overwrite: "auto",
      });

      const caretX = Math.min(boxWidth, textWidth);
      gsap.to(caretEl, {
        x: caretX,
        duration: 0.22,
        ease: "power3.out",
        overwrite: "auto",
      });

      // Elastic vertical stretch on caret during typing
      gsap.fromTo(
        caretEl,
        { scaleY: 1.45 },
        {
          scaleY: 1,
          duration: 0.35,
          ease: "back.out(2.5)",
          overwrite: "auto",
        }
      );

      // Pluck SVG string at caret X %
      const normX = Math.max(10, Math.min(90, (caretX / boxWidth) * 100));
      pluckString(normX, isAddition ? 1.15 : 0.75);

      // 3D Silk-Ink Reveal on newly typed character + micro-wave on preceding 3 chars
      if (isAddition && lastCharEl) {
        gsap.fromTo(
          lastCharEl,
          {
            y: 11,
            rotateX: -70,
            scale: 0.72,
            opacity: 0,
            filter: "blur(3px)",
          },
          {
            y: 0,
            rotateX: 0,
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.38,
            ease: "expo.out",
            overwrite: "auto",
          }
        );

        // Subtle wave on neighboring 3 characters
        const neighborCount = Math.min(3, chars.length - 1);
        for (let i = 1; i <= neighborCount; i++) {
          const neighbor = chars[chars.length - 1 - i];
          if (neighbor) {
            gsap.fromTo(
              neighbor,
              { y: -2.5 * (1 - i * 0.25) },
              {
                y: 0,
                duration: 0.42,
                delay: i * 0.025,
                ease: "elastic.out(1.2, 0.4)",
                overwrite: "auto",
              }
            );
          }
        }
      }
    },
    [as, pluckString]
  );

  useEffect(() => {
    const nextLen = strValue.length;
    const isAddition = nextLen > prevLenRef.current;
    prevLenRef.current = nextLen;

    if (as === "textarea") {
      if (nextLen > 0) {
        const normX = 15 + ((nextLen * 7) % 70);
        pluckString(normX, isAddition ? 1 : 0.6);
      }
      return;
    }

    requestAnimationFrame(() => {
      syncCaretAndAnimateChar(isAddition);
    });
  }, [strValue, as, syncCaretAndAnimateChar, pluckString]);

  const handleChange = (e) => {
    if (onChange) onChange(e);
  };

  // Elastic SVG Baseline String Overlay
  const renderElasticString = (strokeColor) => (
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-[10px] left-0 w-full h-[20px] overflow-visible z-20"
    >
      <path
        ref={svgPathRef}
        d="M 0 10 Q 50 10 100 10"
        fill="none"
        stroke={strokeColor}
        strokeWidth={isFocused ? "1.8" : "0"}
        vectorEffect="non-scaling-stroke"
        className="transition-opacity duration-300"
      />
    </svg>
  );

  // Kinetic Mirror + Gliding Caret Layer for single-line inputs
  const renderKineticMirror = (textClass, placeholderClass, caretColor) => (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center overflow-hidden"
    >
      {/* Hidden span for exact pixel width measurement */}
      <span
        ref={measureSpanRef}
        className={`invisible fixed -top-[9999px] left-0 whitespace-pre ${textClass}`}
      >
        {displayChars}
      </span>

      <div className="relative flex-1 flex items-center overflow-hidden h-full">
        {strValue.length === 0 && placeholder && (
          <span className={`truncate select-none ${placeholderClass}`}>
            {placeholder}
          </span>
        )}

        <div
          ref={mirrorTrackRef}
          style={{ perspective: "400px" }}
          className={`flex items-center whitespace-pre will-change-transform ${textClass}`}
        >
          {Array.from(displayChars).map((ch, idx) => (
            <span
              key={`${idx}-${ch}`}
              className="k-char inline-block origin-bottom will-change-transform"
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </div>

        {/* Spring-Physics Gliding Caret */}
        <span
          ref={caretRef}
          style={{ opacity: isFocused && !disabled ? 1 : 0 }}
          className={`absolute left-0 h-[1.15em] w-[1.5px] origin-center transition-opacity duration-150 ${caretColor}`}
        />
      </div>
    </div>
  );

  // 1. ACCOUNT PAGE ORIGINAL UI VARIANT
  if (variant === "account") {
    return (
      <div
        ref={wrapperRef}
        className={`auth-form-input-container w-full h-[3rem] flex flex-col justify-center border border-zinc-400 focus-within:border-[#5d100a] px-2.5 py-1 rounded-[3px] relative transition-colors ${
          disabled ? "text-zinc-600" : ""
        } ${className}`}
      >
        {label && (
          <label className="text-[2.8vw] sm:text-[10px] text-zinc-500 relative z-10">
            {label}
          </label>
        )}

        <div className="relative w-full h-[1.35rem] flex items-center">
          {renderKineticMirror(
            `text-[4.5vw] sm:text-xs ${disabled ? "text-zinc-600" : "text-[#1b1717]"}`,
            "text-[4.5vw] sm:text-xs text-zinc-400",
            "bg-[#5d100a]"
          )}

          <input
            ref={inputRef}
            type={type}
            value={strValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            required={required}
            disabled={disabled}
            className={`relative z-10 w-full outline-0 border-0 text-[4.5vw] sm:text-xs bg-transparent text-transparent caret-transparent selection:bg-[#5d100a]/20 ${
              rightSlot ? "pr-10" : ""
            }`}
          />
        </div>

        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {rightSlot}
          </div>
        )}

        {renderElasticString("#5d100a")}
      </div>
    );
  }

  // 2. FOOTER NEWSLETTER ORIGINAL UI VARIANT
  if (variant === "footer") {
    return (
      <div
        ref={wrapperRef}
        className={`relative flex w-full max-w-sm border-b border-[#ffffff]/35 pb-2 focus-within:border-[#ffffff] transition-colors ${className}`}
      >
        <div className="relative flex-1 flex items-center">
          {renderKineticMirror(
            "text-[3.2vw] sm:text-xs tracking-wider text-[#ffffff]",
            "text-[3.2vw] sm:text-xs tracking-wider text-[#ffffff]/45",
            "bg-[#ffffff]"
          )}

          <input
            ref={inputRef}
            type={type}
            value={strValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            required={required}
            aria-label={placeholder || "Email Address"}
            className="relative z-10 w-full bg-transparent text-[3.2vw] sm:text-xs tracking-wider text-transparent caret-transparent outline-none selection:bg-[#ffffff]/25"
          />
        </div>

        {rightSlot}
        {renderElasticString("#ffffff")}
      </div>
    );
  }

  // 3. CONTACT PAGE ORIGINAL UI VARIANT (Default: input or textarea)
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[11px] uppercase tracking-widest text-[#1b1717]/70 mb-2">
          {label}
        </label>
      )}

      <div
        ref={wrapperRef}
        className="relative w-full border border-[#1b1717]/25 focus-within:border-[#5d100a] transition-colors"
      >
        {as === "textarea" ? (
          <textarea
            ref={inputRef}
            rows={rows}
            required={required}
            disabled={disabled}
            value={strValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-transparent text-[#1b1717] placeholder-[#1b1717]/40 outline-none resize-none"
          />
        ) : (
          <div className="relative w-full flex items-center px-3.5 py-2.5">
            <div className="relative w-full flex items-center min-h-[1.25rem]">
              {renderKineticMirror(
                "text-xs sm:text-sm text-[#1b1717]",
                "text-xs sm:text-sm text-[#1b1717]/40",
                "bg-[#5d100a]"
              )}

              <input
                ref={inputRef}
                type={type}
                required={required}
                disabled={disabled}
                value={strValue}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="relative z-10 w-full bg-transparent text-xs sm:text-sm text-transparent caret-transparent outline-none selection:bg-[#5d100a]/20"
              />
            </div>
          </div>
        )}

        {renderElasticString("#5d100a")}
      </div>
    </div>
  );
}