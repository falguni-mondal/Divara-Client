"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function useUrlPageParam(paramName = "page") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = Number(searchParams.get(paramName));
  const page = Number.isInteger(raw) && raw >= 1 ? raw : 1;

  const setPage = (nextPage) => {
    const safe = Math.max(1, Number(nextPage) || 1);
    const params = new URLSearchParams(searchParams.toString());
    if (safe === 1) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(safe));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return [page, setPage];
}

export default function UrlPagination({ page, totalPages, totalItems, onPageChange }) {
  if (!totalPages || totalPages <= 1) {
    return totalItems !== undefined ? (
      <div className="text-[11px] text-[#1b1717]/55">
        Showing {totalItems} {totalItems === 1 ? "record" : "records"}
      </div>
    ) : null;
  }

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1b1717]/15 text-xs">
      <span className="text-[11px] text-[#1b1717]/60">
        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        {totalItems !== undefined ? ` (${totalItems} total)` : ""}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#1b1717]/20 hover:border-[#1b1717] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-2.5 py-1.5 border border-[#1b1717]/20 hover:border-[#1b1717] cursor-pointer"
            >
              1
            </button>
            {start > 2 && <span className="px-1 text-[#1b1717]/40">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`px-2.5 py-1.5 border cursor-pointer ${
              p === page
                ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a] font-semibold"
                : "border-[#1b1717]/20 hover:border-[#1b1717]"
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-[#1b1717]/40">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="px-2.5 py-1.5 border border-[#1b1717]/20 hover:border-[#1b1717] cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#1b1717]/20 hover:border-[#1b1717] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}