"use client";

import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown, X, Check } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FILTER_OPTIONS, formatINR } from "@/data/catalogData";
import { useLiveCatalog } from "@/hooks/useLiveCatalog";
import { useSeasonAndYear } from "@/utils/season";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "name-asc", label: "Alphabetical: A–Z" },
];

const MIN_PRICE_LIMIT = 0;
const MAX_PRICE_LIMIT = 150000;
const PRICE_STEP = 1000;

function normalizeSeasonParam(param) {
  if (!param) return "All";
  const found = FILTER_OPTIONS.seasons.find(
    (s) => s.toLowerCase() === param.trim().toLowerCase()
  );
  return found || "All";
}

function CollectionsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialSeason = normalizeSeasonParam(searchParams.get("season"));
  const initialSearchQuery = searchParams.get("q") || "";

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [selectedColor, setSelectedColor] = useState("All");
  const [selectedFabric, setSelectedFabric] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [minPrice, setMinPrice] = useState(MIN_PRICE_LIMIT);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_LIMIT);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortBy, setSortBy] = useState("featured");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const pageRef = useRef(null);
  const heroBgRef = useRef(null);
  const catalogSectionRef = useRef(null);
  const sortRef = useRef(null);
  const { currentSeason, seasonAndYear } = useSeasonAndYear();
  const { refreshScroll, scrollTo } = useSmoothScroll();

  const { items: liveProducts, loading: catalogLoading } = useLiveCatalog({
    limit: 100,
    sort: "featured",
  });

  // Always sync and reset when URL query parameters change (including clearing back to /collections)
  useEffect(() => {
    setSelectedCategory(searchParams.get("category") || "all");
    setSelectedSeason(normalizeSeasonParam(searchParams.get("season")));
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPriceFiltered =
    minPrice > MIN_PRICE_LIMIT || maxPrice < MAX_PRICE_LIMIT;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (selectedSeason !== "All") count++;
    if (selectedColor !== "All") count++;
    if (selectedFabric !== "All") count++;
    if (selectedSize !== "All") count++;
    if (isPriceFiltered) count++;
    if (searchQuery.trim() !== "") count++;
    return count;
  }, [
    selectedCategory,
    selectedSeason,
    selectedColor,
    selectedFabric,
    selectedSize,
    isPriceFiltered,
    searchQuery,
  ]);

  const resetAllFilters = () => {
    setSelectedCategory("all");
    setSelectedSeason("All");
    setSelectedColor("All");
    setSelectedFabric("All");
    setSelectedSize("All");
    setMinPrice(MIN_PRICE_LIMIT);
    setMaxPrice(MAX_PRICE_LIMIT);
    setSearchQuery("");
  };

  const handleHeroSeasonFilter = () => {
    setSelectedSeason(currentSeason);
    if (catalogSectionRef.current) {
      scrollTo(catalogSectionRef.current, { offset: -60 });
    }
  };

  const handleMinPriceChange = (e) => {
    const val = Math.min(Number(e.target.value), maxPrice - PRICE_STEP);
    setMinPrice(val);
  };

  const handleMaxPriceChange = (e) => {
    const val = Math.max(Number(e.target.value), minPrice + PRICE_STEP);
    setMaxPrice(val);
  };

  const minPercent =
    ((minPrice - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100;
  const maxPercent =
    ((maxPrice - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100;

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(liveProducts) ? [...liveProducts] : [];

    if (searchQuery.trim() !== "") {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.categoryLabel || p.category || "").toLowerCase().includes(q) ||
          (p.season || "").toLowerCase().includes(q) ||
          (p.fabric || "").toLowerCase().includes(q) ||
          (p.color || "").toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (selectedSeason !== "All") {
      list = list.filter((p) => p.season === selectedSeason);
    }
    if (selectedColor !== "All") {
      list = list.filter(
        (p) => (p.color || "").toLowerCase() === selectedColor.toLowerCase()
      );
    }
    if (selectedFabric !== "All") {
      list = list.filter(
        (p) => (p.fabric || "").toLowerCase() === selectedFabric.toLowerCase()
      );
    }
    if (selectedSize !== "All") {
      list = list.filter((p) => (p.sizes || []).includes(selectedSize));
    }

    list = list.filter(
      (p) => (p.price || 0) >= minPrice && (p.price || 0) <= maxPrice
    );

    if (sortBy === "price-asc") {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return list;
  }, [
    liveProducts,
    searchQuery,
    selectedCategory,
    selectedSeason,
    selectedColor,
    selectedFabric,
    selectedSize,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshScroll();
    }, 100);
    return () => clearTimeout(timer);
  }, [filteredProducts, isFilterOpen, refreshScroll]);

  useGSAP(
    () => {
      gsap.fromTo(
        ".catalog-header-reveal",
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      if (heroBgRef.current) {
        gsap.fromTo(
          heroBgRef.current,
          { yPercent: -8 },
          {
            yPercent: 12,
            ease: "none",
            scrollTrigger: {
              trigger: heroBgRef.current.parentElement,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }

      gsap.fromTo(
        ".catalog-bar-reveal",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: {
            trigger: ".catalog-main-section",
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: pageRef }
  );

  useGSAP(
    () => {
      if (catalogLoading) return;
      const cards = pageRef.current?.querySelectorAll(".product-card-item");
      if (!cards || cards.length === 0) return;

      gsap.fromTo(
        cards,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.06,
          ease: "power3.out",
          overwrite: "auto",
          clearProps: "transform",
          scrollTrigger: {
            trigger: ".catalog-grid-container",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: pageRef, dependencies: [filteredProducts, catalogLoading] }
  );

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "Featured";

  return (
    <div ref={pageRef} className="w-full min-h-screen bg-[#ffffff] text-[#1b1717]">
      <section className="relative w-full h-[50vh] lg:h-[56vh] overflow-hidden flex items-end">
        <picture
          ref={heroBgRef}
          className="absolute -top-[10%] left-0 w-full h-[120%] will-change-transform"
        >
          <source media="(min-width: 1024px)" srcSet="/bg/collection.webp" />
          <img
            src="/bg/collection_mobile.webp"
            alt={`${seasonAndYear} Collection`}
            className="w-full h-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-[3vw] lg:px-10 pb-8 lg:pb-12 text-[#ffffff] flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <span className="catalog-header-reveal block text-[3vw] sm:text-xs uppercase tracking-[0.22em] text-[#ffffff]/75 mb-2">
              {seasonAndYear}
            </span>
            <h1 className="catalog-header-reveal heading-serif text-[7.5vw] sm:text-3xl lg:text-[40px] font-normal tracking-tight leading-tight">
              The Collection
            </h1>
          </div>

          <div className="catalog-header-reveal">
            <button
              type="button"
              onClick={handleHeroSeasonFilter}
              className={`px-5 py-2.5 sm:px-6 sm:py-3 text-xs uppercase tracking-[0.18em] font-medium rounded-[3px] border backdrop-blur-[7px] transition-colors duration-300 cursor-pointer ${
                selectedSeason === currentSeason
                  ? "bg-[#ffffff] text-[#1b1717] border-[#ffffff]"
                  : "bg-[#ffffff15] text-[#ffffff] border-[#ffffff] hover:bg-[#ffffff] hover:text-[#1b1717]"
              }`}
            >
              Filter {currentSeason} collection
            </button>
          </div>
        </div>
      </section>

      <section
        ref={catalogSectionRef}
        className="catalog-main-section max-w-[1440px] mx-auto px-[3vw] lg:px-10 py-8 lg:py-12"
      >
        <div className="catalog-bar-reveal flex items-center justify-between border-y border-[#1b1717]/15 py-3.5 gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2.5 px-4 py-2 text-xs uppercase tracking-widest border rounded-[2px] transition-colors duration-300 cursor-pointer ${
                isFilterOpen || activeFilterCount > 0
                  ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                  : "bg-transparent text-[#1b1717] border-[#1b1717]/30 hover:border-[#1b1717]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-[#ffffff] text-[#5d100a] text-[10px] font-semibold rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {selectedSeason !== "All" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
                <span>Season: {selectedSeason}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSeason("All")}
                  aria-label="Remove Season Filter"
                  className="hover:text-[#5d100a] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-[11px] uppercase tracking-wider underline text-[#5d100a] hover:text-[#1b1717] transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <span className="hidden md:inline-block text-xs uppercase tracking-widest text-[#1b1717]/60">
            {catalogLoading
              ? "Loading..."
              : `${filteredProducts.length} ${
                  filteredProducts.length === 1 ? "Item" : "Items"
                }`}
          </span>

          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs uppercase tracking-widest border border-[#1b1717]/30 hover:border-[#1b1717] rounded-[2px] bg-transparent text-[#1b1717] transition-colors cursor-pointer"
            >
              <span className="text-[#1b1717]/60 hidden sm:inline">Sort:</span>
              <span className="font-medium">{currentSortLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isSortOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            <div
              className={`absolute right-0 top-full mt-2 w-52 bg-[#ffffff] border border-[#1b1717]/20 shadow-lg z-30 transition-all duration-200 origin-top-right ${
                isSortOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <ul className="py-1.5">
                {SORT_OPTIONS.map((option) => {
                  const isSelected = sortBy === option.id;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy(option.id);
                          setIsSortOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-xs uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#5d100a] text-[#ffffff] font-medium"
                            : "text-[#1b1717] hover:bg-[#1b1717]/5"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-400 ease-in-out ${
            isFilterOpen
              ? "grid-rows-[1fr] opacity-100 border-b border-[#1b1717]/15"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <div>
                <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 mb-3 font-semibold">
                  Outfit Type
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                          : "border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 mb-3 font-semibold">
                  Season
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.seasons.map((season) => (
                    <button
                      key={season}
                      type="button"
                      onClick={() => setSelectedSeason(season)}
                      className={`px-2.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                        selectedSeason === season
                          ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                          : "border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
                      }`}
                    >
                      {season}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 mb-3 font-semibold">
                  Color
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                        selectedColor === c.name
                          ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                          : "border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
                      }`}
                    >
                      {c.hex && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: c.hex }}
                        />
                      )}
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 mb-3 font-semibold">
                  Fabric
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.fabrics.map((fabric) => (
                    <button
                      key={fabric}
                      type="button"
                      onClick={() => setSelectedFabric(fabric)}
                      className={`px-2.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                        selectedFabric === fabric
                          ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                          : "border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
                      }`}
                    >
                      {fabric}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 mb-3 font-semibold">
                  Size
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-2.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                        selectedSize === size
                          ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                          : "border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 font-semibold">
                    Price Range
                  </h3>
                  {isPriceFiltered && (
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice(MIN_PRICE_LIMIT);
                        setMaxPrice(MAX_PRICE_LIMIT);
                      }}
                      className="text-[10px] uppercase tracking-wider text-[#5d100a] underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-[#1b1717] mb-3">
                  <span>{formatINR(minPrice)}</span>
                  <span className="text-[#1b1717]/40">—</span>
                  <span>{formatINR(maxPrice)}</span>
                </div>

                <div className="relative h-6 flex items-center">
                  <div className="w-full h-[3px] bg-[#1b1717]/15 relative rounded-full">
                    <div
                      style={{
                        left: `${minPercent}%`,
                        width: `${maxPercent - minPercent}%`,
                      }}
                      className="absolute top-0 bottom-0 bg-[#5d100a] rounded-full"
                    />
                  </div>

                  <input
                    type="range"
                    min={MIN_PRICE_LIMIT}
                    max={MAX_PRICE_LIMIT}
                    step={PRICE_STEP}
                    value={minPrice}
                    onChange={handleMinPriceChange}
                    aria-label="Minimum Price"
                    className="price-range-thumb pointer-events-none absolute inset-0 w-full h-full appearance-none bg-transparent outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5d100a] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#ffffff] [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#5d100a] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#ffffff] [&::-moz-range-thumb]:cursor-pointer"
                  />

                  <input
                    type="range"
                    min={MIN_PRICE_LIMIT}
                    max={MAX_PRICE_LIMIT}
                    step={PRICE_STEP}
                    value={maxPrice}
                    onChange={handleMaxPriceChange}
                    aria-label="Maximum Price"
                    className="price-range-thumb pointer-events-none absolute inset-0 w-full h-full appearance-none bg-transparent outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1b1717] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#ffffff] [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1b1717] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#ffffff] [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#1b1717]/45 mt-1">
                  <span>Min</span>
                  <span>Max</span>
                </div>
              </div>
            </div>

            <div className="pb-5 flex items-center justify-between border-t border-[#1b1717]/10 pt-4">
              <span className="text-xs text-[#1b1717]/70">
                Showing {filteredProducts.length} results
              </span>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-4 py-1.5 text-xs uppercase tracking-wider border border-[#1b1717]/30 hover:border-[#1b1717] cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs uppercase tracking-wider bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] transition-colors cursor-pointer"
                >
                  <span>Done</span>
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="catalog-grid-container">
          {catalogLoading ? (
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-[3vw] sm:gap-x-5 lg:gap-x-6 gap-y-8 lg:gap-y-10">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="w-full aspect-[3/4] bg-[#1b1717]/[0.07] animate-pulse" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-2/5 bg-[#1b1717]/[0.06] animate-pulse" />
                    <div className="h-4 w-4/5 bg-[#1b1717]/[0.08] animate-pulse" />
                    <div className="h-3.5 w-1/3 bg-[#1b1717]/[0.06] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="heading-serif text-xl lg:text-2xl font-normal mb-2">
                No matching outfits found
              </h2>
              <p className="text-xs sm:text-sm font-light text-[#1b1717]/70 mb-6">
                Try adjusting your price range or clearing your selected filters.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-6 py-2.5 text-xs uppercase tracking-widest bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-[3vw] sm:gap-x-5 lg:gap-x-6 gap-y-8 lg:gap-y-10">
              {filteredProducts.map((product) => (
                <Link
                  key={product._id || product.id || product.slug}
                  href={`/shop/${product.slug}`}
                  className="product-card-item group flex flex-col"
                >
                  <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#1b1717]/5">
                    <ResponsiveImage
                      src={product.image || product.gallery?.[0]}
                      alt={product.title}
                      preset="card"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="mt-3 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">
                      {product.categoryLabel || product.category} • {product.season}
                    </span>
                    <h2 className="heading-serif text-sm sm:text-base lg:text-[16px] font-normal text-[#1b1717] group-hover:text-[#5d100a] transition-colors line-clamp-1">
                      {product.title}
                    </h2>
                    <span className="text-xs sm:text-[13px] font-medium text-[#1b1717]">
                      {formatINR(product.price)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#ffffff]" />}>
      <CollectionsContent />
    </Suspense>
  );
}