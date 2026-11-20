"use client";

import React from "react";
import { Calendar, RotateCcw } from "lucide-react";

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function getPresetRange(preset) {
  const today = new Date();
  const to = toIsoDate(today);

  if (preset === "today") {
    return { from: to, to };
  }
  if (preset === "7d") {
    const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { from: toIsoDate(start), to };
  }
  if (preset === "30d") {
    const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    return { from: toIsoDate(start), to };
  }
  if (preset === "90d") {
    const start = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000);
    return { from: toIsoDate(start), to };
  }
  if (preset === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toIsoDate(start), to };
  }
  if (preset === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toIsoDate(start), to: toIsoDate(end) };
  }
  return { from: "", to: "" };
}

export default function SmartDateRange({
  from,
  to,
  onChange,
  allowAllTime = false,
}) {
  const todayStr = toIsoDate(new Date());

  const presets = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7D" },
    { id: "30d", label: "30D" },
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "90d", label: "90D" },
    ...(allowAllTime ? [{ id: "all", label: "All Time" }] : []),
  ];

  const handleFromChange = (nextFrom) => {
    if (to && nextFrom && nextFrom > to) {
      onChange({ from: nextFrom, to: nextFrom });
    } else {
      onChange({ from: nextFrom, to });
    }
  };

  const handleToChange = (nextTo) => {
    if (from && nextTo && nextTo < from) {
      onChange({ from: nextTo, to: nextTo });
    } else {
      onChange({ from, to: nextTo });
    }
  };

  return (
    <div className="border border-[#1b1717]/15 p-3.5 bg-[#ffffff] flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[9px] uppercase tracking-[0.18em] text-[#1b1717]/60 font-semibold mb-1">
            From Date
          </label>
          <input
            type="date"
            value={from}
            max={to || todayStr}
            onChange={(e) => handleFromChange(e.target.value)}
            className="border border-[#1b1717]/25 px-2.5 py-1.5 text-xs outline-none focus:border-[#5d100a]"
          />
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-[0.18em] text-[#1b1717]/60 font-semibold mb-1">
            To Date
          </label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={todayStr}
            onChange={(e) => handleToChange(e.target.value)}
            className="border border-[#1b1717]/25 px-2.5 py-1.5 text-xs outline-none focus:border-[#5d100a]"
          />
        </div>

        {(from || to) && allowAllTime && (
          <button
            type="button"
            onClick={() => onChange({ from: "", to: "" })}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] uppercase tracking-wider border border-[#1b1717]/20 hover:border-[#5d100a] text-[#5d100a] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-[#5d100a] mr-1 hidden sm:block" />
        {presets.map((p) => {
          const range = p.id === "all" ? { from: "", to: "" } : getPresetRange(p.id);
          const active = range.from === from && range.to === to;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(range)}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-wider border rounded-[2px] cursor-pointer transition-colors ${
                active
                  ? "bg-[#1b1717] text-[#ffffff] border-[#1b1717]"
                  : "border-[#1b1717]/20 text-[#1b1717]/75 hover:border-[#1b1717]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}