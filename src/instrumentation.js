export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) return;

  // Prevent duplicate intervals during hot reloads
  if (globalThis.__divaraKeepAliveTimer) return;

  const healthUrl = `${apiBase}/healthz`;
  const FOURTEEN_MINUTES_MS = 14 * 60 * 1000;

  const pingBackend = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      await fetch(healthUrl, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
    } catch {
      // Non-blocking keep-alive ping
    }
  };

  globalThis.__divaraKeepAliveTimer = setInterval(pingBackend, FOURTEEN_MINUTES_MS);
  if (typeof globalThis.__divaraKeepAliveTimer.unref === "function") {
    globalThis.__divaraKeepAliveTimer.unref();
  }
}