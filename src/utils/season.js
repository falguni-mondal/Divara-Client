"use client";

import { useState, useEffect } from "react";

function computeSeason(month) {
  if (month === 10 || month === 11 || month === 0 || month === 1) {
    return "Winter";
  }
  if (month === 2 || month === 3) {
    return "Spring";
  }
  if (month >= 4 && month <= 7) {
    return "Summer";
  }
  return "Autumn";
}

/**
 * Custom hook that defers reading `new Date()` into `useEffect`
 * to prevent Next.js 16 `blocking-prerender-current-time-client` errors.
 */
export function useSeasonAndYear() {
  const [dateInfo, setDateInfo] = useState({
    currentYear: 2026,
    currentSeason: "Winter",
    seasonAndYear: "Winter 2026",
    year: 2026,
    season: "Winter",
  });

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const season = computeSeason(now.getMonth());
    setDateInfo({
      currentYear: year,
      currentSeason: season,
      seasonAndYear: `${season} ${year}`,
      year,
      season,
    });
  }, []);

  return dateInfo;
}