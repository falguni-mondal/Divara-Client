"use client";

import React from "react";

export function SkeletonBox({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[#1b1717]/[0.07] rounded-[2px] ${className}`}
    />
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-[3vw] sm:gap-x-5 lg:gap-x-6 gap-y-8 lg:gap-y-10">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <SkeletonBox className="w-full aspect-[3/4]" />
          <SkeletonBox className="h-2.5 w-2/3" />
          <SkeletonBox className="h-4 w-5/6" />
          <SkeletonBox className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function OrderCardsSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-[#1b1717]/15 p-5 space-y-3 bg-[#ffffff]">
          <div className="flex items-center justify-between gap-4">
            <SkeletonBox className="h-4 w-40" />
            <SkeletonBox className="h-5 w-24" />
          </div>
          <SkeletonBox className="h-3 w-2/3" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 6, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="py-3.5 px-4">
              <SkeletonBox className="h-3.5 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-[#1b1717]/15 p-5 space-y-3 bg-[#ffffff]">
            <SkeletonBox className="h-2.5 w-28" />
            <SkeletonBox className="h-7 w-36" />
            <SkeletonBox className="h-2.5 w-44" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <SkeletonBox className="xl:col-span-8 h-72" />
        <SkeletonBox className="xl:col-span-4 h-72" />
      </div>
    </div>
  );
}