"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import UrlPagination, { useUrlPageParam } from "./UrlPagination";

export default function AdminLogsTab() {
  const [page, setPage] = useUrlPageParam("page");
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/logs", {
        params: {
          page,
          limit: 25,
          ...(emailFilter.trim() ? { email: emailFilter.trim() } : {}),
          ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        },
      });
      setLogs(data.data?.logs || []);
      if (data.data?.pagination) setPagination(data.data.pagination);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, emailFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Security &amp; Accountability
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Admin Audit Logs ({pagination.total})
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#1b1717]/25 text-xs uppercase tracking-widest hover:border-[#5d100a] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={emailFilter}
          onChange={(e) => {
            setEmailFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by admin email..."
          className="border border-[#1b1717]/25 px-3.5 py-2 text-xs outline-none focus:border-[#5d100a] w-full sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-[#1b1717]/25 px-3.5 py-2 text-xs uppercase tracking-wider outline-none focus:border-[#5d100a] bg-[#ffffff]"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success Only</option>
          <option value="FAILED">Failed Attempts Only</option>
        </select>
      </div>

      <div className="border border-[#1b1717]/15 overflow-x-auto bg-[#ffffff]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4">Timestamp (IST)</th>
              <th className="py-3 px-4">Admin</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Summary</th>
              <th className="py-3 px-4">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#1b1717]/55">
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#1b1717]/55">
                  No matching audit entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-[#1b1717]/[0.02]">
                  <td className="py-3 px-4 whitespace-nowrap text-[#1b1717]/70">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{log.actorEmail}</div>
                    <div className="text-[10px] uppercase text-[#1b1717]/50">{log.actorRole}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">{log.action}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${
                        log.status === "FAILED"
                          ? "bg-[#5d100a] text-[#ffffff]"
                          : "border border-[#1b1717]/25 text-[#1b1717]"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-md">{log.summary}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#1b1717]/60">
                    {log.ipAddress || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UrlPagination
        page={page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        onPageChange={setPage}
      />
    </div>
  );
}