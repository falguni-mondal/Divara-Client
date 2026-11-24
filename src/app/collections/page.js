"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  Suspense,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown, X, Check } from "lucide-react";
import { FILTER_OPTIONS, formatINR } from "@/data/catalogData";
import { ALL_VALID_SIZES } from "@/data/sizeChart";
import { api } from "@/lib/api";
import { useSeasonAndYear } from "@/utils/season";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { useAiConcierge } from "@/context/AiConciergeContext";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "name-asc", label: "Alphabetical: A–Z" },
];

const PAGE_LIMIT = 12;
const AUTO_LAZY_MAX_PAGES = 2; // Auto-lazy-load up to 24 items, then "Load More Pieces"
const MIN_PRICE_LIMIT = 0;
const MAX_PRICE_LIMIT = 150000;
const PRICE_STEP = 1000;
const SIZE_FILTER_LIST = ["All", ...ALL_VALID_SIZES];

// Lightweight in-memory snapshot for instant mobile Back restoration (zero sessionStorage bloat)
let lastCatalogState = null;

function normalizeSeasonParam(param) {
  if (!param) return "All";
  return (
    FILTER_OPTIONS.seasons.find(
      (s) => s.toLowerCase() === param.trim().toLowerCase()
    ) || "All"
  );
}

function makeDefaultFilters(overrides = {}) {
  return {
    category: "all",
    season: "All",
    color: "All",
    fabric: "All",
    size: "All",
    minPrice: MIN_PRICE_LIMIT,
    maxPrice: MAX_PRICE_LIMIT,
    searchQuery: "",
    ...overrides,
  };
}

function filtersEqual(a, b) {
  return (
    a.category === b.category &&
    a.season === b.season &&
    a.color === b.color &&
    a.fabric === b.fabric &&
    a.size === b.size &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.searchQuery === b.searchQuery
  );
}

function countActiveFilters(f) {
  let count = 0;
  if (f.category !== "all") count++;
  if (f.season !== "All") count++;
  if (f.color !== "All") count++;
  if (f.fabric !== "All") count++;
  if (f.size !== "All") count++;
  if (f.minPrice > MIN_PRICE_LIMIT || f.maxPrice < MAX_PRICE_LIMIT) count++;
  if ((f.searchQuery || "").trim() !== "") count++;
  return count;
}

function getBackSnapshot(urlKey) {
  if (typeof window === "undefined" || !lastCatalogState) return null;
  const popAt = window.__DIVARA_POPSTATE_AT__;
  const isBackNav = typeof popAt === "number" && Date.now() - popAt < 2500;
  if (!isBackNav || lastCatalogState.urlKey !== urlKey) return null;
  return lastCatalogState;
}

function ProductCardSkeleton({ count = 4 }) {
  return Array.from({ length: count }).map((_, idx) => (
    <div key={`skeleton-${idx}`} className="flex flex-col" aria-hidden="true">
      <div className="w-full aspect-[3/4] bg-[#1b1717]/[0.07] animate-pulse" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-2/5 bg-[#1b1717]/[0.06] animate-pulse" />
        <div className="h-4 w-4/5 bg-[#1b1717]/[0.08] animate-pulse" />
        <div className="h-3.5 w-1/3 bg-[#1b1717]/[0.06] animate-pulse" />
      </div>
    </div>
  ));
}

function FilterPillGroup({ title, options, activeValue, onSelect, scrollable = false }) {
  return (
    <div>
      <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 mb-3 font-semibold">
        {title}
      </h3>
      <div className={`flex flex-wrap gap-1.5 ${scrollable ? "max-h-44 overflow-y-auto pr-1" : ""}`}>
        {options.map((opt) => {
          const id = typeof opt === "string" ? opt : opt.id;
          const label = typeof opt === "string" ? opt : opt.label;
          const active = activeValue === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`px-2.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                active
                  ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                  : "border-[#1b1717]/20 text-[#1b1717] hover:border-[#1b1717]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollectionsContent() {
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const urlKey = `/collections${searchString ? `?${searchString}` : ""}`;

  const snapRef = useRef(undefined);
  if (snapRef.current === undefined) {
    snapRef.current = getBackSnapshot(urlKey);
  }
  const snap = snapRef.current;

  const initialFilters = snap?.appliedFilters
    ? makeDefaultFilters(snap.appliedFilters)
    : makeDefaultFilters({
        category: searchParams.get("category") || "all",
        season: normalizeSeasonParam(searchParams.get("season")),
        searchQuery: searchParams.get("q") || "",
      });

  // Desktop (>= 1024px) opens PDPs in a new tab; mobile uses same-tab native scroll + RAM cache
  const [openInNewTab, setOpenInNewTab] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState(snap?.sortBy || "featured");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [products, setProducts] = useState(() => snap?.products || []);
  const [page, setPage] = useState(() => snap?.page || 1);
  const [totalCount, setTotalCount] = useState(() => snap?.totalCount || 0);
  const [totalPages, setTotalPages] = useState(() => snap?.totalPages || 1);
  const [initialLoading, setInitialLoading] = useState(() => !snap);
  const [loadingMore, setLoadingMore] = useState(false);

  const catalogSectionRef = useRef(null);
  const sortRef = useRef(null);
  const sentinelRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isFetchingMoreRef = useRef(false);
  const skipInitialFetchRef = useRef(Boolean(snap));
  const prevSearchRef = useRef(searchString);

  const { currentSeason, seasonAndYear } = useSeasonAndYear();
  const { scrollTo } = useSmoothScroll();


  const { registerVisibleItems } = useAiConcierge();

  useEffect(() => {
    registerVisibleItems(
      products.slice(0, 24).map((p, idx) => ({
        position: idx + 1,
        slug: p.slug,
        title: p.title,
        price: Number(p.price) || 0,
        color: p.color || "",
        colorHex: p.colorHex || "",
        fabric: p.fabric || "",
        category: p.category || "",
      }))
    );
    return () => registerVisibleItems([]);
  }, [products, registerVisibleItems]);


  // SSR-safe desktop detection for new-tab product opening
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setOpenInNewTab(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Native pre-paint scroll restore on mobile Back navigation
  // Restore exact scroll position on Back navigation (works for both Desktop Lenis and Mobile native scroll)
  useIsoLayoutEffect(() => {
    if (!snap || typeof window === "undefined") return;
    const targetY = Math.max(0, Number(snap.scrollY) || 0);
    const applyPos = () => {
      window.scrollTo({ top: targetY, behavior: "auto" });
      scrollTo(targetY, { immediate: true, force: true });
    };
    applyPos();
    const raf1 = window.requestAnimationFrame(() => {
      applyPos();
      window.requestAnimationFrame(applyPos);
    });
    const t = setTimeout(() => {
      applyPos();
      lastCatalogState = null;
    }, 140);
    return () => {
      window.cancelAnimationFrame(raf1);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuously keep snapshot fresh so both card clicks and NIRA AI navigation preserve exact scrollY
  useEffect(() => {
    if (typeof window === "undefined" || products.length === 0) return;
    const syncSnapshot = () => {
      lastCatalogState = {
        urlKey,
        products,
        page,
        totalCount,
        totalPages,
        appliedFilters,
        sortBy,
        scrollY: Math.round(window.scrollY || 0),
      };
    };
    syncSnapshot();
    window.addEventListener("scroll", syncSnapshot, { passive: true });
    return () => window.removeEventListener("scroll", syncSnapshot);
  }, [urlKey, products, page, totalCount, totalPages, appliedFilters, sortBy]);

  // Sync URL query params when changed externally (e.g. Navbar category links)
  useEffect(() => {
    if (prevSearchRef.current === searchString) return;
    prevSearchRef.current = searchString;
    lastCatalogState = null;
    const next = makeDefaultFilters({
      category: searchParams.get("category") || "all",
      season: normalizeSeasonParam(searchParams.get("season")),
      searchQuery: searchParams.get("q") || "",
    });
    setAppliedFilters(next);
    setDraftFilters(next);
  }, [searchString, searchParams]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const draftFilterCount = useMemo(() => countActiveFilters(draftFilters), [draftFilters]);
  const hasUnappliedChanges = useMemo(
    () => !filtersEqual(draftFilters, appliedFilters),
    [draftFilters, appliedFilters]
  );
  const isDraftPriceFiltered =
    draftFilters.minPrice > MIN_PRICE_LIMIT || draftFilters.maxPrice < MAX_PRICE_LIMIT;

  const buildQueryParams = useCallback(
    (targetPage, filtersObj = appliedFilters) => {
      const params = { page: targetPage, limit: PAGE_LIMIT, sort: sortBy };
      if (filtersObj.category !== "all") params.category = filtersObj.category;
      if (filtersObj.season !== "All") params.season = filtersObj.season;
      if (filtersObj.color !== "All") params.color = filtersObj.color;
      if (filtersObj.fabric !== "All") params.fabric = filtersObj.fabric;
      if (filtersObj.size !== "All") params.size = filtersObj.size;
      if (filtersObj.minPrice > MIN_PRICE_LIMIT) params.minPrice = filtersObj.minPrice;
      if (filtersObj.maxPrice < MAX_PRICE_LIMIT) params.maxPrice = filtersObj.maxPrice;
      if ((filtersObj.searchQuery || "").trim() !== "") {
        params.q = filtersObj.searchQuery.trim();
      }
      return params;
    },
    [appliedFilters, sortBy]
  );

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    isFetchingMoreRef.current = false;
    setLoadingMore(false);
    setInitialLoading(true);
    setPage(1);

    api
      .get("/products", {
        params: buildQueryParams(1, appliedFilters),
        signal: controller.signal,
      })
      .then(({ data }) => {
        const items = data?.data?.items || [];
        const meta = data?.meta || {};
        setProducts(items);
        setTotalCount(meta.total ?? items.length);
        setTotalPages(meta.totalPages ?? 1);
        setPage(1);
      })
      .catch((err) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          setProducts([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitialLoading(false);
      });

    return () => controller.abort();
  }, [appliedFilters, sortBy, buildQueryParams]);

  const hasMore = page < totalPages && products.length < totalCount;
  const canAutoLazyLoad = hasMore && page < AUTO_LAZY_MAX_PAGES;
  const nextBatchCount = Math.min(PAGE_LIMIT, Math.max(0, totalCount - products.length));

  const loadNextPage = useCallback(async () => {
    if (initialLoading || isFetchingMoreRef.current || !hasMore) return;

    const nextPage = page + 1;
    isFetchingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const { data } = await api.get("/products", {
        params: buildQueryParams(nextPage, appliedFilters),
      });
      const incoming = data?.data?.items || [];
      const meta = data?.meta || {};

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p._id || p.slug));
        return [...prev, ...incoming.filter((p) => !seen.has(p._id || p.slug))];
      });
      setPage(nextPage);
      setTotalCount(meta.total ?? totalCount);
      setTotalPages(meta.totalPages ?? totalPages);
    } catch {
      // Allow retry on next click or intersection
    } finally {
      isFetchingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [initialLoading, hasMore, page, buildQueryParams, appliedFilters, totalCount, totalPages]);

  // Baymard Hybrid: auto-lazy-load through Page 2 (24 items), then switch to "Load More Pieces"
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canAutoLazyLoad || initialLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextPage();
      },
      { rootMargin: "220px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canAutoLazyLoad, initialLoading, loadNextPage]);

  const saveMobileSnapshot = () => {
    if (typeof window === "undefined") return;
    lastCatalogState = {
      urlKey,
      products,
      page,
      totalCount,
      totalPages,
      appliedFilters,
      sortBy,
      scrollY: Math.round(window.scrollY || 0),
    };
  };

  const applyFilterReset = (nextFilters) => {
    lastCatalogState = null;
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const handleToggleFilterDrawer = () => {
    setDraftFilters(appliedFilters);
    setIsFilterOpen((prev) => !prev);
  };

  const handleApplyDraftFilters = () => {
    lastCatalogState = null;
    setAppliedFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const handleHeroSeasonFilter = () => {
    applyFilterReset({ ...appliedFilters, season: currentSeason });
    if (catalogSectionRef.current) {
      scrollTo(catalogSectionRef.current, { offset: -60 });
    }
  };

  const minPercent =
    ((draftFilters.minPrice - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100;
  const maxPercent =
    ((draftFilters.maxPrice - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100;
  const currentSortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "Featured";

  return (
    <div className="w-full min-h-screen bg-[#ffffff] text-[#1b1717]">
      <section className="relative w-full h-[50vh] lg:h-[56vh] overflow-hidden flex items-end">
        <picture className="absolute inset-0 w-full h-full">
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
            <span className="block text-[3vw] sm:text-xs uppercase tracking-[0.22em] text-[#ffffff]/75 mb-2">
              {seasonAndYear}
            </span>
            <h1 className="heading-serif text-[7.5vw] sm:text-3xl lg:text-[40px] font-normal tracking-tight leading-tight">
              The Collection
            </h1>
          </div>

          <button
            type="button"
            onClick={handleHeroSeasonFilter}
            className={`px-5 py-2.5 sm:px-6 sm:py-3 text-xs uppercase tracking-[0.18em] font-medium rounded-[3px] border backdrop-blur-[7px] transition-colors duration-300 cursor-pointer ${
              appliedFilters.season === currentSeason
                ? "bg-[#ffffff] text-[#1b1717] border-[#ffffff]"
                : "bg-[#ffffff15] text-[#ffffff] border-[#ffffff] hover:bg-[#ffffff] hover:text-[#1b1717]"
            }`}
          >
            Filter {currentSeason} collection
          </button>
        </div>
      </section>

      <section
        ref={catalogSectionRef}
        className="max-w-[1440px] mx-auto px-[3vw] lg:px-10 py-8 lg:py-12"
      >
        <div className="flex items-center justify-between border-y border-[#1b1717]/15 py-3.5 gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleToggleFilterDrawer}
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

            {appliedFilters.season !== "All" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
                <span>Season: {appliedFilters.season}</span>
                <button
                  type="button"
                  onClick={() => applyFilterReset({ ...appliedFilters, season: "All" })}
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
                onClick={() => applyFilterReset(makeDefaultFilters())}
                className="text-[11px] uppercase tracking-wider underline text-[#5d100a] hover:text-[#1b1717] transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <span className="hidden md:inline-block text-xs uppercase tracking-widest text-[#1b1717]/60">
            {initialLoading
              ? "Loading..."
              : `Showing ${products.length} of ${totalCount} ${
                  totalCount === 1 ? "Item" : "Items"
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
                          lastCatalogState = null;
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

        {/* Collapsible Staged Filter Drawer (Applies ONLY on "Done & Apply") */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-400 ease-in-out ${
            isFilterOpen
              ? "grid-rows-[1fr] opacity-100 border-b border-[#1b1717]/15"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <FilterPillGroup
                title="Outfit Type"
                options={FILTER_OPTIONS.categories}
                activeValue={draftFilters.category}
                onSelect={(category) => setDraftFilters((prev) => ({ ...prev, category }))}
              />

              <FilterPillGroup
                title="Season"
                options={FILTER_OPTIONS.seasons}
                activeValue={draftFilters.season}
                onSelect={(season) => setDraftFilters((prev) => ({ ...prev, season }))}
              />

              <div>
                <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 mb-3 font-semibold">
                  Color
                </h3>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {FILTER_OPTIONS.colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setDraftFilters((prev) => ({ ...prev, color: c.name }))}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                        draftFilters.color === c.name
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

              <FilterPillGroup
                title="Fabric"
                options={FILTER_OPTIONS.fabrics}
                activeValue={draftFilters.fabric}
                onSelect={(fabric) => setDraftFilters((prev) => ({ ...prev, fabric }))}
                scrollable
              />

              <FilterPillGroup
                title="Size"
                options={SIZE_FILTER_LIST}
                activeValue={draftFilters.size}
                onSelect={(size) => setDraftFilters((prev) => ({ ...prev, size }))}
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="heading-serif text-xs uppercase tracking-widest text-[#1b1717]/60 font-semibold">
                    Price Range
                  </h3>
                  {isDraftPriceFiltered && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          minPrice: MIN_PRICE_LIMIT,
                          maxPrice: MAX_PRICE_LIMIT,
                        }))
                      }
                      className="text-[10px] uppercase tracking-wider text-[#5d100a] underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-[#1b1717] mb-3">
                  <span>{formatINR(draftFilters.minPrice)}</span>
                  <span className="text-[#1b1717]/40">—</span>
                  <span>{formatINR(draftFilters.maxPrice)}</span>
                </div>

                <div className="relative h-6 flex items-center">
                  <div className="w-full h-[3px] bg-[#1b1717]/15 relative rounded-full">
                    <div
                      style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                      className="absolute top-0 bottom-0 bg-[#5d100a] rounded-full"
                    />
                  </div>

                  <input
                    type="range"
                    min={MIN_PRICE_LIMIT}
                    max={MAX_PRICE_LIMIT}
                    step={PRICE_STEP}
                    value={draftFilters.minPrice}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), draftFilters.maxPrice - PRICE_STEP);
                      setDraftFilters((prev) => ({ ...prev, minPrice: val }));
                    }}
                    aria-label="Minimum Price"
                    className="price-range-thumb pointer-events-none absolute inset-0 w-full h-full appearance-none bg-transparent outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5d100a] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#ffffff] [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#5d100a] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#ffffff] [&::-moz-range-thumb]:cursor-pointer"
                  />

                  <input
                    type="range"
                    min={MIN_PRICE_LIMIT}
                    max={MAX_PRICE_LIMIT}
                    step={PRICE_STEP}
                    value={draftFilters.maxPrice}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), draftFilters.minPrice + PRICE_STEP);
                      setDraftFilters((prev) => ({ ...prev, maxPrice: val }));
                    }}
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

            <div className="pb-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#1b1717]/10 pt-4">
              <span className="text-xs text-[#1b1717]/70">
                {hasUnappliedChanges ? (
                  <span className="text-[#5d100a] font-medium">
                    {draftFilterCount} filter{draftFilterCount === 1 ? "" : "s"} selected — click Done to apply
                  </span>
                ) : initialLoading ? (
                  "Updating..."
                ) : (
                  `${totalCount} matching ${totalCount === 1 ? "piece" : "pieces"}`
                )}
              </span>
              <div className="flex items-center gap-3">
                {draftFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftFilters(makeDefaultFilters())}
                    className="px-4 py-1.5 text-xs uppercase tracking-wider border border-[#1b1717]/30 hover:border-[#1b1717] cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleFilterDrawer}
                  className="px-4 py-1.5 text-xs uppercase tracking-wider border border-[#1b1717]/20 text-[#1b1717]/70 hover:text-[#1b1717] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDraftFilters}
                  className={`flex items-center gap-1.5 px-5 py-1.5 text-xs uppercase tracking-wider font-medium transition-colors cursor-pointer ${
                    hasUnappliedChanges
                      ? "bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717]"
                      : "bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a]"
                  }`}
                >
                  <span>{hasUnappliedChanges ? "Done & Apply" : "Done"}</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid + Baymard Hybrid Lazy-Load / Load More */}
        <div style={{ overflowAnchor: "none" }}>
          {initialLoading ? (
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-[3vw] sm:gap-x-5 lg:gap-x-6 gap-y-8 lg:gap-y-10">
              <ProductCardSkeleton count={8} />
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="heading-serif text-xl lg:text-2xl font-normal mb-2">
                No matching outfits found
              </h2>
              <p className="text-xs sm:text-sm font-light text-[#1b1717]/70 mb-6">
                Try adjusting your price range or clearing your selected filters.
              </p>
              <button
                type="button"
                onClick={() => applyFilterReset(makeDefaultFilters())}
                className="px-6 py-2.5 text-xs uppercase tracking-widest bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-[3vw] sm:gap-x-5 lg:gap-x-6 gap-y-8 lg:gap-y-10">
                {products.map((product) => (
                  <Link
                    key={product._id || product.id || product.slug}
                    href={`/shop/${product.slug}`}
                    target={openInNewTab ? "_blank" : undefined}
                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                    onClick={() => {
                      if (!openInNewTab) saveMobileSnapshot();
                    }}
                    className="group flex flex-col"
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

                {loadingMore && <ProductCardSkeleton count={4} />}
              </div>

              <div
                ref={sentinelRef}
                className="mt-12 flex flex-col items-center justify-center gap-3"
              >
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#1b1717]/50">
                  Showing {products.length} of {totalCount}{" "}
                  {totalCount === 1 ? "Piece" : "Pieces"}
                </span>

                {hasMore ? (
                  !loadingMore && (
                    <button
                      type="button"
                      onClick={loadNextPage}
                      className="px-7 py-2.5 text-xs uppercase tracking-[0.18em] border border-[#1b1717] bg-transparent hover:bg-[#1b1717] text-[#1b1717] hover:text-[#ffffff] transition-colors duration-200 cursor-pointer"
                    >
                      Load More Pieces (+{nextBatchCount})
                    </button>
                  )
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.22em] text-[#1b1717]/40">
                    End of Collection
                  </span>
                )}
              </div>
            </>
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