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
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(() => {
      api
        .get("/products", { params, signal: controller.signal })
        .then(({ data }) => {
          if (Array.isArray(data.data?.items)) {
            setItems(data.data.items);
          }
        })
        .catch((err) => {
          if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
          setItems(PRODUCTS);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return { items, loading };
}

/**
 * Debounced (400ms) backend search hook for SearchOverlay.jsx (GET /api/v1/products/search).
 * Cancels stale in-flight requests automatically as the user types.
 */
export function useLiveSearch(query, isOpen, debounceMs = 400) {
  const [matches, setMatches] = useState(PRODUCTS.slice(0, 4));
  const [totalMatches, setTotalMatches] = useState(4);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const trimmed = query.trim();

    if (trimmed) setIsSearching(true);

    const timer = setTimeout(() => {
      const req = trimmed
        ? api.get("/products/search", {
            params: { q: trimmed, limit: 8 },
            signal: controller.signal,
          })
        : api.get("/products", {
            params: { limit: 4, sort: "featured" },
            signal: controller.signal,
          });

      req
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          if (trimmed) {
            const list = Array.isArray(data.data?.matches) ? data.data.matches : [];
            setMatches(list);
            setTotalMatches(data.data?.totalMatches ?? list.length);
          } else {
            const list = Array.isArray(data.data?.items)
              ? data.data.items
              : PRODUCTS.slice(0, 4);
            setMatches(list);
            setTotalMatches(list.length);
          }
        })
        .catch((err) => {
          if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
          if (!trimmed) {
            setMatches(PRODUCTS.slice(0, 4));
            setTotalMatches(4);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, trimmed ? debounceMs : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen, debounceMs]);

  return { matches, totalMatches, isSearching };
}