"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ArrowUpRight, Search, Loader2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TextLogo } from "@/components/ui/BrandLogo";
import { formatINR } from "@/data/catalogData";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useSeasonAndYear } from "@/utils/season";
import { useLiveSearch } from "@/hooks/useLiveCatalog";
import { ikUrl } from "@/lib/imagekit";

const QUICK_SUGGESTIONS = [
  "Kanjivaram",
  "Sarees",
  "Dresses",
  "Winter",
  "Silk",
  "Velvet",
  "Chanderi",
  "Denim",
];

export default function SearchOverlay({
  isOpen,
  onClose,
  initialQuery = "",
  initialQuerySeq = 0,
}) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const inputBoxRef = useRef(null);
  const inputRef = useRef(null);
  const mirrorTrackRef = useRef(null);
  const measureSpanRef = useRef(null);
  const caretRef = useRef(null);
  const svgPathRef = useRef(null);
  const resultsGridRef = useRef(null);
  const prevLenRef = useRef(0);

  const router = useRouter();
  const { stopScroll, startScroll } = useSmoothScroll();
  const { currentSeason, seasonAndYear } = useSeasonAndYear();

  // Populate search input & trigger live search when invoked by NIRA AI
  useEffect(() => {
    if (initialQuerySeq > 0 && initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery, initialQuerySeq]);

  const { matches: matchedProducts, totalMatches, isSearching } = useLiveSearch(
    query,
    isOpen,
    400
  );

  useEffect(() => {
    if (isOpen) {
      stopScroll();
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 240);
      return () => clearTimeout(timer);
    } else {
      startScroll();
    }
    return () => startScroll();
  }, [isOpen, stopScroll, startScroll]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useGSAP(
    () => {
      if (!overlayRef.current || !panelRef.current) return;

      if (isOpen) {
        gsap.to(overlayRef.current, {
          opacity: 1,
          pointerEvents: "auto",
          duration: 0.38,
          ease: "power3.out",
        });
        gsap.fromTo(
          panelRef.current,
          { y: -28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power4.out" }
        );
      } else {
        gsap.to(overlayRef.current, {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.3,
          ease: "power3.inOut",
        });
      }
    },
    { dependencies: [isOpen] }
  );

  useGSAP(
    () => {
      if (!isOpen || !resultsGridRef.current) return;
      const cards = resultsGridRef.current.querySelectorAll(".search-result-card");
      if (!cards || cards.length === 0) return;

      gsap.fromTo(
        cards,
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.05,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    },
    { dependencies: [matchedProducts, isOpen] }
  );

  const pluckSearchString = useCallback((normX = 50, intensity = 1) => {
    if (!svgPathRef.current) return;
    const clampedX = Math.max(6, Math.min(94, normX));
    const peakY = 10 + Math.min(10, 7 * intensity);

    const proxy = { y: peakY, x: clampedX };
    gsap.killTweensOf(proxy);

    gsap.to(proxy, {
      y: 10,
      duration: 0.9,
      ease: "elastic.out(1.4, 0.22)",
      onUpdate: () => {
        if (svgPathRef.current) {
          svgPathRef.current.setAttribute(
            "d",
            `M 0 10 Q ${proxy.x.toFixed(1)} ${proxy.y.toFixed(2)} 100 10`
          );
        }
      },
    });
  }, []);

  useEffect(() => {
    const nextLen = query.length;
    const isAddition = nextLen > prevLenRef.current;
    prevLenRef.current = nextLen;

    requestAnimationFrame(() => {
      const trackEl = mirrorTrackRef.current;
      const caretEl = caretRef.current;
      const boxEl = inputBoxRef.current;
      if (!trackEl || !caretEl || !boxEl) return;

      const textWidth = measureSpanRef.current ? measureSpanRef.current.offsetWidth : 0;
      const availableWidth = Math.max(1, boxEl.clientWidth - 16);

      const overflowX = Math.max(0, textWidth - availableWidth);
      gsap.to(trackEl, {
        x: -overflowX,
        duration: 0.22,
        ease: "power3.out",
        overwrite: "auto",
      });

      const caretX = Math.min(availableWidth, textWidth);
      gsap.to(caretEl, {
        x: caretX,
        duration: 0.22,
        ease: "power3.out",
        overwrite: "auto",
      });

      gsap.fromTo(
        caretEl,
        { scaleY: 1.4 },
        { scaleY: 1, duration: 0.35, ease: "back.out(2.5)", overwrite: "auto" }
      );

      const normX = Math.max(8, Math.min(92, (caretX / availableWidth) * 100));
      if (nextLen > 0 || isAddition) {
        pluckSearchString(normX, isAddition ? 1.2 : 0.75);
      }

      const chars = trackEl.querySelectorAll(".search-k-char");
      if (isAddition && chars.length > 0) {
        const lastChar = chars[chars.length - 1];
        gsap.fromTo(
          lastChar,
          { y: 18, rotateX: -75, scale: 0.7, opacity: 0, filter: "blur(4px)" },
          {
            y: 0,
            rotateX: 0,
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.42,
            ease: "expo.out",
            overwrite: "auto",
          }
        );

        const waveCount = Math.min(3, chars.length - 1);
        for (let i = 1; i <= waveCount; i++) {
          const prevChar = chars[chars.length - 1 - i];
          if (prevChar) {
            gsap.fromTo(
              prevChar,
              { y: -4 * (1 - i * 0.25) },
              {
                y: 0,
                duration: 0.45,
                delay: i * 0.025,
                ease: "elastic.out(1.2, 0.35)",
                overwrite: "auto",
              }
            );
          }
        }
      }
    });
  }, [query, pluckSearchString]);

  const handleSuggestionClick = (term) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onClose();
    if (query.trim()) {
      router.push(`/collections?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/collections");
    }
  };

  return (
    <div
      ref={overlayRef}
      data-lenis-prevent
      style={{ opacity: 0, pointerEvents: "none" }}
      className="fixed inset-0 z-[1005] bg-[#1b1717]/70 backdrop-blur-[6px] flex items-start justify-center p-0 sm:px-6 md:px-10 sm:pt-10 md:pt-14 lg:pt-20 sm:pb-10 overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-[1140px] bg-[#ffffff] text-[#1b1717] border-b sm:border border-[#1b1717]/15 shadow-2xl flex flex-col max-h-[100svh] sm:max-h-[85svh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-10 py-3.5 sm:py-4 border-b border-[#1b1717]/10 shrink-0">
          <div className="flex items-center gap-3">
            <TextLogo className="w-[74px] sm:w-[84px]" fill="#1b1717" />
            <span className="hidden sm:inline-block h-3.5 w-[1px] bg-[#1b1717]/20" />
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.24em] text-[#1b1717]/55">
              {seasonAndYear} Archive Search
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Search"
            className="flex items-center gap-2 py-1 px-2 text-[11px] uppercase tracking-[0.2em] text-[#1b1717]/70 hover:text-[#5d100a] transition-colors cursor-pointer"
          >
            <span className="hidden xs:inline">Close</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-10 py-5 sm:py-8"
        >
          <form onSubmit={handleSearchSubmit}>
            <div className="relative pb-3 sm:pb-4 border-b border-[#1b1717]/20">
              <div className="flex items-center gap-3 sm:gap-4">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5d100a] shrink-0 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#1b1717]/50 shrink-0" />
                )}

                <div
                  ref={inputBoxRef}
                  className="relative flex-1 flex items-center min-h-[38px] sm:min-h-[48px] lg:min-h-[54px] overflow-hidden"
                >
                  <span
                    ref={measureSpanRef}
                    className="invisible fixed -top-[9999px] left-0 whitespace-pre heading-serif text-lg sm:text-2xl md:text-3xl lg:text-[34px] font-normal tracking-wide"
                  >
                    {query}
                  </span>

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center overflow-hidden"
                  >
                    {query.length === 0 && (
                      <span className="heading-serif text-base sm:text-2xl md:text-3xl lg:text-[32px] font-normal text-[#1b1717]/35 truncate select-none">
                        Search sarees, silk, SKU, {currentSeason.toLowerCase()}...
                      </span>
                    )}

                    <div
                      ref={mirrorTrackRef}
                      style={{ perspective: "500px" }}
                      className="flex items-center whitespace-pre heading-serif text-lg sm:text-2xl md:text-3xl lg:text-[34px] font-normal tracking-wide text-[#1b1717] will-change-transform"
                    >
                      {Array.from(query).map((ch, idx) => (
                        <span
                          key={`${idx}-${ch}`}
                          className="search-k-char inline-block origin-bottom will-change-transform"
                        >
                          {ch === " " ? "\u00A0" : ch}
                        </span>
                      ))}
                    </div>

                    <span
                      ref={caretRef}
                      style={{ opacity: isFocused ? 1 : 0 }}
                      className="absolute left-0 h-5 sm:h-7 lg:h-8 w-[2px] bg-[#5d100a] origin-center transition-opacity duration-150"
                    />
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    aria-label="Search Divara Collection"
                    className="relative z-10 w-full bg-transparent py-1 heading-serif text-lg sm:text-2xl md:text-3xl lg:text-[34px] text-transparent caret-transparent outline-none selection:bg-[#5d100a]/15"
                  />
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {query.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        inputRef.current?.focus();
                      }}
                      className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/55 hover:text-[#5d100a] underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="submit"
                    className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors duration-300 rounded-[2px] cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>

              <svg
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-[10px] left-0 w-full h-[20px] overflow-visible z-20"
              >
                <path
                  ref={svgPathRef}
                  d="M 0 10 Q 50 10 100 10"
                  fill="none"
                  stroke="#5d100a"
                  strokeWidth={isFocused || query.length > 0 ? "2" : "0"}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#1b1717]/45 shrink-0 mr-1">
                Suggestions:
              </span>
              {QUICK_SUGGESTIONS.map((tag) => {
                const active = query.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSuggestionClick(tag)}
                    className={`shrink-0 px-3 py-1 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] border rounded-[2px] transition-colors cursor-pointer ${
                      active
                        ? "bg-[#5d100a] border-[#5d100a] text-[#ffffff]"
                        : "border-[#1b1717]/15 text-[#1b1717]/75 hover:border-[#1b1717] hover:text-[#1b1717]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </form>

          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[#1b1717]/10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-5">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#1b1717]/60 font-medium">
                {isSearching
                  ? "Searching DIVARA Archive..."
                  : query.trim()
                  ? `${totalMatches} ${totalMatches === 1 ? "Result" : "Results"} for “${query}”`
                  : "Popular Curations"}
              </span>

              <Link
                href={
                  query.trim()
                    ? `/collections?q=${encodeURIComponent(query.trim())}`
                    : "/collections"
                }
                onClick={onClose}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold text-[#5d100a] hover:text-[#1b1717] transition-colors"
              >
                <span>View Full Collection</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!isSearching && matchedProducts.length === 0 ? (
              <div className="py-10 sm:py-12 px-4 text-center border border-[#1b1717]/10">
                <h3 className="heading-serif text-lg sm:text-xl font-normal text-[#1b1717]">
                  No outfits matched “{query}”
                </h3>
                <p className="mt-1.5 text-xs text-[#1b1717]/60 font-light max-w-md mx-auto">
                  Try searching by outfit type (Sarees, Dresses, Shirts, Denim),
                  fabric (Silk, Velvet, Chanderi), color, SKU, or size.
                </p>
              </div>
            ) : (
              <div
                ref={resultsGridRef}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5"
              >
                {matchedProducts.slice(0, 8).map((product) => (
                  <Link
                    key={product.id || product._id}
                    href={`/shop/${product.slug}`}
                    onClick={onClose}
                    className="search-result-card group flex sm:flex-col items-center sm:items-stretch gap-3.5 sm:gap-0 p-2 sm:p-0 border sm:border-0 border-[#1b1717]/10 hover:border-[#1b1717]/30 transition-colors"
                  >
                    <div className="w-16 h-20 sm:w-full sm:h-auto sm:aspect-[3/4] shrink-0 overflow-hidden bg-[#1b1717]/5">
                      <img
                        src={ikUrl(product.image, { width: 420 })}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 sm:mt-2.5">
                      <span className="block text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#1b1717]/50 truncate">
                        {product.categoryLabel} • {product.season}
                      </span>
                      <h3 className="heading-serif text-sm sm:text-[15px] font-normal text-[#1b1717] group-hover:text-[#5d100a] transition-colors truncate mt-0.5">
                        {product.title}
                      </h3>
                      <span className="block text-xs font-medium text-[#1b1717] mt-1">
                        {formatINR(product.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}