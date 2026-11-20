"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Minus, Search, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { ikUrl } from "@/lib/imagekit";
import { downloadExcelWorkbook } from "@/lib/excelExport";
import UrlPagination, { useUrlPageParam } from "./UrlPagination";

const PAGE_SIZE = 10;

export default function AdminInventoryTab() {
  const [page, setPage] = useUrlPageParam("page");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/products", { params: { exportAll: "true" } });
      setProducts(data.data?.products || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAdjust = async (productId, size, delta) => {
    const key = `${productId}:${size}`;
    setBusyKey(key);
    setErrorMsg("");

    try {
      const { data } = await api.patch(`/admin/products/${productId}/stock`, { size, delta });
      const updated = data.data?.product;
      if (updated) {
        setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not adjust stock."));
    } finally {
      setBusyKey(null);
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
                  const isBusy = busyKey === key;

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
                      </div>

                      <div className="flex items-center border border-[#1b1717]/25 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy || v.stockOnHand <= v.stockReserved}
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
                          disabled={isBusy}
                          onClick={() => handleAdjust(product._id, v.size, 1)}
                          aria-label={`Increase stock for ${v.size}`}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#5d100a] hover:text-[#ffffff] transition-colors cursor-pointer disabled:opacity-30"
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