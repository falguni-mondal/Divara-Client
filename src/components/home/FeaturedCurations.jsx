"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import SectionHeading from "@/components/ui/SectionHeading";
import { PRODUCTS, formatINR } from "@/data/catalogData";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "saree", label: "Sarees" },
  { id: "dress", label: "Dresses" },
  { id: "shirt", label: "Shirts" },
  { id: "denim", label: "Denim Wears" },
];

export default function FeaturedCurations() {
  const [activeTab, setActiveTab] = useState("all");
  const gridRef = useRef(null);
  const { refreshScroll } = useSmoothScroll();

  const filteredProducts =
    activeTab === "all"
      ? PRODUCTS.slice(0, 4)
      : PRODUCTS.filter((p) => p.category === activeTab);

  useGSAP(
    () => {
      const items = gridRef.current?.querySelectorAll(".product-card-anim");
      if (!items || items.length === 0) return;

      gsap.fromTo(
        items,
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.08,
          ease: "power3.out",
          onComplete: () => refreshScroll(),
        }
      );
    },
    { dependencies: [activeTab], scope: gridRef }
  );

  return (
    <section
      id="featured-curations-section"
      className="w-full py-16 sm:py-24 px-[3vw] lg:px-10 max-w-[1440px] mx-auto"
    >
      <div className="flex flex-col items-center justify-between gap-6">
        <SectionHeading text="Featured Curations" />

        <div className="flex flex-wrap items-center justify-center gap-2">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors duration-300 cursor-pointer border rounded-[2px] ${
                  isActive
                    ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                    : "bg-transparent text-[#1b1717] border-[#1b1717]/20 hover:border-[#1b1717]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={gridRef}
        className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {filteredProducts.map((product) => (
          <Link
            key={product.id}
            href={`/shop/${product.slug}`}
            className="product-card-anim group flex flex-col"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#1b1717]/5">
              <img
                src={product.image}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">
                {product.categoryLabel} • {product.season}
              </span>
              <h3 className="heading-serif text-sm sm:text-base font-normal text-[#1b1717] group-hover:text-[#5d100a] transition-colors line-clamp-1">
                {product.title}
              </h3>
              <span className="text-xs font-medium text-[#1b1717]">
                {formatINR(product.price)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}