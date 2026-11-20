"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

const SESSION_KEY = "divara_visit_session_id";
const ATTR_KEY = "divara_utm_attribution";
const TRACKED_KEY = "divara_last_tracked_sig";
const ATTR_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getOrCreateSessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getStoredAttribution() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(ATTR_KEY);
      return null;
    }
    return parsed.data || null;
  } catch {
    return null;
  }
}

export default function UtmTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Do not count admin console visits as storefront customer traffic
    if (pathname?.startsWith("/account")) return;

    const utmSource = searchParams.get("utm_source") || "";
    const utmMedium = searchParams.get("utm_medium") || "";
    const utmCampaign = searchParams.get("utm_campaign") || "";
    const utmContent = searchParams.get("utm_content") || "";
    const referralPerson =
      searchParams.get("utm_ref") || searchParams.get("ref") || "";

    const hasCampaignParams = Boolean(
      utmSource || utmMedium || utmCampaign || referralPerson
    );

    const referrerHost = document.referrer || "";
    const sessionId = getOrCreateSessionId();

    const payload = {
      sessionId,
      landingPath: pathname || "/",
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      referralPerson,
      referrerHost,
    };

    if (hasCampaignParams) {
      try {
        localStorage.setItem(
          ATTR_KEY,
          JSON.stringify({
            expiresAt: Date.now() + ATTR_TTL_MS,
            data: {
              utmSource: utmSource || "direct",
              utmMedium: utmMedium || "none",
              utmCampaign,
              utmContent,
              referralPerson,
              landingPath: pathname || "/",
            },
          })
        );
      } catch {
        // Ignore storage quota errors
      }
    }

    const sig = `${sessionId}|${utmSource}|${utmMedium}|${utmCampaign}|${referralPerson}`;
    if (sessionStorage.getItem(TRACKED_KEY) === sig) return;
    sessionStorage.setItem(TRACKED_KEY, sig);

    api.post("/analytics/track", payload).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}