"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext(null);

const MAX_TOASTS = 4;
const DEFAULT_DURATION_MS = 4200;

function ToastItem({ item, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(item.duration);
  const startRef = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const elapsed = Date.now() - startRef.current;
      remainingRef.current = Math.max(400, remainingRef.current - elapsed);
      return;
    }

    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, remainingRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [paused, item.id, onDismiss]);

  const variantConfig = {
    success: {
      border: "border-[#1b1717]/20",
      accent: "bg-[#1b1717]",
      icon: <CheckCircle2 className="w-4 h-4 text-[#1b1717] shrink-0 mt-0.5" />,
    },
    error: {
      border: "border-[#5d100a]/40",
      accent: "bg-[#5d100a]",
      icon: <AlertCircle className="w-4 h-4 text-[#5d100a] shrink-0 mt-0.5" />,
    },
    warning: {
      border: "border-[#b69148]/50",
      accent: "bg-[#b69148]",
      icon: <AlertTriangle className="w-4 h-4 text-[#8c6b27] shrink-0 mt-0.5" />,
    },
    info: {
      border: "border-[#1b1717]/20",
      accent: "bg-[#1b1717]/70",
      icon: <Info className="w-4 h-4 text-[#1b1717]/75 shrink-0 mt-0.5" />,
    },
  };

  const cfg = variantConfig[item.type] || variantConfig.info;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto relative w-full max-w-[360px] bg-[#ffffff] text-[#1b1717] border ${cfg.border} shadow-xl rounded-[2px] overflow-hidden transition-all duration-300`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.accent}`} />
      <div className="flex items-start gap-2.5 pl-4 pr-3 py-3">
        {cfg.icon}
        <p className="flex-1 text-xs leading-relaxed text-[#1b1717] pr-1">
          {item.message}
        </p>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Dismiss notification"
          className="p-0.5 text-[#1b1717]/45 hover:text-[#5d100a] transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastSignatureRef = useRef({ key: "", at: 0 });

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const push = useCallback((type, message, duration = DEFAULT_DURATION_MS) => {
    const cleanMsg = String(message || "").trim();
    if (!cleanMsg) return null;

    const sig = `${type}:${cleanMsg}`;
    const now = Date.now();
    if (lastSignatureRef.current.key === sig && now - lastSignatureRef.current.at < 1500) {
      return null;
    }
    lastSignatureRef.current = { key: sig, at: now };

    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, type, message: cleanMsg, duration }]);
    return id;
  }, []);

  const api = useMemo(
    () => ({
      success: (msg, duration) => push("success", msg, duration),
      error: (msg, duration) => push("error", msg, duration ?? 5200),
      warning: (msg, duration) => push("warning", msg, duration ?? 4800),
      info: (msg, duration) => push("info", msg, duration),
      dismiss,
      clearAll,
    }),
    [push, dismiss, clearAll]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9998] flex flex-col items-end gap-2.5 max-w-[calc(100vw-2rem)]"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
      dismiss: () => {},
      clearAll: () => {},
    };
  }
  return ctx;
}