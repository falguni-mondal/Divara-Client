"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, Link2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/data/catalogData";
import SmartDateRange, { getPresetRange } from "./SmartDateRange";

export default function AdminOverview({ onOpenUtm }) {
  const [dateRange, setDateRange] = useState(() => getPresetRange("30d"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async (range) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/overview", {
        params: { from: range.from, to: range.to },
      });
      setData(res.data?.data || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview(dateRange);
  }, [dateRange, loadOverview]);

  const kpis = data?.kpis || {};
  const spanDays = data?.range?.days || 30;

  const primaryCards = [
    {
      label: "Paid Revenue",
      value: formatINR(kpis.totalRevenueInr || 0),
      sub: `${kpis.paidOrders || 0} paid / ${kpis.totalOrders || 0} total orders`,
    },
    {
      label: "Average Order Value",
      value: formatINR(kpis.aovInr || 0),
      sub: `Discounts given: ${formatINR(kpis.totalDiscountInr || 0)}`,
    },
    {
      label: `Storefront Visits (${spanDays}d)`,
      value: (kpis.totalVisits || 0).toLocaleString("en-IN"),
      sub: `${(kpis.uniqueVisitors || 0).toLocaleString("en-IN")} unique sessions`,
    },
    {
      label: "Visit-to-Order Conv.",
      value: `${kpis.visitConversionRate || 0}%`,
      sub: `Payment success: ${kpis.paymentSuccessRate || 0}%`,
    },
    {
      label: "Repeat Customer Rate",
      value: `${kpis.repeatCustomerRate || 0}%`,
      sub: `${kpis.customers || 0} registered customers`,
    },
    {
      label: "Atelier Operations",
      value: `${kpis.activeProducts || 0} Pieces`,
      sub: `${kpis.openTickets || 0} open tickets • ${kpis.pendingReviews || 0} pending reviews`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Atelier Telemetry &amp; Attribution
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Executive Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onOpenUtm && (
            <button
              type="button"
              onClick={onOpenUtm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-[10px] uppercase tracking-[0.18em] font-semibold rounded-[2px] transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>UTM Generator</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadOverview(dateRange)}
            aria-label="Refresh Dashboard"
            className="p-2 border border-[#1b1717]/20 hover:border-[#1b1717] rounded-[2px] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Smart From/To Date Filter */}
      <SmartDateRange from={dateRange.from} to={dateRange.to} onChange={setDateRange} />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {primaryCards.map((c) => (
          <div key={c.label} className="border border-[#1b1717]/15 p-5 bg-[#ffffff]">
            <span className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/55">
              {c.label}
            </span>
            <p className="heading-serif text-2xl sm:text-3xl font-normal mt-2 text-[#1b1717]">
              {loading ? "—" : c.value}
            </p>
            <span className="block text-[11px] text-[#1b1717]/60 mt-1.5">{c.sub}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 border border-[#1b1717]/15 p-5 bg-[#ffffff]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-serif text-lg font-normal">
              Revenue &amp; Visitor Trend ({dateRange.from} → {dateRange.to})
            </h2>
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#1b1717]/50">
              Maroon: Revenue (₹) • Noir: Visits
            </span>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b171715" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="rev" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="vis" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  yAxisId="rev"
                  type="monotone"
                  dataKey="revenueInr"
                  name="Revenue (₹)"
                  stroke="#5d100a"
                  fill="#5d100a"
                  fillOpacity={0.14}
                />
                <Area
                  yAxisId="vis"
                  type="monotone"
                  dataKey="visits"
                  name="Visits"
                  stroke="#1b1717"
                  fill="#1b1717"
                  fillOpacity={0.07}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-4 border border-[#1b1717]/15 p-5 bg-[#ffffff]">
          <h2 className="heading-serif text-lg font-normal mb-4">Orders by Status</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.statusBreakdown || []}>
                <XAxis dataKey="status" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Orders" fill="#5d100a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Traffic Sources & Top Referrers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="border border-[#1b1717]/15 p-5 bg-[#ffffff]">
          <h2 className="heading-serif text-lg font-normal mb-4">Top Traffic Sources</h2>
          {(data?.trafficSources || []).length === 0 ? (
            <p className="text-xs text-[#1b1717]/55">No visits recorded in this date range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#1b1717]/15 text-[10px] uppercase tracking-wider text-[#1b1717]/55">
                  <tr>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 px-2">Visits</th>
                    <th className="py-2 px-2">Unique</th>
                    <th className="py-2 px-2">Orders</th>
                    <th className="py-2 pl-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1717]/10">
                  {data.trafficSources.map((src) => (
                    <tr key={src.source}>
                      <td className="py-2.5 pr-3 font-medium uppercase text-[11px]">{src.source}</td>
                      <td className="py-2.5 px-2">{src.visits}</td>
                      <td className="py-2.5 px-2">{src.uniqueVisitors}</td>
                      <td className="py-2.5 px-2">{src.orders}</td>
                      <td className="py-2.5 pl-2 text-right font-medium">
                        {formatINR(src.revenueInr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border border-[#1b1717]/15 p-5 bg-[#ffffff]">
          <h2 className="heading-serif text-lg font-normal mb-4">Top Referral Partners</h2>
          {(data?.topReferrers || []).length === 0 ? (
            <p className="text-xs text-[#1b1717]/55">No person-specific referrals in this date range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#1b1717]/15 text-[10px] uppercase tracking-wider text-[#1b1717]/55">
                  <tr>
                    <th className="py-2 pr-3">Partner / Person</th>
                    <th className="py-2 px-2">Visits</th>
                    <th className="py-2 px-2">Orders</th>
                    <th className="py-2 px-2">Conv.</th>
                    <th className="py-2 pl-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1717]/10">
                  {data.topReferrers.map((ref) => (
                    <tr key={ref.person}>
                      <td className="py-2.5 pr-3 font-medium text-[#5d100a]">{ref.person}</td>
                      <td className="py-2.5 px-2">{ref.visits}</td>
                      <td className="py-2.5 px-2">{ref.orders}</td>
                      <td className="py-2.5 px-2">{ref.conversionRate}%</td>
                      <td className="py-2.5 pl-2 text-right font-medium">
                        {formatINR(ref.revenueInr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Top Selling Pieces + Low Stock Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="border border-[#1b1717]/15 p-5 bg-[#ffffff]">
          <h2 className="heading-serif text-lg font-normal mb-4">Top Selling Pieces</h2>
          {(data?.topProducts || []).length === 0 ? (
            <p className="text-xs text-[#1b1717]/55">No paid product sales in this date range.</p>
          ) : (
            <div className="divide-y divide-[#1b1717]/10">
              {data.topProducts.map((p) => (
                <div key={p.slug} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <span className="text-[10px] uppercase tracking-wider text-[#1b1717]/55">
                      {p.category} • {p.unitsSold} sold
                    </span>
                  </div>
                  <span className="font-semibold shrink-0">{formatINR(p.revenueInr)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-[#1b1717]/15 p-5 bg-[#ffffff]">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#5d100a]" />
            <h2 className="heading-serif text-lg font-normal">Low Stock Alerts (≤ 3 Units)</h2>
          </div>
          {(data?.lowStockAlerts || []).length === 0 ? (
            <p className="text-xs text-[#1b1717]/55">All active product variants have healthy stock.</p>
          ) : (
            <div className="divide-y divide-[#1b1717]/10 max-h-64 overflow-y-auto">
              {data.lowStockAlerts.map((item) => (
                <div key={`${item.slug}-${item.size}`} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <span className="text-[10px] uppercase tracking-wider text-[#1b1717]/55">
                      Size {item.size} • SKU {item.sku}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-[2px] ${
                      item.available === 0
                        ? "bg-[#5d100a] text-[#ffffff]"
                        : "bg-[#5d100a]/10 text-[#5d100a]"
                    }`}
                  >
                    {item.available === 0 ? "Out of Stock" : `${item.available} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}