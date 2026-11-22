"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const trickleRef = useRef(null);
  const finishRef = useRef(null);
  const safetyRef = useRef(null);

  const clearTimers = () => {
    if (trickleRef.current) clearInterval(trickleRef.current);
    if (finishRef.current) clearTimeout(finishRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
  };

  useEffect(() => {
    clearTimers();
    if (visible) {
      setProgress(100);
      finishRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 220);
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const startBar = () => {
      clearTimers();
      setVisible(true);
      setProgress(18);

      trickleRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 86) return prev;
          return prev + Math.max(2, (88 - prev) * 0.14);
        });
      }, 180);

      safetyRef.current = setTimeout(() => {
        clearTimers();
        setVisible(false);
        setProgress(0);
      }, 8000);
    };

    const handleClick = (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = e.target?.closest?.("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      try {
        const nextUrl = new URL(href, window.location.origin);
        if (nextUrl.origin !== window.location.origin) return;

        const currentFull = `${window.location.pathname}${window.location.search}`;
        const nextFull = `${nextUrl.pathname}${nextUrl.search}`;
        if (currentFull === nextFull) return;
        startBar();
      } catch {
        // Ignore malformed href
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimers();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-[#5d100a] transition-[width,opacity] duration-200 ease-out shadow-[0_0_8px_rgba(93,16,10,0.45)]"
        style={{ width: `${Math.min(100, progress)}%` }}
      />
    </div>
  );
}