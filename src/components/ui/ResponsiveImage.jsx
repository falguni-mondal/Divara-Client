"use client";

import React, { useState, useRef, useEffect } from "react";
import { ikUrl, ikBlurUrl, ikSrcSet } from "@/lib/imagekit";

const PRESETS = {
  thumb: {
    widths: [96, 160, 240],
    sizes: "96px",
    fallbackWidth: 160,
    quality: 75,
    blurUp: false,
  },
  card: {
    widths: [280, 420, 640, 840],
    sizes: "(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 24vw",
    fallbackWidth: 560,
    quality: 80,
    blurUp: true,
  },
  pdp: {
    widths: [480, 760, 1080, 1440],
    sizes: "(max-width: 1024px) 96vw, 55vw",
    fallbackWidth: 1080,
    quality: 85,
    blurUp: true,
  },
  hero: {
    widths: [640, 1024, 1440, 1920],
    sizes: "100vw",
    fallbackWidth: 1440,
    quality: 82,
    blurUp: true,
  },
};

export default function ResponsiveImage({
  src,
  alt = "",
  preset = "card",
  priority = false,
  className = "",
}) {
  const cfg = PRESETS[preset] || PRESETS.card;
  const optimizedSrc = src
    ? ikUrl(src, { width: cfg.fallbackWidth, quality: cfg.quality })
    : "";
  const blurSrc = cfg.blurUp && src ? ikBlurUrl(src) : null;
  const srcSet = src ? ikSrcSet(src, cfg.widths, cfg.quality) : undefined;

  const imgRef = useRef(null);
  const [loadedSrc, setLoadedSrc] = useState("");

  // Detect already-cached images immediately so they appear with zero blur flash
  useEffect(() => {
    if (!optimizedSrc) return;
    const node = imgRef.current;
    if (node && node.complete && node.naturalWidth > 0) {
      setLoadedSrc(optimizedSrc);
    }
  }, [optimizedSrc]);

  if (!src || !optimizedSrc) {
    return <div aria-hidden="true" className={`bg-[#1b1717]/[0.06] ${className}`} />;
  }

  const isLoaded = loadedSrc === optimizedSrc;

  if (!blurSrc) {
    return (
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={srcSet ? cfg.sizes : undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={className}
      />
    );
  }

  return (
    <span className="relative block w-full h-full overflow-hidden bg-[#1b1717]/[0.05]">
      {/* Layer 1: Tiny blurred LQIP placeholder (~1-2 KB) shown instantly while full image loads */}
      <img
        src={blurSrc}
        alt=""
        aria-hidden="true"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover scale-105 blur-md transition-opacity duration-300 pointer-events-none select-none ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Layer 2: Full-resolution responsive image fading in cleanly on load */}
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={srcSet ? cfg.sizes : undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        onLoad={() => setLoadedSrc(optimizedSrc)}
        onError={() => setLoadedSrc(optimizedSrc)}
        className={`relative z-[1] transition-opacity duration-300 ease-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
      />
    </span>
  );
}