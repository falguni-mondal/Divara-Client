"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

/**
 * Fetches live backend-filtered catalog items from GET /api/v1/products (MongoDB $facet).
 * Debounces rapid filter/slider changes (default 350ms) and cancels stale in-flight requests via AbortController.
 */
export function useLiveCatalog(params, options = {}) {
  const debounceMs = typeof options.debounceMs === "number" ? options.debounceMs : 350;

  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 24, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isFirstLoadRef = useRef(true);
  const queryKey = JSON.stringify(params || {});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    // Immediate on initial mount, debounced on subsequent filter changes
    const delay = isFirstLoadRef.current ? 0 : debounceMs;
    isFirstLoadRef.current = false;

    const timer = setTimeout(() => {
      api
        .get("/products", { params, signal: controller.signal })
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          const nextItems = Array.isArray(data.data?.items) ? data.data.items : [];
          setItems(nextItems);
          if (data.data?.facets) setFacets(data.data.facets);
          if (data.meta) {
            setMeta(data.meta);
          } else {
            setMeta({ total: nextItems.length, page: 1, limit: 24, totalPages: 1 });
          }
        })
        .catch((err) => {
          if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
          setItems([]);
          setError("Unable to load collection right now. Please refresh.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, debounceMs]);

  return { items, facets, meta, loading, error };
}

/**
 * Debounced (400ms) backend search hook for SearchOverlay.jsx (GET /api/v1/products/search).
 * Cancels stale in-flight requests automatically as the user types.
 */
export function useLiveSearch(query, isOpen, debounceMs = 400) {
  const [matches, setMatches] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const trimmed = query.trim();

    setIsSearching(true);

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
            const list = Array.isArray(data.data?.items) ? data.data.items : [];
            setMatches(list);
            setTotalMatches(list.length);
          }
        })
        .catch((err) => {
          if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
          setMatches([]);
          setTotalMatches(0);
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