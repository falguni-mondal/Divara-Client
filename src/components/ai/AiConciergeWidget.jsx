"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Send, Mic, Volume2, VolumeX, Trash2, Brain, Loader2 } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useAiConcierge } from "@/context/AiConciergeContext";

const AI_NAME = "NIRA";
const BADGE_W = 56;
const BADGE_H = 42;
const EDGE_PAD = 16;
const TOP_PAD = 84;
const BOTTOM_PAD = 24;
const POS_KEY = "divara:nira_dock:v1";

function pickAudioMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) =>
    MediaRecorder.isTypeSupported(m)
  ) || "";
}

function SimpleBotIcon({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <line x1="16" y1="5" x2="16" y2="9" stroke="#E8C4B8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="4" r="1.8" fill="#E8C4B8" />
      <rect x="6" y="9.5" width="20" height="16" rx="4.5" stroke="#FFFFFF" strokeWidth="1.8" />
      <circle cx="12.2" cy="16.5" r="1.7" fill="#FFFFFF" />
      <circle cx="19.8" cy="16.5" r="1.7" fill="#FFFFFF" />
      <path d="M12.5 21.2H19.5" stroke="#E8C4B8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function AiConciergeWidget() {
  const { isAdmin, isBagOpen } = useShop();
  const {
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
    fetchMemory,
    clearMemory,
    clearChat,
  } = useAiConcierge();

  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceHint, setVoiceHint] = useState("");
  const [recordSec, setRecordSec] = useState(0);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryData, setMemoryData] = useState(null);

  const [dockSide, setDockSide] = useState("left");
  const [pos, setPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPopout, setShowPopout] = useState(false);
  const [popoutDismissed, setPopoutDismissed] = useState(false);

  const dragRef = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const listEndRef = useRef(null);
  const recRef = useRef({ recorder: null, stream: null, chunks: [], start: 0, startX: 0, cancelled: false, maxT: null, secT: null });

  const isBlocked = isAdmin || (currentPath && currentPath.startsWith("/admin"));

  useEffect(() => {
    const clampY = (y) => Math.max(TOP_PAD, Math.min(window.innerHeight - BADGE_H - BOTTOM_PAD, y));
    let side = "left";
    let y = window.innerHeight - BADGE_H - BOTTOM_PAD;
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) || "null");
      if (saved?.side === "right" || saved?.side === "left") side = saved.side;
      if (typeof saved?.y === "number") y = clampY(saved.y);
    } catch {}

    setDockSide(side);
    setPos({ x: side === "right" ? window.innerWidth - BADGE_W - EDGE_PAD : EDGE_PAD, y });

    const onResize = () =>
      setPos((p) =>
        p
          ? {
              x: p.x + BADGE_W / 2 >= window.innerWidth / 2 ? window.innerWidth - BADGE_W - EDGE_PAD : EDGE_PAD,
              y: clampY(p.y),
            }
          : p
      );
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isOpen || popoutDismissed || isBlocked) return setShowPopout(false);
    const t = setTimeout(() => setShowPopout(true), 1500);
    return () => clearTimeout(t);
  }, [isOpen, popoutDismissed, isBlocked]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isBusy]);

  useEffect(() => {
    if (!voiceHint) return;
    const t = setTimeout(() => setVoiceHint(""), 3500);
    return () => clearTimeout(t);
  }, [voiceHint]);

  useEffect(() => {
    if (!isRecording) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        recRef.current.cancelled = true;
        recRef.current.recorder?.stop();
        setVoiceHint("Voice cancelled.");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRecording]);

  if (isBlocked) return null;

  const onBadgeDown = (e) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    setIsDragging(true);
  };

  const onBadgeMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true;
    if (!d.moved) return;
    setPos({
      x: Math.max(EDGE_PAD, Math.min(window.innerWidth - BADGE_W - EDGE_PAD, d.ox + dx)),
      y: Math.max(TOP_PAD, Math.min(window.innerHeight - BADGE_H - BOTTOM_PAD, d.oy + dy)),
    });
  };

  const onBadgeUp = (e) => {
    if (!dragRef.current.active) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const wasDrag = dragRef.current.moved;
    dragRef.current.active = false;
    setIsDragging(false);

    if (!wasDrag) {
      setPopoutDismissed(true);
      return setIsOpen(true);
    }

    setPos((curr) => {
      if (!curr) return curr;
      const right = curr.x + BADGE_W / 2 >= window.innerWidth / 2;
      const side = right ? "right" : "left";
      setDockSide(side);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({ side, y: curr.y }));
      } catch {}
      return { x: right ? window.innerWidth - BADGE_W - EDGE_PAD : EDGE_PAD, y: curr.y };
    });
  };

  const cleanupRec = () => {
    const r = recRef.current;
    clearTimeout(r.maxT);
    clearInterval(r.secT);
    r.stream?.getTracks().forEach((t) => t.stop());
    r.stream = null;
    r.recorder = null;
    setIsRecording(false);
    setRecordSec(0);
  };

  const startHoldVoice = async (e) => {
    e.preventDefault();
    if (isBusy || isTranscribing || isRecording) return;
    stopSpeaking();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setVoiceHint("Voice isn't supported on this browser. Please type instead.");
    }

    const r = recRef.current;
    r.startX = e.clientX || 0;
    r.cancelled = false;

    try {
      let wasPrompt = false;
      try {
        wasPrompt = (await navigator.permissions?.query({ name: "microphone" }))?.state === "prompt";
      } catch {}

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (wasPrompt) {
        stream.getTracks().forEach((t) => t.stop());
        return setVoiceHint("Mic ready — hold the button while speaking.");
      }

      const mime = pickAudioMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      r.stream = stream;
      r.recorder = recorder;
      r.chunks = [];
      r.start = Date.now();

      recorder.ondataavailable = (ev) => ev.data?.size > 0 && r.chunks.push(ev.data);
      recorder.onstop = async () => {
        const heldMs = Date.now() - r.start;
        const { cancelled, chunks } = r;
        const type = recorder.mimeType || mime || "audio/webm";
        cleanupRec();
        if (cancelled) return;
        if (heldMs < 350 || !chunks.length) return setVoiceHint("Hold while speaking, then release.");

        setIsTranscribing(true);
        try {
          const text = await transcribeVoiceBlob(new Blob(chunks, { type }));
          if (!text) setVoiceHint("Didn't catch that — hold and speak clearly.");
          else await sendMessage(text, { inputMode: "voice" });
        } catch (err) {
          setVoiceHint(err?.message || "Voice is busy right now. Please type instead.");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordSec(1);
      r.secT = setInterval(() => setRecordSec((s) => s + 1), 1000);
      r.maxT = setTimeout(() => r.recorder?.state === "recording" && r.recorder.stop(), 25000);
    } catch {
      cleanupRec();
      setVoiceHint("Microphone permission denied. Enable mic access or type below.");
    }
  };

  const moveHoldVoice = (e) => {
    if (isRecording && recRef.current.startX - (e.clientX || 0) > 60) {
      recRef.current.cancelled = true;
      recRef.current.recorder?.state === "recording" && recRef.current.recorder.stop();
      setVoiceHint("Voice cancelled.");
    }
  };

  const stopHoldVoice = () => {
    recRef.current.recorder?.state === "recording" && recRef.current.recorder.stop();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val || isBusy) return;
    setInput("");
    await sendMessage(val, { inputMode: "text" });
  };

  const toggleMemory = async () => {
    if (memoryOpen) return setMemoryOpen(false);
    setMemoryOpen(true);
    try {
      setMemoryData(await fetchMemory());
    } catch {
      setMemoryData(null);
    }
  };

  const memoryLines = memoryData
    ? [
        memoryData.preferredName && `Name: ${memoryData.preferredName}`,
        memoryData.birthday?.month &&
          `Birthday: ${String(memoryData.birthday.day).padStart(2, "0")}/${String(memoryData.birthday.month).padStart(2, "0")}`,
        memoryData.preferredSize && `Size: ${memoryData.preferredSize}`,
        memoryData.budgetMaxInr && `Budget: up to ₹${memoryData.budgetMaxInr}`,
        memoryData.favoriteColors?.length && `Colors: ${memoryData.favoriteColors.join(", ")}`,
        memoryData.city && `City: ${memoryData.city}`,
      ].filter(Boolean)
    : [];

  return (
    <>
      {!isOpen && !isBagOpen && pos && (
        <div
          style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
          className={`fixed z-40 flex items-center ${isDragging ? "" : "transition-[left,top] duration-300 ease-out"}`}
        >
          <div className="relative flex items-center">
            <button
              type="button"
              onPointerDown={onBadgeDown}
              onPointerMove={onBadgeMove}
              onPointerUp={onBadgeUp}
              onPointerCancel={onBadgeUp}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={`Open ${AI_NAME} AI Assistant`}
              title={`Ask ${AI_NAME} (drag to move)`}
              style={{ width: `${BADGE_W}px`, height: `${BADGE_H}px` }}
              className={`flex items-center justify-center rounded-[6px] bg-[#1b1717] hover:bg-[#5d100a] border border-white/15 shadow-lg touch-none select-none transition-colors ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <SimpleBotIcon />
            </button>

            {showPopout && !isDragging && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 whitespace-nowrap rounded-[6px] bg-white text-[#1b1717] border border-[#1b1717]/15 shadow-md px-3 py-1.5 text-[11px] ${
                  dockSide === "left" ? "left-[66px]" : "right-[66px]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPopoutDismissed(true);
                    setIsOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <span className="font-semibold tracking-[0.1em] uppercase text-[#5d100a]">{AI_NAME}</span>
                  <span className="text-[#1b1717]/80"> · Ask in chat or hold mic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPopoutDismissed(true)}
                  aria-label="Dismiss hint"
                  className="text-[#1b1717]/45 hover:text-[#1b1717] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <aside
          aria-label={`${AI_NAME} AI Assistant`}
          className={`fixed bottom-4 z-50 w-[min(92vw,390px)] h-[min(78vh,560px)] flex flex-col bg-white border border-[#1b1717]/15 shadow-2xl overflow-hidden ${
            dockSide === "right" ? "right-4" : "left-4"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#1b1717] text-white">
            <div className="flex items-center gap-2.5">
              <SimpleBotIcon className="w-6 h-6 shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase leading-none">{AI_NAME}</p>
                <p className="text-[10px] text-white/70 mt-0.5">AI Stylist · Audio never stored</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={toggleMemory} title="Saved preferences" className="p-1.5 text-white/75 hover:text-white cursor-pointer">
                <Brain className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setVoiceMuted((v) => !v);
                }}
                title={voiceMuted ? "Unmute voice" : "Mute voice"}
                className="p-1.5 text-white/75 hover:text-white cursor-pointer"
              >
                {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button type="button" onClick={clearChat} title="Clear chat" className="p-1.5 text-white/75 hover:text-white cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                aria-label="Close"
                className="p-1.5 text-white/75 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {memoryOpen && (
            <div className="px-4 py-2.5 bg-[#f7f5f2] border-b border-[#1b1717]/10 text-[11px] text-[#1b1717]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold uppercase tracking-[0.12em]">Saved Preferences</span>
                {memoryLines.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await clearMemory();
                      setMemoryData(null);
                    }}
                    className="text-[#5d100a] underline cursor-pointer"
                  >
                    Forget all
                  </button>
                )}
              </div>
              {memoryLines.length > 0 ? (
                <p className="text-[#1b1717]/80">{memoryLines.join(" · ")}</p>
              ) : (
                <p className="text-[#1b1717]/65">No preferences saved yet.</p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[84%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-[#5d100a] text-white"
                      : "bg-[#f7f5f2] text-[#1b1717] border border-[#1b1717]/8"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {(isBusy || isTranscribing) && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-3.5 py-2 bg-[#f7f5f2] text-xs text-[#1b1717]/70">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5d100a]" />
                  <span>{isTranscribing ? "Listening..." : `${AI_NAME} is thinking...`}</span>
                </div>
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          {(isRecording || voiceHint) && (
            <div className="px-4 py-1.5 text-[11px] bg-[#fdf4f3] text-[#5d100a] border-t border-[#5d100a]/15">
              {isRecording ? `Listening (${recordSec}s) — release to send, slide left to cancel` : voiceHint}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2.5 border-t border-[#1b1717]/10 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${AI_NAME} anything...`}
              disabled={isBusy || isTranscribing || isRecording}
              className="flex-1 text-xs px-3 py-2 bg-[#f7f5f2] text-[#1b1717] placeholder:text-[#1b1717]/45 focus:outline-none focus:ring-1 focus:ring-[#5d100a]"
            />
            <button
              type="button"
              onPointerDown={startHoldVoice}
              onPointerMove={moveHoldVoice}
              onPointerUp={stopHoldVoice}
              onPointerCancel={stopHoldVoice}
              onContextMenu={(e) => e.preventDefault()}
              disabled={isBusy || isTranscribing}
              title="Hold to speak"
              aria-label="Hold to speak"
              className={`p-2.5 touch-none select-none transition-colors cursor-pointer ${
                isRecording ? "bg-[#5d100a] text-white" : "bg-[#1b1717] text-white hover:bg-[#5d100a]"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isBusy || isTranscribing || isRecording}
              aria-label="Send"
              className="p-2.5 bg-[#5d100a] text-white disabled:opacity-40 hover:bg-[#1b1717] transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}