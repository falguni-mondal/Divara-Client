import { NextResponse } from "next/server";

export async function GET() {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1").replace(
    /\/+$/,
    ""
  );
  const healthUrl = `${apiBase}/healthz`;
  const startedAt = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return NextResponse.json(
      {
        ok: res.ok,
        backendStatus: res.status,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Backend unreachable",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}