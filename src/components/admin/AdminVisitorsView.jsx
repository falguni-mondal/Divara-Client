"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Eye, ArrowLeft, Laptop, Smartphone, Tablet } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import ProfileIntelligencePanel from "./ProfileIntelligencePanel";

function formatDuration(sec = 0) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function DeviceIcon({ type }) {
  if (type === "mobile") return <Smartphone className="w-4 h-4 text-[#1b1717]/60" />;
  if (type === "tablet") return <Tablet className="w-4 h-4 text-[#1b1717]/60" />;
  return <Laptop className="w-4 h-4 text-[#1b1717]/60" />;
}

export default function AdminVisitorsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlVisitorId = searchParams.get("visitor") || "";
  const urlVPage = Math.max(1, parseInt(searchParams.get("vpage") || "1", 10) || 1);

  const [visitors, setVisitors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVisitorMeta, setSelectedVisitorMeta] = useState(null);

  const updateUrlParams = useCallback(
    (mutate) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setVPage = (nextPage) => {
    updateUrlParams((p) => {
      if (nextPage > 1) p.set("vpage", String(nextPage));
      else p.delete("vpage");
    });
  };

  const openVisitor = (v) => {
    setSelectedVisitorMeta(v);
    updateUrlParams((p) => {
      p.set("sub", "visitors");
      p.set("visitor", v.deviceId);
    });
  };

  const closeVisitor = () => {
    setSelectedVisitorMeta(null);
    updateUrlParams((p) => {
      p.delete("visitor");
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadVisitors = useCallback(async () => {
    if (urlVisitorId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/visitors", {
        params: {
          page: urlVPage,
          limit: 15,
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
      });
      setVisitors(data.data?.visitors || []);
      if (data.data?.pagination) setPagination(data.data.pagination);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load visitors."));
    } finally {
      setLoading(false);
    }
  }, [urlVisitorId, urlVPage, debouncedSearch]);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  // Direct URL reload or View click -> renders full ProfileIntelligencePanel immediately
  if (urlVisitorId) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeVisitor}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#1b1717]/75 hover:text-[#5d100a] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Anonymous Visitors</span>
          </button>

          {selectedVisitorMeta && (
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-[#1b1717]">
                {selectedVisitorMeta.visitorCode}
              </span>
              <p className="text-[11px] text-[#1b1717]/55">
                {selectedVisitorMeta.osPlatform} • {selectedVisitorMeta.browserFamily}
              </p>
            </div>
          )}
        </div>

        <ProfileIntelligencePanel type="visitor" id={urlVisitorId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1b1717]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (urlVPage !== 1) setVPage(1);
            }}
            placeholder="Search by Visitor ID (VIS-...), OS, or Browser..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#1b1717]/20 focus:border-[#1b1717] outline-none bg-[#ffffff]"
          />
        </div>
        <span className="text-xs uppercase tracking-widest text-[#1b1717]/55">
          {pagination.total} Recognized Device{pagination.total === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-[#5d100a]">
          {error}
        </div>
      )}

      <div className="border border-[#1b1717]/15 bg-[#ffffff] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#1b1717]/15 bg-[#faf8f6] text-[10px] uppercase tracking-widest text-[#1b1717]/65">
              <th className="py-3 px-4">Visitor ID</th>
              <th className="py-3 px-4">Device</th>
              <th className="py-3 px-4">Pages / Active</th>
              <th className="py-3 px-4">Last Active (IST)</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[#1b1717]/50">
                  Loading visitors...
                </td>
              </tr>
            ) : visitors.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[#1b1717]/50">
                  No anonymous visitor profiles recorded yet.
                </td>
              </tr>
            ) : (
              visitors.map((v) => (
                <tr
                  key={v.deviceId}
                  onClick={() => openVisitor(v)}
                  className="hover:bg-[#faf8f6] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-[#1b1717]">
                      {v.visitorCode}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.isSharedDevice && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-amber-100 text-amber-900">
                          Shared ({v.linkedAccountsCount} accts)
                        </span>
                      )}
                      {v.isHighCollisionHardware && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-[#1b1717]/10 text-[#1b1717]/70">
                          Uniform iOS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="inline-flex items-center gap-2">
                      <DeviceIcon type={v.deviceType} />
                      <span>
                        {v.osPlatform} • {v.browserFamily}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-[#1b1717]">
                      {v.pageViews} pages
                    </span>
                    <span className="text-[#1b1717]/55">
                      {" "}
                      • {formatDuration(v.totalActiveSeconds)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <div>{v.lastSeenDate}</div>
                    <div className="text-[#1b1717]/60">{v.lastSeenTime}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openVisitor(v);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest border border-[#1b1717]/25 hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-2">
          <span className="text-[#1b1717]/60">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={urlVPage <= 1}
              onClick={() => setVPage(Math.max(1, urlVPage - 1))}
              className="px-3 py-1.5 border border-[#1b1717]/20 disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={urlVPage >= pagination.totalPages}
              onClick={() => setVPage(urlVPage + 1)}
              className="px-3 py-1.5 border border-[#1b1717]/20 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}