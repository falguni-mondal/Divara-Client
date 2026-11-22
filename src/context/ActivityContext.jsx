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
import { usePathname } from "next/navigation";
import { api, API_BASE_URL } from "@/lib/api";
import {
  collectTier1Signals,
  detectBrowserFamily,
  detectDeviceType,
  getCachedDeviceId,
  getOrCreateSessionId,
  persistDeviceId,
  readPersistentDeviceId,
} from "@/lib/deviceFingerprint";

const CONSENT_STORAGE_KEY = "divara:privacy_consent:v1";
const IDLE_TIMEOUT_MS = 45 * 1000; // Pause stopwatch after 45s of zero interaction
const BATCH_FLUSH_MS = 5 * 1000;
const DWELL_CHECKPOINT_MS = 30 * 1000;

const ActivityContext = createContext({
  deviceId: "",
  visitorCode: "",
  consentStatus: "loading",
  acceptConsent: () => {},
  essentialOnlyConsent: () => {},
  trackAction: () => {},
  trackProductView: () => {},
  trackCartSnapshot: () => {},
});

export const useActivity = () => useContext(ActivityContext);

function makeId(prefix = "pv") {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolvePageName(pathname) {
  if (!pathname || pathname === "/") return "Home";
  if (pathname === "/collections") return "Collections";
  if (pathname.startsWith("/shop/")) return "Product Detail";
  if (pathname === "/checkout") return "Checkout";
  if (pathname === "/account") return "Account & Sign In";
  if (pathname === "/craftsmanship") return "Craftsmanship";
  if (pathname === "/contact") return "Contact";
  if (pathname.startsWith("/policies/")) return "Policy Page";
  return pathname.replace(/^\//, "").replace(/-/g, " ");
}

function sendBeaconBatch(payload) {
  if (typeof window === "undefined") return;
  const url = `${API_BASE_URL}/activity/batch`;
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // Fall through to fetch keepalive
  }

  try {
    fetch(url, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
    }).catch(() => {});
  } catch {
    // Ignore exit network errors
  }
}

// Isolated inside <Suspense> so usePathname() never blocks Next.js 16.4 prerendering
function RouteActivityWatcher({ onRouteChange }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    onRouteChange(pathname);
  }, [pathname, onRouteChange]);

  return null;
}

export function ActivityProvider({ children }) {
  const [consentStatus, setConsentStatus] = useState("loading");
  const [deviceId, setDeviceId] = useState("");
  const [visitorCode, setVisitorCode] = useState("");

  const deviceIdRef = useRef("");
  const consentRef = useRef("loading");
  const identifyingRef = useRef(null);
  const queueRef = useRef([]);

  // Active-only dwell stopwatch state
  const currentPathRef = useRef("");
  const currentPageViewIdRef = useRef("");
  const activeStartMsRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const lastInteractionMsRef = useRef(0);
  const isIdleRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (saved === "accepted" || saved === "essential") {
        consentRef.current = saved;
        setConsentStatus(saved);
      } else {
        consentRef.current = "unset";
        setConsentStatus("unset");
      }
    } catch {
      consentRef.current = "unset";
      setConsentStatus("unset");
    }
  }, []);

  const ensureIdentified = useCallback(async () => {
    if (typeof window === "undefined") return "";
    if (consentRef.current !== "accepted") return "";

    // If cookies/localStorage were cleared mid-session, re-run identification
    const storedLs = getCachedDeviceId();
    if (deviceIdRef.current && storedLs === deviceIdRef.current) {
      return deviceIdRef.current;
    }

    if (identifyingRef.current) return identifyingRef.current;

    identifyingRef.current = (async () => {
      try {
        const storedDeviceId = await readPersistentDeviceId();
        const sessionId = getOrCreateSessionId();
        const signals = await collectTier1Signals();

        const { data } = await api.post("/activity/identify", {
          storedDeviceId,
          sessionId,
          signals,
          deviceType: detectDeviceType(),
          browserFamily: detectBrowserFamily(),
        });

        const resolvedId = data?.data?.deviceId || "";
        const resolvedCode = data?.data?.visitorCode || "";
        if (resolvedId) {
          persistDeviceId(resolvedId);
          deviceIdRef.current = resolvedId;
          setDeviceId(resolvedId);
          setVisitorCode(resolvedCode);
        }
        return resolvedId;
      } catch {
        return deviceIdRef.current || "";
      } finally {
        identifyingRef.current = null;
      }
    })();

    return identifyingRef.current;
  }, []);

  const pauseStopwatch = useCallback(() => {
    if (activeStartMsRef.current > 0) {
      accumulatedMsRef.current += Math.max(0, Date.now() - activeStartMsRef.current);
      activeStartMsRef.current = 0;
    }
  }, []);

  const resumeStopwatch = useCallback(() => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      !isIdleRef.current &&
      currentPageViewIdRef.current &&
      activeStartMsRef.current === 0
    ) {
      activeStartMsRef.current = Date.now();
    }
  }, []);

  const takePendingDwellEvent = useCallback(() => {
    const wasRunning = activeStartMsRef.current > 0;
    pauseStopwatch();
    const deltaSec = Math.floor(accumulatedMsRef.current / 1000);
    if (deltaSec > 0 && currentPageViewIdRef.current) {
      accumulatedMsRef.current -= deltaSec * 1000;
      if (wasRunning) resumeStopwatch();
      return {
        type: "PAGE_DURATION",
        pageViewId: currentPageViewIdRef.current,
        activeDeltaSec: deltaSec,
      };
    }
    if (wasRunning) resumeStopwatch();
    return null;
  }, [pauseStopwatch, resumeStopwatch]);

  const flushQueue = useCallback(
    async ({ useBeacon = false, includeDwell = true } = {}) => {
      if (consentRef.current !== "accepted") return;

      if (includeDwell) {
        const dwellEv = takePendingDwellEvent();
        if (dwellEv) queueRef.current.push(dwellEv);
      }

      if (queueRef.current.length === 0) return;

      const did = deviceIdRef.current || getCachedDeviceId();
      if (!did) {
        if (!useBeacon) {
          const recovered = await ensureIdentified();
          if (!recovered) return;
        } else {
          return;
        }
      }

      const finalDid = deviceIdRef.current || getCachedDeviceId();
      if (!finalDid) return;

      const eventsToSend = queueRef.current.splice(0, 25);
      const payload = {
        deviceId: finalDid,
        sessionId: getOrCreateSessionId(),
        events: eventsToSend,
      };

      if (useBeacon) {
        sendBeaconBatch(payload);
        return;
      }

      try {
        await api.post("/activity/batch", payload);
      } catch {
        // Drop silently on transient network error to avoid memory leaks
      }
    },
    [ensureIdentified, takePendingDwellEvent]
  );

  const enqueueEvent = useCallback(
    (event) => {
      if (consentRef.current !== "accepted") return;
      if (currentPathRef.current.startsWith("/admin")) return;

      queueRef.current.push({
        ...event,
        sessionId: getOrCreateSessionId(),
        occurredAt: new Date().toISOString(),
      });

      if (queueRef.current.length >= 10) {
        flushQueue({ useBeacon: false, includeDwell: false });
      }
    },
    [flushQueue]
  );

  // Trigger identification when consent is accepted
  useEffect(() => {
    if (consentStatus === "accepted") {
      ensureIdentified().then((did) => {
        if (did && currentPathRef.current && !currentPathRef.current.startsWith("/admin")) {
          flushQueue({ useBeacon: false, includeDwell: false });
        }
      });
    }
  }, [consentStatus, ensureIdentified, flushQueue]);

  // Handle SPA route changes (flush previous page's active dwell + record new PAGE_VIEW)
  const handleRouteChange = useCallback(
    (pathname) => {
      if (pathname.startsWith("/admin")) {
        pauseStopwatch();
        currentPathRef.current = pathname;
        currentPageViewIdRef.current = "";
        return;
      }

      if (currentPageViewIdRef.current && currentPathRef.current !== pathname) {
        flushQueue({ useBeacon: false, includeDwell: true });
      }

      currentPathRef.current = pathname;
      const pvId = makeId("pv");
      currentPageViewIdRef.current = pvId;
      accumulatedMsRef.current = 0;
      isIdleRef.current = false;
      lastInteractionMsRef.current = Date.now();
      activeStartMsRef.current =
        typeof document !== "undefined" && document.visibilityState === "visible"
          ? Date.now()
          : 0;

      // Re-verify deviceId if cookies/localStorage were wiped before this navigation
      ensureIdentified();

      enqueueEvent({
        type: "PAGE_VIEW",
        status: "INFO",
        pageName: resolvePageName(pathname),
        path: pathname,
        pageViewId: pvId,
        activeDurationSec: 0,
      });
    },
    [enqueueEvent, ensureIdentified, flushQueue, pauseStopwatch]
  );

  // Visibility, pagehide, idle pause (45s), periodic batch flush & 30s dwell checkpoints
  useEffect(() => {
    if (typeof window === "undefined") return;

    const markInteraction = () => {
      lastInteractionMsRef.current = Date.now();
      if (isIdleRef.current) {
        isIdleRef.current = false;
        resumeStopwatch();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushQueue({ useBeacon: true, includeDwell: true });
        pauseStopwatch();
      } else {
        lastInteractionMsRef.current = Date.now();
        isIdleRef.current = false;
        resumeStopwatch();
      }
    };

    const handlePageHide = () => {
      flushQueue({ useBeacon: true, includeDwell: true });
      pauseStopwatch();
    };

    // Smart global button click capture (skips /admin and unlabeled icon noise)
    const handleGlobalClick = (e) => {
      markInteraction();
      if (consentRef.current !== "accepted") return;
      if (currentPathRef.current.startsWith("/admin")) return;

      const target = e.target?.closest?.("button, a[data-track]");
      if (!target) return;

      const explicitTrack = target.getAttribute("data-track");
      const rawText = (
        explicitTrack ||
        target.getAttribute("aria-label") ||
        target.textContent ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);

      if (!rawText) return;

      // Re-identify if cookies were deleted right before clicking a button
      if (!getCachedDeviceId()) {
        ensureIdentified();
      }

      enqueueEvent({
        type: "ACTION",
        status: "INFO",
        actionName: explicitTrack || `CLICK: ${rawText}`,
        pageName: resolvePageName(currentPathRef.current),
        path: currentPathRef.current || window.location.pathname,
        pageViewId: currentPageViewIdRef.current,
        meta: { label: rawText },
      });
    };

    const idleInterval = setInterval(() => {
      if (
        !isIdleRef.current &&
        Date.now() - lastInteractionMsRef.current >= IDLE_TIMEOUT_MS
      ) {
        isIdleRef.current = true;
        pauseStopwatch();
      }
    }, 5000);

    const flushInterval = setInterval(() => {
      flushQueue({ useBeacon: false, includeDwell: false });
    }, BATCH_FLUSH_MS);

    const dwellInterval = setInterval(() => {
      flushQueue({ useBeacon: false, includeDwell: true });
    }, DWELL_CHECKPOINT_MS);

    window.addEventListener("mousemove", markInteraction, { passive: true });
    window.addEventListener("scroll", markInteraction, { passive: true });
    window.addEventListener("keydown", markInteraction, { passive: true });
    window.addEventListener("touchstart", markInteraction, { passive: true });
    document.addEventListener("click", handleGlobalClick, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(idleInterval);
      clearInterval(flushInterval);
      clearInterval(dwellInterval);
      window.removeEventListener("mousemove", markInteraction);
      window.removeEventListener("scroll", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [enqueueEvent, ensureIdentified, flushQueue, pauseStopwatch, resumeStopwatch]);

  const acceptConsent = useCallback(() => {
    consentRef.current = "accepted";
    setConsentStatus("accepted");
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
    } catch {
      // Ignore
    }
  }, []);

  const essentialOnlyConsent = useCallback(() => {
    consentRef.current = "essential";
    setConsentStatus("essential");
    queueRef.current = [];
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, "essential");
    } catch {
      // Ignore
    }
  }, []);

  const trackAction = useCallback(
    (actionName, extra = {}) => {
      enqueueEvent({
        type: extra.type || "ACTION",
        status: extra.status || "INFO",
        actionName,
        pageName: extra.pageName || resolvePageName(currentPathRef.current),
        path: extra.path || currentPathRef.current,
        pageViewId: currentPageViewIdRef.current,
        product: extra.product || null,
        cartItems: extra.cartItems || [],
        cartTotal: extra.cartTotal || 0,
        meta: extra.meta || {},
      });
    },
    [enqueueEvent]
  );

  const trackProductView = useCallback(
    (product) => {
      if (!product) return;
      const firstVariant = Array.isArray(product.variants) ? product.variants[0] : null;
      enqueueEvent({
        type: "PAGE_VIEW",
        status: "INFO",
        actionName: "PRODUCT_VIEW",
        pageName: `Product: ${product.title || product.slug || "Piece"}`,
        path: `/shop/${product.slug || ""}`,
        pageViewId: currentPageViewIdRef.current,
        product: {
          productId: product._id || product.id || null,
          slug: product.slug || "",
          title: product.title || "",
          sku: firstVariant?.sku || product.sku || "",
          primaryImage: product.image || product.gallery?.[0] || "",
          category: product.category || "",
          fabric: product.fabric || "",
          color: product.color || "",
          price: Number(product.price) || 0,
        },
      });
    },
    [enqueueEvent]
  );

  const trackCartSnapshot = useCallback(
    (actionName, cartItems = [], cartTotal = 0) => {
      enqueueEvent({
        type: "CART_SNAPSHOT",
        status: "INFO",
        actionName,
        pageName: "Shopping Bag",
        path: currentPathRef.current || "/checkout",
        pageViewId: currentPageViewIdRef.current,
        cartItems,
        cartTotal,
      });
    },
    [enqueueEvent]
  );

  const value = useMemo(
    () => ({
      deviceId,
      visitorCode,
      consentStatus,
      acceptConsent,
      essentialOnlyConsent,
      trackAction,
      trackProductView,
      trackCartSnapshot,
    }),
    [
      deviceId,
      visitorCode,
      consentStatus,
      acceptConsent,
      essentialOnlyConsent,
      trackAction,
      trackProductView,
      trackCartSnapshot,
    ]
  );

  return (
    <ActivityContext.Provider value={value}>
      <Suspense fallback={null}>
        <RouteActivityWatcher onRouteChange={handleRouteChange} />
      </Suspense>
      {children}
    </ActivityContext.Provider>
  );
}