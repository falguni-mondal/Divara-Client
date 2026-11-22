"use client";

const LS_DEVICE_KEY = "divara:did:v1";
const SS_SESSION_KEY = "divara:sid:v1";
const IDB_DB_NAME = "divara_device_store";
const IDB_STORE_NAME = "meta";
const IDB_KEY = "deviceId";

let memoryDeviceId = "";
let memorySessionId = "";

async function sha256Hex(input) {
  try {
    const data = new TextEncoder().encode(String(input));
    const buf = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback deterministic FNV-1a hex if crypto.subtle is unavailable (e.g. non-HTTPS LAN)
    let h = 2166136261;
    const str = String(input);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fnv_${(h >>> 0).toString(16).padStart(8, "0")}`;
  }
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("no_idb"));
      return;
    }
    const req = window.indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readIdbDeviceId() {
  try {
    const db = await openIdb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const req = tx.objectStore(IDB_STORE_NAME).get(IDB_KEY);
      req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : "");
      req.onerror = () => resolve("");
    });
  } catch {
    return "";
  }
}

async function writeIdbDeviceId(deviceId) {
  try {
    const db = await openIdb();
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      tx.objectStore(IDB_STORE_NAME).put(deviceId, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IndexedDB quota/privacy restrictions
  }
}

export function getCachedDeviceId() {
  if (memoryDeviceId) return memoryDeviceId;
  if (typeof window === "undefined") return "";
  try {
    const fromLs = window.localStorage.getItem(LS_DEVICE_KEY) || "";
    if (fromLs) {
      memoryDeviceId = fromLs;
      return fromLs;
    }
  } catch {
    // Ignore storage access errors
  }
  return "";
}

export async function readPersistentDeviceId() {
  const cached = getCachedDeviceId();
  if (cached) return cached;
  const fromIdb = await readIdbDeviceId();
  if (fromIdb) {
    persistDeviceId(fromIdb);
    return fromIdb;
  }
  return "";
}

export function persistDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== "string") return;
  memoryDeviceId = deviceId;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_DEVICE_KEY, deviceId);
  } catch {
    // Ignore
  }
  writeIdbDeviceId(deviceId);
}

export function getOrCreateSessionId() {
  if (memorySessionId) return memorySessionId;
  if (typeof window === "undefined") return "";
  try {
    let sid = window.sessionStorage.getItem(SS_SESSION_KEY);
    if (!sid) {
      sid =
        typeof window.crypto?.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `sid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SS_SESSION_KEY, sid);
    }
    memorySessionId = sid;
    return sid;
  } catch {
    memorySessionId = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return memorySessionId;
  }
}

export function detectDeviceType() {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) {
    return "tablet";
  }
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export function detectBrowserFamily() {
  if (typeof window === "undefined") return "Unknown";
  const ua = navigator.userAgent || "";
  if (navigator.brave) return "Brave";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS/i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}

async function collectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!gl) {
      return {
        webglVendor: "unsupported",
        webglRenderer: "unsupported",
        webglLimitsHash: "unsupported",
      };
    }

    let webglVendor = "masked";
    let webglRenderer = "masked";
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      webglVendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "masked");
      webglRenderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "masked");
    }

    const limits = [
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      gl.getShaderPrecisionFormat?.(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision ?? -1,
      (gl.getSupportedExtensions() || []).sort().join(","),
    ].join("|");

    const webglLimitsHash = await sha256Hex(limits);
    return { webglVendor, webglRenderer, webglLimitsHash };
  } catch {
    return {
      webglVendor: "blocked",
      webglRenderer: "blocked",
      webglLimitsHash: "blocked",
    };
  }
}

function renderCanvasDataUrl() {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.textBaseline = "top";
  ctx.fillStyle = "#f4f1ec";
  ctx.fillRect(0, 0, 240, 60);
  ctx.fillStyle = "#5d100a";
  ctx.fillRect(10, 8, 90, 24);
  ctx.font = "14px 'Arial', sans-serif";
  ctx.fillStyle = "#1b1717";
  ctx.fillText("DIVARA-T1-0924!@#", 14, 14);
  ctx.beginPath();
  ctx.arc(195, 30, 18, 0, Math.PI * 1.65);
  ctx.strokeStyle = "#1b1717";
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas.toDataURL();
}

async function collectCanvasHash() {
  try {
    const first = renderCanvasDataUrl();
    const second = renderCanvasDataUrl();
    if (!first) return "unsupported";
    // Detect privacy browsers (Brave/Firefox ETP) injecting random per-read canvas noise
    if (first !== second) return "randomized";
    return await sha256Hex(first);
  } catch {
    return "blocked";
  }
}

async function collectAudioHash() {
  try {
    const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioCtx) return "unsupported";

    const ctx = new AudioCtx(1, 4410, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(10000, ctx.currentTime);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-50, ctx.currentTime);
    comp.knee.setValueAtTime(40, ctx.currentTime);
    comp.ratio.setValueAtTime(12, ctx.currentTime);
    comp.attack.setValueAtTime(0, ctx.currentTime);
    comp.release.setValueAtTime(0.25, ctx.currentTime);

    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);

    const rendered = await ctx.startRendering();
    const channel = rendered.getChannelData(0);
    let sampleStr = "";
    for (let i = 450; i < Math.min(channel.length, 950); i += 10) {
      sampleStr += channel[i].toFixed(6);
    }
    if (!sampleStr) return "unsupported";
    return await sha256Hex(sampleStr);
  } catch {
    return "blocked";
  }
}

async function collectWebGPUHash() {
  try {
    if (!navigator.gpu?.requestAdapter) return "unsupported";
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return "unsupported";
    const info = adapter.info || {};
    const lim = adapter.limits || {};
    const raw = [
      info.vendor || "",
      info.architecture || "",
      info.device || "",
      lim.maxTextureDimension2D || 0,
      lim.maxStorageBufferBindingSize || 0,
      lim.maxComputeWorkgroupSizeX || 0,
    ].join("|");
    return await sha256Hex(raw);
  } catch {
    return "blocked";
  }
}

async function collectMediaCodecsHash() {
  try {
    const video = document.createElement("video");
    const audio = document.createElement("audio");
    const probes = [
      video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
      video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
      video.canPlayType('video/webm; codecs="vp9"'),
      video.canPlayType('video/mp4; codecs="av01.0.04M.08"'),
      audio.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
      audio.canPlayType('audio/webm; codecs="opus"'),
      audio.canPlayType("audio/flac"),
    ];
    return await sha256Hex(probes.join("|"));
  } catch {
    return "unsupported";
  }
}

async function collectMathHash() {
  try {
    const vals = [
      Math.acos(0.123456789),
      Math.acosh(1e308),
      Math.asinh(1),
      Math.atanh(0.5),
      Math.expm1(1),
      Math.sinh(1),
      Math.tan(-1e300),
    ];
    return await sha256Hex(vals.map((v) => String(v)).join("|"));
  } catch {
    return "unsupported";
  }
}

/**
 * Collects strictly the 14 Tier 1 hardware-anchored signals (zero volatile traits).
 */
export async function collectTier1Signals() {
  if (typeof window === "undefined") return {};

  const [webgl, canvasHash, audioHash, webgpuHash, mediaCodecsHash, mathHash] =
    await Promise.all([
      collectWebGL(),
      collectCanvasHash(),
      collectAudioHash(),
      collectWebGPUHash(),
      collectMediaCodecsHash(),
      collectMathHash(),
    ]);

  const osPlatform =
    navigator.userAgentData?.platform || navigator.platform || "unknown";
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  const primaryLanguage = navigator.language || "unknown";

  return {
    webglVendor: webgl.webglVendor,
    webglRenderer: webgl.webglRenderer,
    webglLimitsHash: webgl.webglLimitsHash,
    canvasHash,
    audioHash,
    webgpuHash,
    mediaCodecsHash,
    mathHash,
    cpuCores: Number(navigator.hardwareConcurrency) || 0,
    deviceMemory: Number(navigator.deviceMemory) || 0,
    maxTouchPoints: Number(navigator.maxTouchPoints) || 0,
    osPlatform,
    timezone,
    primaryLanguage,
  };
}