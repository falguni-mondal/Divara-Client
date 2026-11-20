"use client";

import React from "react";
import { ikUrl, ikSrcSet } from "@/lib/imagekit";

const PRESETS = {
  thumb: {
    widths: [96, 160, 240],
    sizes: "96px",
    fallbackWidth: 160,
    quality: 75,
  },
  card: {
    widths: [280, 420, 640, 840],
    sizes: "(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 24vw",
    fallbackWidth: 560,
    quality: 80,
  },
  pdp: {
    widths: [480, 760, 1080, 1440],
    sizes: "(max-width: 1024px) 96vw, 55vw",
    fallbackWidth: 1080,
    quality: 85,
  },
  hero: {
    widths: [640, 1024, 1440, 1920],
    sizes: "100vw",
    fallbackWidth: 1440,
    quality: 82,
  },
};

export default function ResponsiveImage({
  src,
  alt = "",
  preset = "card",
  priority = false,
  className = "",
}) {
  if (!src) {
    return <div aria-hidden="true" className={`bg-[#1b1717]/[0.06] ${className}`} />;
  }

  const cfg = PRESETS[preset] || PRESETS.card;
  const optimizedSrc = ikUrl(src, { width: cfg.fallbackWidth, quality: cfg.quality });
  const srcSet = ikSrcSet(src, cfg.widths, cfg.quality);

  if (!optimizedSrc) {
    return <div aria-hidden="true" className={`bg-[#1b1717]/[0.06] ${className}`} />;
  }

  return (
    <img
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