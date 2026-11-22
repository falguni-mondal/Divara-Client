import React from "react";

export default function ProductDetailLoading() {
  return (
    <div className="w-full min-h-screen bg-[#ffffff] pt-20 lg:pt-28 pb-16 lg:pb-24">
      <div className="max-w-[1440px] mx-auto px-[3vw] lg:px-10">
        <div className="h-4 w-36 bg-[#1b1717]/[0.07] animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            <div className="flex sm:flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="shrink-0 w-16 sm:w-20 aspect-[3/4] bg-[#1b1717]/[0.07] animate-pulse"
                />
              ))}
            </div>
            <div className="flex-1 aspect-[3/4] bg-[#1b1717]/[0.07] animate-pulse" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="h-3.5 w-44 bg-[#1b1717]/[0.06] animate-pulse" />
            <div className="h-9 w-4/5 bg-[#1b1717]/[0.08] animate-pulse" />
            <div className="h-6 w-28 bg-[#1b1717]/[0.07] animate-pulse" />
            <div className="h-20 w-full bg-[#1b1717]/[0.05] animate-pulse" />
            <div className="flex gap-2 pt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-14 bg-[#1b1717]/[0.07] animate-pulse" />
              ))}
            </div>
            <div className="h-24 w-full bg-[#1b1717]/[0.05] animate-pulse mt-4" />
            <div className="h-12 w-full bg-[#1b1717]/[0.09] animate-pulse mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}