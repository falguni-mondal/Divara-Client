"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Clock,
  Sparkles,
  AlertTriangle,
  ShoppingBag,
  Laptop,
  Smartphone,
  Tablet,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/data/catalogData";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

const EVENT_FILTERS = [
  { id: "ALL", label: "All Events" },
  { id: "PAGE_VIEW", label: "Page Visits" },
  { id: "ACTION", label: "Actions" },
  { id: "CART_CHECKOUT", label: "Cart & Checkout" },
  { id: "AUTH", label: "Auth" },
];

function formatDuration(totalSeconds = 0) {
  const sec = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (sec < 60) return `${sec}s`;
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${rem}s`;
  return `${mins}m ${rem}s`;
}

function intentBadgeClass(stage) {
  switch (stage) {
    case "Checkout Drop-Off":
      return "bg-[#5d100a] text-[#ffffff]";
    case "High-Intent Cart Holder":
      return "bg-amber-700 text-[#ffffff]";
    case "Repeat VIP":
      return "bg-emerald-800 text-[#ffffff]";
    case "Warm Explorer":
      return "bg-[#1b1717] text-[#ffffff]";
    default:
      return "bg-[#1b1717]/10 text-[#1b1717]";
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "FAILED":
      return "bg-red-50 text-[#5d100a] border-red-200";
    case "WARNING":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-[#1b1717]/5 text-[#1b1717]/75 border-[#1b1717]/15";
  }
}

function DeviceIcon({ type }) {
  if (type === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
  if (type === "tablet") return <Tablet className="w-3.5 h-3.5" />;
  return <Laptop className="w-3.5 h-3.5" />;
}

export default function ProfileIntelligencePanel({ type, id }) {
  const [data, setData] = useState(null);
  const [eventType, setEventType] = useState("ALL");
  const [timelinePage, setTimelinePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadIntelligence = useCallback(async () => {
    if (!type || !id) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/admin/profiles/${encodeURIComponent(type)}/${encodeURIComponent(id)}/intelligence`,
        { params: { eventType, page: timelinePage, limit: 30 } }
      );
      setData(res.data?.data || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load activity intelligence."));
    } finally {
      setLoading(false);
    }
  }, [type, id, eventType, timelinePage]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  if (loading && !data) {
    return (
      <div className="border border-[#1b1717]/12 bg-[#ffffff] p-8 text-center text-xs uppercase tracking-widest text-[#1b1717]/50">
        Analyzing behavioral intelligence &amp; activity timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-4 text-xs text-[#5d100a]">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { identity, devices = [], liveCartItems = [], intelligence, timeline = [], timelinePagination } = data;
  const { intentStage, alerts = [], summary, topInterestedProducts = [], styleDna } = intelligence || {};

  return (
    <div className="space-y-6">
      {/* Top Intelligence Summary Strip */}
      <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1b1717]/10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Sparkles className="w-4 h-4 text-[#5d100a]" />
            <h3 className="heading-serif text-base sm:text-lg font-normal text-[#1b1717]">
              Behavioral Intelligence &amp; Activity Log
            </h3>
            {intentStage && (
              <span
                className={`px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-[2px] ${intentBadgeClass(
                  intentStage
                )}`}
              >
                {intentStage}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={loadIntelligence}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider border border-[#1b1717]/20 hover:border-[#1b1717] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#faf8f6] border border-[#1b1717]/10">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Active Time
            </span>
            <p className="mt-1 text-base font-semibold text-[#1b1717]">
              {formatDuration(summary?.totalActiveSeconds)}
            </p>
          </div>

          <div className="p-3 bg-[#faf8f6] border border-[#1b1717]/10">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Page Visits
            </span>
            <p className="mt-1 text-base font-semibold text-[#1b1717]">
              {summary?.totalPageViews || 0}
            </p>
          </div>

          <div className="p-3 bg-[#faf8f6] border border-[#1b1717]/10">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">
              Actions / Clicks
            </span>
            <p className="mt-1 text-base font-semibold text-[#1b1717]">
              {summary?.totalActions || 0}
            </p>
          </div>

          <div className="p-3 bg-[#faf8f6] border border-[#1b1717]/10">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">
              Known Devices
            </span>
            <p className="mt-1 text-base font-semibold text-[#1b1717]">
              {devices.length}
            </p>
          </div>
        </div>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.map((alertText, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 bg-[#5d100a]/[0.05] border-l-2 border-[#5d100a] text-xs text-[#1b1717]"
              >
                <AlertTriangle className="w-4 h-4 text-[#5d100a] shrink-0 mt-0.5" />
                <span>{alertText}</span>
              </div>
            ))}
          </div>
        )}

        {/* Linked Devices & Shared-Device Indicators */}
        {devices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#1b1717]/10 flex flex-wrap gap-2">
            {devices.map((d) => (
              <div
                key={d.deviceId}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] bg-[#faf8f6] border border-[#1b1717]/15"
              >
                <DeviceIcon type={d.deviceType} />
                <span className="font-mono font-semibold text-[#1b1717]">
                  {d.visitorCode}
                </span>
                <span className="text-[#1b1717]/60">
                  {d.osPlatform} • {d.browserFamily}
                </span>
                {d.isSharedDevice && (
                  <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-amber-100 text-amber-900 font-semibold">
                    Shared Device
                  </span>
                )}
                {d.isHighCollisionHardware && (
                  <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-[#1b1717]/10 text-[#1b1717]/70">
                    Uniform iOS
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {identity?.type === "visitor" && identity.linkedUsers?.length > 0 && (
          <div className="mt-3 text-[11px] text-[#1b1717]/65">
            Accounts previously used on this device:{" "}
            {identity.linkedUsers.map((u) => `${u.fullName} (${u.email})`).join(", ")}
          </div>
        )}
      </div>

      {/* Top Interested Products + Style DNA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 border border-[#1b1717]/15 bg-[#ffffff] p-5">
          <h4 className="heading-serif text-sm uppercase tracking-widest text-[#1b1717]/75 mb-4">
            Top Interested Products
          </h4>

          {topInterestedProducts.length === 0 ? (
            <p className="text-xs text-[#1b1717]/55">
              No product interest signals recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topInterestedProducts.map((p) => (
                <div
                  key={p.slug || p.productId}
                  className="flex items-center gap-3 p-2.5 border border-[#1b1717]/10 bg-[#faf8f6]"
                >
                  <div className="w-12 h-16 shrink-0 bg-[#1b1717]/5 overflow-hidden">
                    {p.primaryImage && (
                      <ResponsiveImage
                        src={p.primaryImage}
                        alt={p.title}
                        preset="thumb"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#1b1717] truncate">
                        {p.title}
                      </p>
                      <span className="text-xs font-bold text-[#5d100a] shrink-0">
                        {p.interestScore}/100
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#1b1717]/60">
                      {p.sku && <span className="font-mono">SKU: {p.sku}</span>}
                      <span>{p.visits} visit{p.visits === 1 ? "" : "s"}</span>
                      <span>Active: {formatDuration(p.activeSeconds)}</span>
                      {p.price > 0 && <span>{formatINR(p.price)}</span>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#1b1717]/10 overflow-hidden">
                        <div
                          className="h-full bg-[#5d100a]"
                          style={{ width: `${p.interestScore}%` }}
                        />
                      </div>
                      {p.inLiveCart && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-amber-100 text-amber-900 font-semibold">
                          In Bag
                        </span>
                      )}
                      {p.longCartDwell && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-[#5d100a] text-[#ffffff] font-semibold">
                          &gt;24h Bag
                        </span>
                      )}
                      {p.checkoutDropOff && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-red-100 text-[#5d100a] font-semibold">
                          Checkout Drop
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Style DNA + Live Cart */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5">
            <h4 className="heading-serif text-sm uppercase tracking-widest text-[#1b1717]/75 mb-4">
              Style DNA &amp; Preferences
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/50 block mb-1">
                  Favorite Categories
                </span>
                {styleDna?.categories?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {styleDna.categories.map((c) => (
                      <span
                        key={c.name}
                        className="px-2 py-1 bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-wider"
                      >
                        {c.name} ({c.sharePct}%)
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[#1b1717]/50">Not enough data yet</span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/50 block mb-1">
                  Fabrics &amp; Colors
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[...(styleDna?.fabrics || []), ...(styleDna?.colors || [])].map((x) => (
                    <span
                      key={x.name}
                      className="px-2 py-0.5 border border-[#1b1717]/20 text-[10px] uppercase tracking-wider"
                    >
                      {x.name}
                    </span>
                  ))}
                  {!styleDna?.fabrics?.length && !styleDna?.colors?.length && (
                    <span className="text-[#1b1717]/50">—</span>
                  )}
                </div>
              </div>

              {styleDna?.priceBand && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/50 block mb-1">
                    Browsed Price Band
                  </span>
                  <p className="font-medium text-[#1b1717]">
                    {formatINR(styleDna.priceBand.min)} – {formatINR(styleDna.priceBand.max)}{" "}
                    <span className="text-[#1b1717]/55 font-normal">
                      (Avg {formatINR(styleDna.priceBand.avg)})
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {liveCartItems.length > 0 && (
            <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5">
              <h4 className="heading-serif text-sm uppercase tracking-widest text-[#1b1717]/75 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#5d100a]" />
                <span>Live Cart ({liveCartItems.length})</span>
              </h4>
              <div className="space-y-2.5">
                {liveCartItems.map((it, idx) => (
                  <div
                    key={`${it.slug}-${it.size}-${idx}`}
                    className="flex items-center gap-3 p-2 bg-[#faf8f6] border border-[#1b1717]/10"
                  >
                    <div className="w-10 h-13 shrink-0 bg-[#1b1717]/5 overflow-hidden">
                      {it.primaryImage && (
                        <ResponsiveImage
                          src={it.primaryImage}
                          alt={it.title}
                          preset="thumb"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-medium text-[#1b1717] truncate">{it.title}</p>
                      <p className="text-[10px] text-[#1b1717]/60 font-mono">
                        {it.sku ? `SKU: ${it.sku} • ` : ""}Size {it.size} • Qty {it.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1b1717] shrink-0">
                      {formatINR((it.price || 0) * (it.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complete Chronological Timeline (dd/mm/yyyy • 12hr hh:mm:ss AM/PM) */}
      <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1b1717]/10">
          <h4 className="heading-serif text-sm uppercase tracking-widest text-[#1b1717]/80">
            Activity Timeline ({timelinePagination?.total || 0})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setEventType(f.id);
                  setTimelinePage(1);
                }}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
                  eventType === f.id
                    ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                    : "border-[#1b1717]/20 text-[#1b1717]/75 hover:border-[#1b1717]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {timeline.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#1b1717]/50">
            No matching activity events recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-[#1b1717]/10">
            {timeline.map((ev) => (
              <div key={ev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Date & 12-hr Time Stamp */}
                <div className="sm:w-36 shrink-0 text-[11px] font-mono text-[#1b1717]/65">
                  <div className="font-semibold text-[#1b1717]">{ev.date}</div>
                  <div>{ev.time}</div>
                </div>

                {/* Event Body */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest bg-[#1b1717] text-[#ffffff]">
                      {ev.type.replace("_", " ")}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[9px] uppercase tracking-widest border ${statusBadgeClass(
                        ev.status
                      )}`}
                    >
                      {ev.status}
                    </span>
                    {ev.mergedFromVisitor && (
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                        Pre-Login Visitor
                      </span>
                    )}
                    {ev.type === "PAGE_VIEW" && ev.activeDurationSec > 0 && (
                      <span className="px-2 py-0.5 text-[10px] bg-[#faf8f6] border border-[#1b1717]/15 text-[#1b1717] font-medium">
                        Active: {formatDuration(ev.activeDurationSec)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-[#1b1717]">
                    {ev.actionName || ev.pageName || ev.path}
                    {ev.path && ev.actionName && (
                      <span className="ml-2 text-[11px] font-normal text-[#1b1717]/50">
                        ({ev.path})
                      </span>
                    )}
                  </p>

                  {ev.meta?.reason && (
                    <p className="text-[11px] text-[#5d100a]">Reason: {ev.meta.reason}</p>
                  )}

                  {/* Inline Product Snapshot */}
                  {ev.product && (ev.product.title || ev.product.slug) && (
                    <div className="inline-flex items-center gap-2.5 p-2 bg-[#faf8f6] border border-[#1b1717]/10">
                      {ev.product.primaryImage && (
                        <div className="w-8 h-10 shrink-0 overflow-hidden bg-[#1b1717]/5">
                          <ResponsiveImage
                            src={ev.product.primaryImage}
                            alt={ev.product.title}
                            preset="thumb"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="text-[11px]">
                        <div className="font-medium text-[#1b1717]">{ev.product.title}</div>
                        <div className="text-[10px] text-[#1b1717]/60 font-mono">
                          {ev.product.sku ? `SKU: ${ev.product.sku}` : ev.product.slug}
                          {ev.product.size ? ` • Size ${ev.product.size}` : ""}
                          {ev.product.price > 0 ? ` • ${formatINR(ev.product.price)}` : ""}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Cart Snapshot Items */}
                  {Array.isArray(ev.cartItems) && ev.cartItems.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {ev.cartItems.map((ci, i) => (
                        <div
                          key={`${ci.slug}-${i}`}
                          className="inline-flex items-center gap-2 p-1.5 bg-[#faf8f6] border border-[#1b1717]/10 text-[11px]"
                        >
                          {ci.primaryImage && (
                            <div className="w-7 h-9 shrink-0 overflow-hidden bg-[#1b1717]/5">
                              <ResponsiveImage
                                src={ci.primaryImage}
                                alt={ci.title}
                                preset="thumb"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-[#1b1717]">{ci.title}</div>
                            <div className="text-[10px] text-[#1b1717]/60 font-mono">
                              {ci.sku ? `SKU: ${ci.sku} • ` : ""}
                              {ci.size ? `${ci.size} × ${ci.quantity}` : `Qty ${ci.quantity}`}
                            </div>
                          </div>
                        </div>
                      ))}
                      {ev.cartTotal > 0 && (
                        <span className="self-center text-[11px] font-semibold text-[#1b1717] px-2">
                          Total: {formatINR(ev.cartTotal)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline Pagination */}
        {timelinePagination && timelinePagination.totalPages > 1 && (
          <div className="mt-4 pt-3 border-t border-[#1b1717]/10 flex items-center justify-between text-xs">
            <span className="text-[#1b1717]/60">
              Page {timelinePagination.page} of {timelinePagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={timelinePage <= 1}
                onClick={() => setTimelinePage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#1b1717]/20 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={timelinePage >= timelinePagination.totalPages}
                onClick={() => setTimelinePage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#1b1717]/20 disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}