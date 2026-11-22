"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Plus, Minus, Search, AlertTriangle, FileSpreadsheet, Loader2 } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { ikUrl } from "@/lib/imagekit";
import { downloadExcelWorkbook } from "@/lib/excelExport";
import UrlPagination, { useUrlPageParam } from "./UrlPagination";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 450;

export default function AdminInventoryTab() {
  const [page, setPage] = useUrlPageParam("page");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Visual badges for pending / syncing variants: { [key]: { delta: number, syncing: boolean } }
  const [variantStatus, setVariantStatus] = useState({});

  const productsRef = useRef([]);
  const pendingDeltasRef = useRef(new Map());
  const timersRef = useRef(new Map());
  const inFlightRef = useRef(new Set());
  const confirmedStockRef = useRef(new Map());

  const updateProductsState = useCallback((updater) => {
    setProducts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      productsRef.current = next;
      return next;
    });
  }, []);

  const syncConfirmedMap = useCallback((list) => {
    for (const p of list || []) {
      for (const v of p.variants || []) {
        const key = `${p._id}:${v.size}`;
        if (!pendingDeltasRef.current.has(key) && !inFlightRef.current.has(key)) {
          confirmedStockRef.current.set(key, v.stockOnHand ?? 0);
        }
      }
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/products", { params: { exportAll: "true" } });
      const list = data.data?.products || [];
      productsRef.current = list;
      setProducts(list);
      syncConfirmedMap(list);
    } finally {
      setLoading(false);
    }
  }, [syncConfirmedMap]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const flushVariantDelta = useCallback(
    async (productId, size) => {
      const key = `${productId}:${size}`;
      const existingTimer = timersRef.current.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
        timersRef.current.delete(key);
      }

      if (inFlightRef.current.has(key)) return;

      const deltaToSend = pendingDeltasRef.current.get(key) || 0;
      pendingDeltasRef.current.delete(key);

      if (deltaToSend === 0) {
        setVariantStatus((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return;
      }

      inFlightRef.current.add(key);
      setVariantStatus((prev) => ({
        ...prev,
        [key]: { delta: deltaToSend, syncing: true },
      }));
      setErrorMsg("");

      try {
        const { data } = await api.patch(`/admin/products/${productId}/stock`, {
          size,
          delta: deltaToSend,
        });
        const updated = data.data?.product;

        if (updated) {
          const serverVariant = (updated.variants || []).find((v) => v.size === size);
          const serverStock = serverVariant?.stockOnHand ?? 0;
          confirmedStockRef.current.set(key, serverStock);

          const queuedDelta = pendingDeltasRef.current.get(key) || 0;
          updateProductsState((prev) =>
            prev.map((p) => {
              if (p._id !== updated._id) return p;
              if (queuedDelta === 0) return updated;
              return {
                ...updated,
                variants: (updated.variants || []).map((v) =>
                  v.size === size
                    ? {
                        ...v,
                        stockOnHand: Math.max(v.stockReserved || 0, serverStock + queuedDelta),
                      }
                    : v
                ),
              };
            })
          );
        }
      } catch (err) {
        setErrorMsg(getApiErrorMessage(err, "Could not adjust stock."));
        const rollbackStock = confirmedStockRef.current.get(key);
        if (typeof rollbackStock === "number") {
          const queuedDelta = pendingDeltasRef.current.get(key) || 0;
          updateProductsState((prev) =>
            prev.map((p) =>
              p._id !== productId
                ? p
                : {
                    ...p,
                    variants: (p.variants || []).map((v) =>
                      v.size === size
                        ? {
                            ...v,
                            stockOnHand: Math.max(
                              v.stockReserved || 0,
                              rollbackStock + queuedDelta
                            ),
                          }
                        : v
                    ),
                  }
            )
          );
        }
      } finally {
        inFlightRef.current.delete(key);

        const remaining = pendingDeltasRef.current.get(key) || 0;
        if (remaining !== 0) {
          setVariantStatus((prev) => ({
            ...prev,
            [key]: { delta: remaining, syncing: false },
          }));
          const nextTimer = setTimeout(() => {
            flushVariantDelta(productId, size);
          }, DEBOUNCE_MS);
          timersRef.current.set(key, nextTimer);
        } else {
          setVariantStatus((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      }
    },
    [updateProductsState]
  );

  // Flush any pending stock edits if admin leaves the Inventory tab before debounce expires
  useEffect(() => {
    const timersMap = timersRef.current;
    const pendingMap = pendingDeltasRef.current;
    return () => {
      for (const timer of timersMap.values()) {
        clearTimeout(timer);
      }
      timersMap.clear();
      for (const [key, delta] of pendingMap.entries()) {
        if (delta !== 0) {
          const idx = key.indexOf(":");
          const productId = key.slice(0, idx);
          const size = key.slice(idx + 1);
          api.patch(`/admin/products/${productId}/stock`, { size, delta }).catch(() => {});
        }
      }
      pendingMap.clear();
    };
  }, []);

  const handleAdjust = (productId, size, stepDelta) => {
    const key = `${productId}:${size}`;
    setErrorMsg("");

    // Compute appliedDelta synchronously from productsRef so React 18/19 batching never zeroes it out
    const targetProduct = productsRef.current.find((p) => p._id === productId);
    const targetVariant = targetProduct?.variants?.find((v) => v.size === size);
    if (!targetVariant) return;

    const current = targetVariant.stockOnHand ?? 0;
    const minAllowed = targetVariant.stockReserved ?? 0;
    const nextStock = Math.max(minAllowed, current + stepDelta);
    const appliedDelta = nextStock - current;

    if (appliedDelta === 0) return;

    // Optimistically update UI & productsRef immediately
    const nextProducts = productsRef.current.map((p) => {
      if (p._id !== productId) return p;
      return {
        ...p,
        variants: (p.variants || []).map((v) =>
          v.size === size ? { ...v, stockOnHand: nextStock } : v
        ),
      };
    });
    productsRef.current = nextProducts;
    setProducts(nextProducts);

    // Accumulate pending delta & schedule debounced API flush
    const nextPending = (pendingDeltasRef.current.get(key) || 0) + appliedDelta;
    if (nextPending === 0) {
      pendingDeltasRef.current.delete(key);
    } else {
      pendingDeltasRef.current.set(key, nextPending);
    }

    setVariantStatus((prev) => {
      if (nextPending === 0 && !inFlightRef.current.has(key)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: { delta: nextPending, syncing: inFlightRef.current.has(key) },
      };
    });

    const prevTimer = timersRef.current.get(key);
    if (prevTimer) clearTimeout(prevTimer);

    if (!inFlightRef.current.has(key)) {
      const nextTimer = setTimeout(() => {
        flushVariantDelta(productId, size);
      }, DEBOUNCE_MS);
      timersRef.current.set(key, nextTimer);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        (p.variants || []).some((v) => v.sku.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (!lowStockOnly) return true;
      return (p.variants || []).some((v) => v.stockOnHand - v.stockReserved <= 3);
    });
  }, [products, search, lowStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleExportExcel = () => {
    const flatRows = [];
    for (const p of products) {
      for (const v of p.variants || []) {
        const available = Math.max(0, (v.stockOnHand || 0) - (v.stockReserved || 0));
        flatRows.push({
          title: p.title,
          slug: p.slug,
          category: p.categoryLabel,
          season: p.season,
          color: p.color,
          size: v.size,
          sku: v.sku,
          stockOnHand: v.stockOnHand || 0,
          stockReserved: v.stockReserved || 0,
          available,
          status: available === 0 ? "Out of Stock" : available <= 3 ? "Low Stock" : "Healthy",
          unitPriceInr: p.price || 0,
          inventoryValueInr: (v.stockOnHand || 0) * (p.price || 0),
        });
      }
    }

    downloadExcelWorkbook({
      filename: `DIVARA_Inventory_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: "Inventory",
      columns: [
        { label: "Product Title", key: "title" },
        { label: "Slug", key: "slug" },
        { label: "Category", key: "category" },
        { label: "Season", key: "season" },
        { label: "Color", key: "color" },
        { label: "Size", key: "size" },
        { label: "SKU", key: "sku" },
        { label: "Stock On Hand", key: "stockOnHand" },
        { label: "Reserved in Checkout", key: "stockReserved" },
        { label: "Available Stock", key: "available" },
        { label: "Stock Status", key: "status" },
        { label: "Unit Price (INR)", key: "unitPriceInr" },
        { label: "Stock Value (INR)", key: "inventoryValueInr" },
      ],
      rows: flatRows,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Live Stock Control
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Inventory Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#1b1717]/45" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title or SKU..."
              className="pl-8 pr-3 py-2 text-xs border border-[#1b1717]/25 outline-none focus:border-[#5d100a] w-52"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setLowStockOnly((prev) => !prev);
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] uppercase tracking-widest border rounded-[2px] cursor-pointer transition-colors ${
              lowStockOnly
                ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                : "border-[#1b1717]/25 text-[#1b1717] hover:border-[#1b1717]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-[10px] uppercase tracking-widest font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[#1b1717]/55">Loading inventory...</p>
      ) : paginatedProducts.length === 0 ? (
        <p className="text-xs text-[#1b1717]/55">No matching products found.</p>
      ) : (
        <div className="space-y-4">
          {paginatedProducts.map((product) => (
            <div
              key={product._id}
              className="border border-[#1b1717]/15 p-4 sm:p-5 bg-[#ffffff] space-y-4"
            >
              <div className="flex items-center gap-3.5 border-b border-[#1b1717]/10 pb-3.5">
                <img
                  src={ikUrl(product.imageMedia?.url, { width: 100 })}
                  alt={product.title}
                  className="w-11 h-14 object-cover bg-[#1b1717]/5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="heading-serif text-base sm:text-lg font-normal truncate">
                    {product.title}
                  </h2>
                  <p className="text-[10px] uppercase tracking-wider text-[#1b1717]/55">
                    {product.categoryLabel} • {product.season} • {product.color}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {(product.variants || []).map((v) => {
                  const available = Math.max(0, v.stockOnHand - v.stockReserved);
                  const key = `${product._id}:${v.size}`;
                  const st = variantStatus[key];

                  return (
                    <div
                      key={v.size}
                      className="border border-[#1b1717]/15 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{v.size}</span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-[2px] ${
                              available === 0
                                ? "bg-[#5d100a] text-[#ffffff]"
                                : available <= 3
                                ? "bg-[#5d100a]/10 text-[#5d100a]"
                                : "bg-[#1b1717]/10 text-[#1b1717]"
                            }`}
                          >
                            {available === 0 ? "Out" : `${available} avail`}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[#1b1717]/50 truncate mt-0.5">
                          {v.sku}
                        </p>
                        {v.stockReserved > 0 && (
                          <p className="text-[10px] text-[#5d100a]">
                            {v.stockReserved} held in checkout
                          </p>
                        )}
                        {st && (
                          <p className="text-[10px] text-[#5d100a] inline-flex items-center gap-1 mt-0.5">
                            {st.syncing && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                            <span>
                              {st.syncing
                                ? "Saving..."
                                : `${st.delta > 0 ? `+${st.delta}` : st.delta} pending...`}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center border border-[#1b1717]/25 shrink-0">
                        <button
                          type="button"
                          disabled={v.stockOnHand <= v.stockReserved}
                          onClick={() => handleAdjust(product._id, v.size, -1)}
                          aria-label={`Decrease stock for ${v.size}`}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-semibold select-none">
                          {v.stockOnHand}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjust(product._id, v.size, 1)}
                          aria-label={`Increase stock for ${v.size}`}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#5d100a] hover:text-[#ffffff] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <UrlPagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredProducts.length}
        onPageChange={setPage}
      />
    </div>
  );
}