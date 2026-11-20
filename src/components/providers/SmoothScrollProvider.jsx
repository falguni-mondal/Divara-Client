"use client";

import React, {
  createContext,
  useContext,
  useEffect,
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

const SmoothScrollContext = createContext({
  lenis: null,
  refreshScroll: () => {},
  stopScroll: () => {},
  startScroll: () => {},
  scrollTo: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

/**
 * Isolated inside <Suspense> so `usePathname()` never blocks Next.js 16 prerendering.
 */
function RouteChangeScrollReset({ lenisRef }) {
  const pathname = usePathname();

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
      const timer = setTimeout(() => {
        lenisRef.current?.resize();
        ScrollTrigger.refresh();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pathname, lenisRef]);

  return null;
}

export default function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null);
  const [lenisInstance, setLenisInstance] = useState(null);

  const refreshScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.resize();
    }
    ScrollTrigger.refresh();
  }, []);

  const stopScroll = useCallback(() => {
    lenisRef.current?.stop();
  }, []);

  const startScroll = useCallback(() => {
    lenisRef.current?.start();
  }, []);

  const scrollTo = useCallback((target, options = {}) => {
    lenisRef.current?.scrollTo(target, options);
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.09,
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.6,
      autoResize: true,
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    // Synchronize Lenis scroll events with GSAP ScrollTrigger
    // and apply dynamic vertical velocity shift on elements with [data-velocity]
    let velocityResetTimer = null;
    lenis.on("scroll", (e) => {
      ScrollTrigger.update();

      const velocityNodes = document.querySelectorAll("[data-velocity]");
      if (velocityNodes.length > 0) {
        const clampedVelocity = Math.max(-35, Math.min(35, e.velocity * 1.8));
        velocityNodes.forEach((node) => {
          const factor = parseFloat(node.getAttribute("data-velocity") || "1");
          gsap.to(node, {
            y: clampedVelocity * factor,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto",
          });
        });

        if (velocityResetTimer) clearTimeout(velocityResetTimer);
        velocityResetTimer = setTimeout(() => {
          velocityNodes.forEach((node) => {
            gsap.to(node, {
              y: 0,
              duration: 0.6,
              ease: "power3.out",
              overwrite: "auto",
            });
          });
        }, 90);
      }
    });

    // Drive Lenis from GSAP's ticker so both share the exact same RAF loop
    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Debounced resize & ScrollTrigger refresh to prevent the "stuck scroll on increasing page height" bug
    let resizeTimer = null;
    const handleHeightChange = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      }, 120);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleHeightChange();
    });

    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    // Listen for late-loading images or videos that expand layout height after initial mount
    const handleMediaLoad = (e) => {
      if (
        e.target &&
        (e.target.tagName === "IMG" || e.target.tagName === "VIDEO")
      ) {
        handleHeightChange();
      }
    };
    window.addEventListener("load", handleHeightChange);
    document.addEventListener("load", handleMediaLoad, true);
    document.addEventListener("loadedmetadata", handleMediaLoad, true);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (velocityResetTimer) clearTimeout(velocityResetTimer);
      resizeObserver.disconnect();
      window.removeEventListener("load", handleHeightChange);
      document.removeEventListener("load", handleMediaLoad, true);
      document.removeEventListener("loadedmetadata", handleMediaLoad, true);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
      setLenisInstance(null);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      lenis: lenisInstance,
      refreshScroll,
      stopScroll,
      startScroll,
      scrollTo,
    }),
    [lenisInstance, refreshScroll, stopScroll, startScroll, scrollTo]
  );

  return (
    <SmoothScrollContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <RouteChangeScrollReset lenisRef={lenisRef} />
      </Suspense>
      {children}
    </SmoothScrollContext.Provider>
  );
}