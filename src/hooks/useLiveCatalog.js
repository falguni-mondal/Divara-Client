"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Fetches live filtered catalog items from GET /api/v1/products (MongoDB $facet).
 * Starts empty with loading=true so pages render shimmer skeletons cleanly without fake dummy items.
 */
export function useLiveCatalog(params) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryKey = JSON.stringify(params || {});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      api
        .get("/products", { params, signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            setItems(Array.isArray(data.data?.items) ? data.data.items : []);
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
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return { items, loading, error };
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