"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { PRODUCTS } from "@/data/catalogData";

/**
 * Fetches live filtered catalog items from GET /api/v1/products (MongoDB $facet)
 * with graceful fallback to local PRODUCTS if the server is offline during dev.
 */
export function useLiveCatalog(params) {
  const [items, setItems] = useState(PRODUCTS);
  const [loading, setLoading] = useState(false);

  const queryKey = JSON.stringify(params);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      api
        .get("/products", { params })
        .then(({ data }) => {
          if (active && Array.isArray(data.data?.items)) {
            setItems(data.data.items);
          }
        })
        .catch(() => {
          if (active) setItems(PRODUCTS);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return { items, loading };
}

/**
 * Debounced instant search hook for SearchOverlay.jsx (GET /api/v1/products/search).
 */
export function useLiveSearch(query, isOpen) {
  const [matches, setMatches] = useState(PRODUCTS.slice(0, 4));

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const trimmed = query.trim();

    const timer = setTimeout(() => {
      const req = trimmed
        ? api.get("/products/search", { params: { q: trimmed, limit: 8 } })
        : api.get("/products", { params: { limit: 4, sort: "featured" } });

      req
        .then(({ data }) => {
          if (!active) return;
          const list = trimmed ? data.data?.matches : data.data?.items;
          if (Array.isArray(list)) setMatches(list);
        })
        .catch(() => {
          if (!active) return;
          if (!trimmed) setMatches(PRODUCTS.slice(0, 4));
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  return matches;
}