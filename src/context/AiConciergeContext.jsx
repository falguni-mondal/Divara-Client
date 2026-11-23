"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { useActivity } from "@/context/ActivityContext";
import { useToast } from "@/context/ToastContext";

const STORAGE_KEY = "divara:ai_chat:v1";
const PENDING_FORM_KEY = "divara:ai_pending_form:v1";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to DIVARA. I'm NIRA — ask me anything about our pieces, policies, or orders, or hold the mic to navigate and shop hands-free.",
};

const AiConciergeContext = createContext(null);
export const useAiConcierge = () => useContext(AiConciergeContext);

function AiRouteTracker({ onPathChange }) {
  const pathname = usePathname();
  useEffect(() => {
    onPathChange(pathname || "/");
  }, [pathname, onPathChange]);
  return null;
}

export function AiConciergeProvider({ children }) {
  const router = useRouter();
  const toast = useToast();
  const { isAdmin, setIsBagOpen } = useShop();
  const { consent, openPreferences } = useActivity();

  const [currentPath, setCurrentPath] = useState("/");
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);

  const visibleItemsRef = useRef([]);
  const lastCandidatesRef = useRef([]);
  const formHandlersRef = useRef({});
  const autoScrollRafRef = useRef(null);
  const isBusyRef = useRef(false);

  useEffect(() => {
    lastCandidatesRef.current = [];
  }, [currentPath]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed.slice(-24));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24)));
    } catch {}
  }, [messages]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    const cancel = () => stopAutoScroll();
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel, { passive: true });
    return () => {
      stopAutoScroll();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [stopAutoScroll]);

  const startSlowScrollToEnd = useCallback(() => {
    stopAutoScroll();
    let lastTs = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (window.scrollY >= maxY - 2) {
        autoScrollRafRef.current = null;
        return;
      }
      window.scrollBy(0, 135 * dt);
      autoScrollRafRef.current = requestAnimationFrame(step);
    };
    autoScrollRafRef.current = requestAnimationFrame(step);
  }, [stopAutoScroll]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, []);

  const speakText = useCallback(
    (text) => {
      if (voiceMuted || !text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-IN";
        utter.rate = 1.02;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => /en-IN/i.test(v.lang)) || voices.find((v) => /en-GB|en-US/i.test(v.lang));
        if (preferred) utter.voice = preferred;
        window.speechSynthesis.speak(utter);
      } catch {}
    },
    [voiceMuted]
  );

  const registerVisibleItems = useCallback((items) => {
    visibleItemsRef.current = Array.isArray(items) ? items.slice(0, 24) : [];
  }, []);

  const registerFormHandler = useCallback((formType, handler) => {
    if (!formType) return () => {};
    formHandlersRef.current[formType] = handler;

    try {
      const raw = sessionStorage.getItem(PENDING_FORM_KEY);
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending?.formType === formType && pending?.fields) {
          sessionStorage.removeItem(PENDING_FORM_KEY);
          handler(pending.fields);
        }
      }
    } catch {}

    return () => {
      if (formHandlersRef.current[formType] === handler) delete formHandlersRef.current[formType];
    };
  }, []);

  const executeClientActions = useCallback(
    (actions) => {
      if (!Array.isArray(actions) || actions.length === 0) return;

      for (const action of actions) {
        if (!action?.type) continue;
        if (action.type === "navigate" && typeof action.path === "string") {
          stopAutoScroll();
          router.push(action.path);
        } else if (action.type === "history") {
          stopAutoScroll();
          action.direction === "forward" ? router.forward() : router.back();
        } else if (action.type === "scroll") {
          if (action.action === "stop") stopAutoScroll();
          else if (action.action === "slow_down_to_end") startSlowScrollToEnd();
          else if (action.action === "top") {
            stopAutoScroll();
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else if (action.action === "bottom") {
            stopAutoScroll();
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
          } else if (action.action === "down") {
            stopAutoScroll();
            window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" });
          } else if (action.action === "up") {
            stopAutoScroll();
            window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: "smooth" });
          }
        } else if (action.type === "overlay") {
          if (action.target === "cart") setIsBagOpen(true);
          else if (action.target === "cookie_preferences") openPreferences();
          else if (action.target === "search") window.dispatchEvent(new CustomEvent("divara:open-search"));
        } else if (action.type === "google_signin") {
          window.location.href = `${API_BASE_URL}/auth/google`;
        } else if (action.type === "fill_form" && action.fields) {
          const handler = formHandlersRef.current[action.formType];
          if (typeof handler === "function") {
            handler(action.fields);
          } else {
            try {
              sessionStorage.setItem(
                PENDING_FORM_KEY,
                JSON.stringify({ formType: action.formType, fields: action.fields })
              );
            } catch {}
            const routeMap = { checkout_address: "/checkout", account_address: "/account", contact: "/contact" };
            if (routeMap[action.formType]) router.push(routeMap[action.formType]);
          }
        }
      }
    },
    [router, setIsBagOpen, openPreferences, startSlowScrollToEnd, stopAutoScroll]
  );

  const sendMessage = useCallback(
    async (rawText, { inputMode = "text" } = {}) => {
      const text = String(rawText || "").trim();
      if (!text || isBusyRef.current || isAdmin) return;

      stopSpeaking();
      setMessages((prev) => [...prev.slice(-23), { id: `u_${Date.now()}`, role: "user", content: text }]);

      isBusyRef.current = true;
      setIsBusy(true);

      try {
        const recentHistory = messages
          .filter((m) => m.id !== "welcome")
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.content }));

        const { data } = await api.post(
          "/ai/chat",
          {
            message: text,
            history: recentHistory,
            currentPage: currentPath,
            visibleItems: visibleItemsRef.current,
            lastCandidates: lastCandidatesRef.current,
            personalizationAllowed: Boolean(consent?.personalization),
            inputMode,
          },
          { timeout: 25000 }
        );

        const payload = data?.data || {};
        const replyText = payload.reply || "I'm here to help you explore DIVARA. Could you share a bit more?";

        lastCandidatesRef.current = Array.isArray(payload.candidates) ? payload.candidates : [];
        setMessages((prev) => [...prev.slice(-23), { id: `a_${Date.now()}`, role: "assistant", content: replyText }]);

        if (Array.isArray(payload.clientActions) && payload.clientActions.length > 0) {
          executeClientActions(payload.clientActions);
        }
        if (inputMode === "voice" && (payload.speakText || replyText)) {
          speakText(payload.speakText || replyText);
        }
      } catch (err) {
        const errMsg = getApiErrorMessage(err, "Our concierge is momentarily busy. Please try again shortly.");
        setMessages((prev) => [...prev.slice(-23), { id: `e_${Date.now()}`, role: "assistant", content: errMsg }]);
      } finally {
        isBusyRef.current = false;
        setIsBusy(false);
      }
    },
    [isAdmin, messages, currentPath, consent?.personalization, executeClientActions, speakText, stopSpeaking]
  );

  const transcribeVoiceBlob = useCallback(async (blob) => {
    const res = await fetch(`${API_BASE_URL}/ai/transcribe`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": blob.type || "audio/webm" },
      body: blob,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Voice transcription unavailable");
    return String(json.data?.text || "").trim();
  }, []);

  const fetchMemory = useCallback(async () => {
    const { data } = await api.get("/ai/memory");
    return data?.data?.memory || null;
  }, []);

  const clearMemory = useCallback(async () => {
    await api.delete("/ai/memory");
    toast?.success?.("Cleared your saved concierge preferences.");
  }, [toast]);

  const clearChat = useCallback(() => {
    stopSpeaking();
    lastCandidatesRef.current = [];
    setMessages([WELCOME_MESSAGE]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [stopSpeaking]);

  const value = useMemo(
    () => ({
      currentPath,
      isOpen,
      setIsOpen,
      isBusy,
      voiceMuted,
      setVoiceMuted,
      messages,
      sendMessage,
      transcribeVoiceBlob,
      stopSpeaking,
      registerVisibleItems,
      registerFormHandler,
      fetchMemory,
      clearMemory,
      clearChat,
    }),
    [
      currentPath,
      isOpen,
      isBusy,
      voiceMuted,
      messages,
      sendMessage,
      transcribeVoiceBlob,
      stopSpeaking,
      registerVisibleItems,
      registerFormHandler,
      fetchMemory,
      clearMemory,
      clearChat,
    ]
  );

  return (
    <AiConciergeContext.Provider value={value}>
      <Suspense fallback={null}>
        <AiRouteTracker onPathChange={setCurrentPath} />
      </Suspense>
      {children}
    </AiConciergeContext.Provider>
  );
}