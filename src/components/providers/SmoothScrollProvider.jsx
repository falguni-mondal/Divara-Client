"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SmoothScrollContext = createContext({
  refreshScroll: () => {},
  stopScroll: () => {},
  startScroll: () => {},
  scrollTo: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

function isInsideScrollableContainer(node) {
  let el = node;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.hasAttribute?.("data-lenis-prevent")) return true;
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function ScrollRouteController({ lenisRef, nativeLockCountRef }) {
  const pathname = usePathname();
  const isPopStateRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const isShopRoute =
    pathname === "/collections" || pathname.startsWith("/shop/");
  const shouldEnableLenis = isDesktop || !isShopRoute;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prevRestoration = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = "manual";
    } catch {}

    const handlePopState = () => {
      isPopStateRef.current = true;
      window.__DIVARA_POPSTATE_AT__ = Date.now();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      try {
        window.history.scrollRestoration = prevRestoration || "auto";
      } catch {}
    };
  }, []);

  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;

    nativeLockCountRef.current = 0;
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    const recentPop =
      isPopStateRef.current ||
      (typeof window.__DIVARA_POPSTATE_AT__ === "number" &&
        Date.now() - window.__DIVARA_POPSTATE_AT__ < 2500);

    isPopStateRef.current = false;

    if (recentPop && pathname === "/collections") return;

    window.scrollTo(0, 0);
    if (lenisRef.current) {
      lenisRef.current.resize();
      lenisRef.current.scrollTo(0, { immediate: true, force: true });
    }
  }, [pathname, lenisRef, nativeLockCountRef]);

  useEffect(() => {
    if (typeof window === "undefined" || !shouldEnableLenis) {
      lenisRef.current = null;
      return;
    }

    const lenis = new Lenis({
      lerp: 0.09,
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.6,
      autoResize: true,
      prevent: isInsideScrollableContainer,
    });

    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const updateTicker = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      }, 120);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);
    window.addEventListener("load", handleResize);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      window.removeEventListener("load", handleResize);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [shouldEnableLenis, lenisRef]);

  return null;
}

export default function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null);
  const nativeLockCountRef = useRef(0);

  const refreshScroll = useCallback(() => {
    lenisRef.current?.resize();
    ScrollTrigger.refresh();
  }, []);

  const stopScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.stop();
      return;
    }
    if (typeof document !== "undefined") {
      nativeLockCountRef.current += 1;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
  }, []);

  const startScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.start();
      return;
    }
    if (typeof document !== "undefined") {
      nativeLockCountRef.current = Math.max(0, nativeLockCountRef.current - 1);
      if (nativeLockCountRef.current === 0) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    }
  }, []);

  const scrollTo = useCallback((target, options = {}) => {
    if (lenisRef.current) {
      if (options.immediate) lenisRef.current.resize();
      lenisRef.current.scrollTo(target, options);
      return;
    }
    if (typeof window === "undefined") return;

    const offset = Number(options.offset) || 0;
    let top = 0;

    if (typeof target === "number") {
      top = target + offset;
    } else if (typeof target === "string") {
      const el = document.querySelector(target);
      if (!el) return;
      top = el.getBoundingClientRect().top + window.scrollY + offset;
    } else if (target?.getBoundingClientRect) {
      top = target.getBoundingClientRect().top + window.scrollY + offset;
    } else {
      return;
    }

    window.scrollTo({
      top: Math.max(0, Math.round(top)),
      behavior: options.immediate ? "auto" : "smooth",
    });
  }, []);

  const contextValue = useMemo(
    () => ({ refreshScroll, stopScroll, startScroll, scrollTo }),
    [refreshScroll, stopScroll, startScroll, scrollTo]
  );

  return (
    <SmoothScrollContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <ScrollRouteController
          lenisRef={lenisRef}
          nativeLockCountRef={nativeLockCountRef}
        />
      </Suspense>
      {children}
    </SmoothScrollContext.Provider>
  );
}