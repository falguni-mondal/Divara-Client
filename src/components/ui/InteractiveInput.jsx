"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

export default function InteractiveInput({
  variant = "contact",
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
  const [caretIndex, setCaretIndex] = useState(String(value ?? "").length);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const mirrorTrackRef = useRef(null);
  const caretRef = useRef(null);
  const svgPathRef = useRef(null);
  const measurePrefixRef = useRef(null);
  const measureFullRef = useRef(null);
  const prevLenRef = useRef(String(value ?? "").length);

  const strValue = String(value ?? "");
  const displayChars = type === "password" ? "•".repeat(strValue.length) : strValue;
  const safeCaretIdx = Math.max(0, Math.min(displayChars.length, caretIndex));
  const prefixChars = displayChars.slice(0, safeCaretIdx);

  // Use text + inputMode="email" so browsers expose selectionStart on email fields
  const nativeType = type === "email" ? "text" : type;
  const nativeInputMode = type === "email" ? "email" : undefined;

  const pluckString = useCallback((normX = 50, intensity = 1) => {
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
  }, []);

  const getLiveCaretIndex = useCallback(() => {
    const el = inputRef.current;
    if (!el) return displayChars.length;
    try {
      if (typeof el.selectionStart === "number") {
        return Math.max(0, Math.min(displayChars.length, el.selectionStart));
      }
    } catch {
      // Fallback for input types without selectionStart
    }
    return displayChars.length;
  }, [displayChars.length]);

  const readNativeCaret = useCallback(() => {
    setCaretIndex(getLiveCaretIndex());
  }, [getLiveCaretIndex]);

  const syncCaretAndAnimateChar = useCallback(
    (isAddition = false, shouldPluck = false) => {
      if (as === "textarea") return;
      const trackEl = mirrorTrackRef.current;
      const caretEl = caretRef.current;
      const boxEl = wrapperRef.current;
      if (!trackEl || !caretEl || !boxEl) return;

      // Read live native caret directly (never stale closure state) so the JUST-TYPED character bounces
      const liveCaret = getLiveCaretIndex();

      // Update hidden prefix measurement span synchronously before measuring width
      if (measurePrefixRef.current) {
        measurePrefixRef.current.textContent = displayChars.slice(0, liveCaret);
      }

      const prefixWidth = measurePrefixRef.current ? measurePrefixRef.current.offsetWidth : 0;
      const fullWidth = measureFullRef.current ? measureFullRef.current.offsetWidth : 0;
      const boxWidth = Math.max(1, boxEl.clientWidth - 40);

      let scrollOffset = 0;
      if (fullWidth > boxWidth && prefixWidth > boxWidth) {
        scrollOffset = prefixWidth - boxWidth;
      }

      gsap.to(trackEl, {
        x: -scrollOffset,
        duration: 0.18,
        ease: "power3.out",
        overwrite: "auto",
      });

      const caretX = Math.max(0, Math.min(boxWidth, prefixWidth - scrollOffset));
      gsap.to(caretEl, {
        x: caretX,
        duration: 0.14,
        ease: "power3.out",
        overwrite: "auto",
      });

      if (shouldPluck) {
        gsap.fromTo(
          caretEl,
          { scaleY: 1.4 },
          { scaleY: 1, duration: 0.3, ease: "back.out(2.5)", overwrite: "auto" }
        );
        const normX = Math.max(10, Math.min(90, (caretX / boxWidth) * 100));
        pluckString(normX, isAddition ? 1.15 : 0.75);
      }

      const chars = trackEl.querySelectorAll(".k-char");
      const typedCharIdx = Math.min(chars.length - 1, Math.max(0, liveCaret - 1));
      const targetChar = chars[typedCharIdx];

      if (isAddition && targetChar) {
        gsap.fromTo(
          targetChar,
          { y: 10, rotateX: -70, scale: 0.75, opacity: 0, filter: "blur(3px)" },
          {
            y: 0,
            rotateX: 0,
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.36,
            ease: "expo.out",
            overwrite: "auto",
          }
        );
      }
    },
    [as, displayChars, getLiveCaretIndex, pluckString]
  );

  useEffect(() => {
    const nextLen = strValue.length;
    const isAddition = nextLen > prevLenRef.current;
    const changed = nextLen !== prevLenRef.current;
    prevLenRef.current = nextLen;

    if (as === "textarea") {
      if (changed && nextLen > 0) {
        const normX = 15 + ((nextLen * 7) % 70);
        pluckString(normX, isAddition ? 1 : 0.6);
      }
      return;
    }

    readNativeCaret();
    requestAnimationFrame(() => {
      syncCaretAndAnimateChar(isAddition, changed);
    });
  }, [strValue, as, readNativeCaret, syncCaretAndAnimateChar, pluckString]);

  useEffect(() => {
    if (as === "textarea") return;
    requestAnimationFrame(() => {
      syncCaretAndAnimateChar(false, false);
    });
  }, [safeCaretIdx, as, syncCaretAndAnimateChar]);

  const handleChange = (e) => {
    if (onChange) onChange(e);
    requestAnimationFrame(readNativeCaret);
  };

  const handleCursorEvent = () => {
    requestAnimationFrame(readNativeCaret);
  };

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

  const renderKineticMirror = (textClass, placeholderClass, caretColor) => (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center overflow-hidden"
    >
      <span
        ref={measurePrefixRef}
        className={`invisible fixed -top-[9999px] left-0 whitespace-pre ${textClass}`}
      >
        {prefixChars}
      </span>
      <span
        ref={measureFullRef}
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

        <span
          ref={caretRef}
          style={{ opacity: isFocused && !disabled ? 1 : 0 }}
          className={`absolute left-0 h-[1.15em] w-[1.5px] origin-center transition-opacity duration-150 ${caretColor}`}
        />
      </div>
    </div>
  );

  const commonInputEvents = {
    onChange: handleChange,
    onKeyDown: handleCursorEvent,
    onKeyUp: handleCursorEvent,
    onClick: handleCursorEvent,
    onSelect: handleCursorEvent,
    onFocus: () => {
      setIsFocused(true);
      handleCursorEvent();
    },
    onBlur: () => setIsFocused(false),
  };

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
            type={nativeType}
            inputMode={nativeInputMode}
            value={strValue}
            required={required}
            disabled={disabled}
            {...commonInputEvents}
            className={`relative z-10 w-full outline-0 border-0 text-[4.5vw] sm:text-xs bg-transparent text-transparent caret-transparent selection:bg-[#5d100a]/20 ${
              rightSlot ? "pr-10" : ""
            }`}
          />
        </div>

        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">{rightSlot}</div>
        )}

        {renderElasticString("#5d100a")}
      </div>
    );
  }

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
            type={nativeType}
            inputMode={nativeInputMode}
            value={strValue}
            required={required}
            aria-label={placeholder || "Email Address"}
            {...commonInputEvents}
            className="relative z-10 w-full bg-transparent text-[3.2vw] sm:text-xs tracking-wider text-transparent caret-transparent outline-none selection:bg-[#ffffff]/25"
          />
        </div>

        {rightSlot}
        {renderElasticString("#ffffff")}
      </div>
    );
  }

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
                type={nativeType}
                inputMode={nativeInputMode}
                required={required}
                disabled={disabled}
                value={strValue}
                {...commonInputEvents}
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