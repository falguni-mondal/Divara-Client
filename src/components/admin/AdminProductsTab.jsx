"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  GripVertical,
  Loader2,
  Lock,
  Unlock,
  FileSpreadsheet,
} from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import {
  uploadAdminImageToImageKit,
  deleteAdminImageFromImageKit,
  ikUrl,
} from "@/lib/imagekit";
import { formatINR } from "@/data/catalogData";
import { downloadExcelWorkbook } from "@/lib/excelExport";
import UrlPagination, { useUrlPageParam } from "./UrlPagination";

const CATEGORY_OPTIONS = [
  { value: "saree", label: "Sarees", code: "SAR", defaultFabric: "Silk" },
  { value: "dress", label: "Dresses", code: "DRS", defaultFabric: "Velvet" },
  { value: "denim", label: "Denim Wears", code: "DNM", defaultFabric: "Cotton Denim" },
  { value: "shirt", label: "Shirts", code: "SHR", defaultFabric: "Silk" },
];

const SEASON_OPTIONS = ["Winter", "Spring", "Summer", "Autumn"];

const COLOR_OPTIONS = [
  { name: "Maroon", hex: "#5d100a" },
  { name: "Black", hex: "#1b1717" },
  { name: "Ivory", hex: "#edebdd" },
  { name: "Indigo", hex: "#26364d" },
  { name: "Gold", hex: "#b69148" },
];

const FABRIC_OPTIONS = ["Silk", "Velvet", "Cotton Denim", "Chanderi"];
const ALL_SIZES = ["XS", "S", "M", "L", "XL", "Free Size"];

function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function makeSku(category, slug, size) {
  const catCode = CATEGORY_OPTIONS.find((c) => c.value === category)?.code || "DIV";
  const slugPart = (slug || "ITEM").replace(/-/g, "").slice(0, 5).toUpperCase();
  const sizePart = size.replace(/\s+/g, "").toUpperCase();
  return `DIV-${catCode}-${slugPart}-${sizePart}`;
}

function createInitialForm() {
  return {
    title: "",
    slug: "",
    category: "saree",
    season: "Winter",
    colorPreset: "Maroon",
    color: "Maroon",
    colorHex: "#5d100a",
    fabric: "Silk",
    price: 25000,
    description: "",
    craftNotesText: "",
    variants: [
      { size: "Free Size", sku: "DIV-SAR-ITEM-FREESIZE", stockOnHand: 8, stockReserved: 0 },
    ],
    galleryMedia: [],
    isActive: true,
  };
}

export default function AdminProductsTab() {
  const [page, setPage] = useUrlPageParam("page");
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [slugUnlocked, setSlugUnlocked] = useState(false);

  const [form, setForm] = useState(createInitialForm);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDropActive, setIsDropActive] = useState(false);
  const [draggedImgIdx, setDraggedImgIdx] = useState(null);

  const sessionUploadedIdsRef = useRef(new Set());

  const [draggedProdIdx, setDraggedProdIdx] = useState(null);
  const [reordering, setReordering] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/products", { params: { page, limit: 15 } });
      setProducts(data.data?.products || []);
      if (data.data?.pagination) setPagination(data.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const cleanupUnsavedUploads = async () => {
    const ids = Array.from(sessionUploadedIdsRef.current);
    sessionUploadedIdsRef.current.clear();
    if (ids.length > 0) {
      await Promise.allSettled(ids.map((id) => deleteAdminImageFromImageKit(id)));
    }
  };

  const isSaree = form.category === "saree";
  const isDenim = form.category === "denim";
  const isCustomColor = form.colorPreset === "__custom__";

  const openCreateForm = async () => {
    await cleanupUnsavedUploads();
    setEditingId(null);
    setSlugUnlocked(false);
    setForm(createInitialForm());
    setErrorMsg("");
    setShowForm(true);
  };

  const closeFormWithCleanup = async () => {
    await cleanupUnsavedUploads();
    setShowForm(false);
    setEditingId(null);
  };

  const openEditForm = async (product) => {
    await cleanupUnsavedUploads();
    setEditingId(product._id);
    setSlugUnlocked(false);
    setErrorMsg("");

    const gallery =
      Array.isArray(product.galleryMedia) && product.galleryMedia.length > 0
        ? product.galleryMedia
        : product.imageMedia?.url
        ? [product.imageMedia]
        : [];

    const matchedPreset = COLOR_OPTIONS.find(
      (c) =>
        c.name.toLowerCase() === (product.color || "").toLowerCase() &&
        c.hex.toLowerCase() === (product.colorHex || "").toLowerCase()
    );

    setForm({
      title: product.title || "",
      slug: product.slug || "",
      category: product.category || "saree",
      season: product.season || "Winter",
      colorPreset: matchedPreset ? matchedPreset.name : "__custom__",
      color: product.color || "",
      colorHex: product.colorHex || "#5d100a",
      fabric: product.fabric || "Silk",
      price: product.price || 25000,
      description: product.description || "",
      craftNotesText: (product.craftNotes || []).join("\n"),
      variants:
        (product.variants || []).length > 0
          ? product.variants.map((v) => ({
              size: v.size,
              sku: v.sku,
              stockOnHand: v.stockOnHand ?? 5,
              stockReserved: v.stockReserved ?? 0,
            }))
          : [
              {
                size: "Free Size",
                sku: makeSku(product.category, product.slug, "Free Size"),
                stockOnHand: 5,
                stockReserved: 0,
              },
            ],
      galleryMedia: gallery.slice(0, 5),
      isActive: product.isActive !== false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryChange = (nextCategory) => {
    const meta = CATEGORY_OPTIONS.find((c) => c.value === nextCategory);
    setForm((prev) => {
      const nextSlug = prev.slug || makeSlug(prev.title);
      let nextVariants = prev.variants;
      let nextFabric = prev.fabric;

      if (nextCategory === "saree") {
        const existingFree = prev.variants.find((v) => v.size === "Free Size");
        nextVariants = [
          existingFree || {
            size: "Free Size",
            sku: makeSku(nextCategory, nextSlug, "Free Size"),
            stockOnHand: 8,
            stockReserved: 0,
          },
        ];
        if (prev.fabric === "Cotton Denim") nextFabric = "Silk";
      } else {
        const apparelOnly = prev.variants.filter((v) => v.size !== "Free Size");
        nextVariants =
          apparelOnly.length > 0
            ? apparelOnly
            : ["S", "M", "L"].map((size) => ({
                size,
                sku: makeSku(nextCategory, nextSlug, size),
                stockOnHand: 6,
                stockReserved: 0,
              }));
        if (nextCategory === "denim") {
          nextFabric = "Cotton Denim";
        } else if (prev.fabric === "Cotton Denim" && meta?.defaultFabric) {
          nextFabric = meta.defaultFabric;
        }
      }

      return { ...prev, category: nextCategory, fabric: nextFabric, variants: nextVariants };
    });
  };

  const handleColorPresetChange = (val) => {
    if (val === "__custom__") {
      setForm((prev) => ({ ...prev, colorPreset: "__custom__", color: "" }));
      return;
    }
    const match = COLOR_OPTIONS.find((c) => c.name === val);
    setForm((prev) => ({
      ...prev,
      colorPreset: val,
      color: match ? match.name : prev.color,
      colorHex: match ? match.hex : prev.colorHex,
    }));
  };

  const handleManualHexPick = (hex) => {
    const match = COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    setForm((prev) => ({
      ...prev,
      colorPreset: match ? match.name : "__custom__",
      color: match ? match.name : prev.colorPreset === "__custom__" ? prev.color : "",
      colorHex: hex,
    }));
  };

  const handleTitleChange = (val) => {
    setForm((prev) => {
      const nextSlug = !editingId && !slugUnlocked ? makeSlug(val) : prev.slug;
      return {
        ...prev,
        title: val,
        slug: nextSlug,
        variants: !editingId
          ? prev.variants.map((v) => ({
              ...v,
              sku: makeSku(prev.category, nextSlug, v.size),
            }))
          : prev.variants,
      };
    });
  };

  const toggleSizeVariant = (size) => {
    if (isSaree && size !== "Free Size") return;
    if (!isSaree && size === "Free Size") return;

    setForm((prev) => {
      const exists = prev.variants.some((v) => v.size === size);
      if (exists) {
        if (prev.variants.length <= 1) return prev;
        return { ...prev, variants: prev.variants.filter((v) => v.size !== size) };
      }
      const nextSlug = prev.slug || makeSlug(prev.title);
      return {
        ...prev,
        variants: [
          ...prev.variants,
          { size, sku: makeSku(prev.category, nextSlug, size), stockOnHand: 6, stockReserved: 0 },
        ],
      };
    });
  };

  const updateVariantField = (size, field, value) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.size === size
          ? {
              ...v,
              [field]:
                field === "stockOnHand"
                  ? Math.max(v.stockReserved || 0, Number(value) || 0)
                  : value,
            }
          : v
      ),
    }));
  };

  const uploadFilesAsync = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const remaining = 5 - form.galleryMedia.length - uploadingCount;
    if (remaining <= 0) {
      setErrorMsg("Maximum 5 images allowed per product.");
      return;
    }

    const batch = files.slice(0, remaining);
    setErrorMsg("");
    setUploadingCount((c) => c + batch.length);

    await Promise.all(
      batch.map(async (file) => {
        try {
          const uploaded = await uploadAdminImageToImageKit(file, "/divara/products");
          if (uploaded.fileId) sessionUploadedIdsRef.current.add(uploaded.fileId);
          setForm((prev) => ({
            ...prev,
            galleryMedia: [...prev.galleryMedia, uploaded].slice(0, 5),
          }));
        } catch (err) {
          setErrorMsg(err.message || `Failed to upload ${file.name}`);
        } finally {
          setUploadingCount((c) => Math.max(0, c - 1));
        }
      })
    );
  };

  const handleRemoveImage = async (idx) => {
    const target = form.galleryMedia[idx];
    setForm((prev) => ({
      ...prev,
      galleryMedia: prev.galleryMedia.filter((_, i) => i !== idx),
    }));

    if (target?.fileId && sessionUploadedIdsRef.current.has(target.fileId)) {
      sessionUploadedIdsRef.current.delete(target.fileId);
      await deleteAdminImageFromImageKit(target.fileId);
    }
  };

  const handleImageDropReorder = (targetIdx) => {
    if (draggedImgIdx === null || draggedImgIdx === targetIdx) return;
    setForm((prev) => {
      const next = [...prev.galleryMedia];
      const [moved] = next.splice(draggedImgIdx, 1);
      next.splice(targetIdx, 0, moved);
      return { ...prev, galleryMedia: next };
    });
    setDraggedImgIdx(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setFeedback("");

    if (!form.color.trim()) {
      setErrorMsg("Please enter a color name for your custom color.");
      return;
    }
    if (form.galleryMedia.length < 1 || form.galleryMedia.length > 5) {
      setErrorMsg("Please upload between 1 and 5 product images.");
      return;
    }

    setSaving(true);
    try {
      const finalSlug = form.slug.trim() || makeSlug(form.title);
      const catLabel =
        CATEGORY_OPTIONS.find((c) => c.value === form.category)?.label || form.category;

      const payload = {
        slug: finalSlug,
        title: form.title.trim(),
        category: form.category,
        categoryLabel: catLabel,
        season: form.season,
        color: form.color.trim(),
        colorHex: form.colorHex,
        fabric: form.fabric,
        price: Number(form.price),
        description: form.description.trim(),
        craftNotes: form.craftNotesText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        imageMedia: form.galleryMedia[0],
        galleryMedia: form.galleryMedia,
        variants: form.variants.map((v) => ({
          size: v.size,
          sku: v.sku.trim().toUpperCase(),
          stockOnHand: Number(v.stockOnHand) || 0,
          stockReserved: Number(v.stockReserved) || 0,
        })),
        isActive: form.isActive,
      };

      if (editingId) {
        await api.patch(`/admin/products/${editingId}`, payload);
        setFeedback(`Updated "${payload.title}".`);
      } else {
        await api.post("/admin/products", payload);
        setFeedback(`Published "${payload.title}".`);
      }

      sessionUploadedIdsRef.current.clear();
      setForm(createInitialForm());
      setEditingId(null);
      setShowForm(false);
      await loadProducts();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not save product."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product) => {
    setTogglingId(product._id);
    setErrorMsg("");
    try {
      const { data } = await api.patch(`/admin/products/${product._id}/toggle-active`);
      const updated = data.data?.product;
      if (updated) {
        setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      }
      setFeedback(data.message || "Product visibility updated.");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not toggle product status."));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, title) => {
    if (
      !confirm(
        `Delete "${title}"? (If customers have ordered it in the past, it will be safely hidden as Draft instead of deleted.)`
      )
    ) {
      return;
    }
    try {
      const { data } = await api.delete(`/admin/products/${id}`);
      setFeedback(data.message || "Product updated.");
      await loadProducts();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not delete product."));
    }
  };

  const handleProductDrop = async (targetIdx) => {
    if (draggedProdIdx === null || draggedProdIdx === targetIdx) {
      setDraggedProdIdx(null);
      return;
    }

    const nextList = [...products];
    const [moved] = nextList.splice(draggedProdIdx, 1);
    nextList.splice(targetIdx, 0, moved);
    setProducts(nextList);
    setDraggedProdIdx(null);
    setReordering(true);

    try {
      await api.patch("/admin/products/reorder", {
        orderedIds: nextList.map((p) => p._id),
      });
      setFeedback("Storefront product order updated.");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not save new product order."));
      await loadProducts();
    } finally {
      setReordering(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const { data } = await api.get("/admin/products", { params: { exportAll: "true" } });
      const all = data.data?.products || [];
      downloadExcelWorkbook({
        filename: `DIVARA_Products_${new Date().toISOString().slice(0, 10)}.xls`,
        sheetName: "Products",
        columns: [
          { label: "Sort Order", value: (r) => r.sortOrder ?? 0 },
          { label: "Title", key: "title" },
          { label: "Slug", key: "slug" },
          { label: "Category", key: "categoryLabel" },
          { label: "Season", key: "season" },
          { label: "Fabric", key: "fabric" },
          { label: "Color", key: "color" },
          { label: "Color Hex", key: "colorHex" },
          { label: "Final MRP Incl. GST (INR)", value: (r) => Number(r.price || 0) },
          {
            label: "Total Stock",
            value: (r) => (r.variants || []).reduce((s, v) => s + (v.stockOnHand || 0), 0),
          },
          {
            label: "Reserved Stock",
            value: (r) => (r.variants || []).reduce((s, v) => s + (v.stockReserved || 0), 0),
          },
          {
            label: "Available Stock",
            value: (r) =>
              (r.variants || []).reduce(
                (s, v) => s + Math.max(0, (v.stockOnHand || 0) - (v.stockReserved || 0)),
                0
              ),
          },
          {
            label: "Sizes & SKUs",
            value: (r) =>
              (r.variants || []).map((v) => `${v.size}: ${v.sku} (${v.stockOnHand})`).join(" | "),
          },
          { label: "Status", value: (r) => (r.isActive ? "Active" : "Draft") },
          { label: "Images Count", value: (r) => r.galleryMedia?.length || 1 },
          { label: "Primary Image URL", value: (r) => r.imageMedia?.url || "" },
          { label: "Description", key: "description" },
          { label: "Craft Notes", value: (r) => (r.craftNotes || []).join(" ; ") },
        ],
        rows: all,
      });
    } finally {
      setExporting(false);
    }
  };

  const finalMrp = Number(form.price) || 0;
  const baseValuePreview = Math.round(finalMrp / 1.12);
  const includedGstPreview = finalMrp - baseValuePreview;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Catalog &amp; ImageKit Studio
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Products ({pagination.total})
          </h1>
          <p className="text-[11px] text-[#1b1717]/60 mt-1">
            Drag rows by the grip handle to reorder storefront sequence, or click Active/Draft to toggle visibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{exporting ? "Exporting..." : "Export Excel"}</span>
          </button>

          <button
            type="button"
            onClick={() => (showForm ? closeFormWithCleanup() : openCreateForm())}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showForm ? "Close Form" : "Add Product"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-[#1b1717]/5 border border-[#1b1717]/20 text-xs flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback("")} className="cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-6">
          <div className="flex items-center justify-between border-b border-[#1b1717]/15 pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                {editingId ? "Editing Existing Garment" : "New Atelier Creation"}
              </span>
              <h2 className="heading-serif text-xl font-normal">
                {editingId ? form.title || "Update Product" : "Add Product"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={openCreateForm}
                className="text-[10px] uppercase tracking-widest underline text-[#5d100a] cursor-pointer"
              >
                Switch to New Product
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
              {errorMsg}
            </div>
          )}

          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Royal Crimson Kanjivaram Saree"
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold">
                  URL Slug *
                </label>
                <button
                  type="button"
                  onClick={() => setSlugUnlocked((u) => !u)}
                  className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#5d100a] cursor-pointer"
                >
                  {slugUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{slugUnlocked ? "Unlocked" : editingId ? "Locked" : "Auto"}</span>
                </button>
              </div>
              <input
                type="text"
                required
                disabled={!slugUnlocked}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: makeSlug(e.target.value) })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a] disabled:bg-[#1b1717]/5 disabled:text-[#1b1717]/55"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Final Price / MRP Incl. 12% GST (INR) *
              </label>
              <input
                type="number"
                required
                min={1000}
                step={100}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
              />
              <span className="block text-[10px] text-[#1b1717]/55 mt-1">
                Base: {formatINR(baseValuePreview)} + Included 12% GST: {formatINR(includedGstPreview)}
              </span>
            </div>
          </div>

          {/* Row 2: Selective Dropdowns + Manual Color Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff] outline-none focus:border-[#5d100a]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Season *
              </label>
              <select
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff] outline-none focus:border-[#5d100a]"
              >
                {SEASON_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Fabric * {isDenim && <span className="text-[#5d100a]">(Locked)</span>}
              </label>
              <select
                value={form.fabric}
                disabled={isDenim}
                onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff] outline-none focus:border-[#5d100a] disabled:bg-[#1b1717]/5 disabled:text-[#1b1717]/55 disabled:cursor-not-allowed"
              >
                {FABRIC_OPTIONS.map((f) => (
                  <option key={f} value={f} disabled={isSaree && f === "Cotton Denim"}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Color Preset or Manual Picker *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colorHex}
                  onChange={(e) => handleManualHexPick(e.target.value)}
                  title="Pick any custom color"
                  className="w-9 h-9 p-0.5 border border-[#1b1717]/25 bg-[#ffffff] cursor-pointer shrink-0"
                />
                <select
                  value={form.colorPreset}
                  onChange={(e) => handleColorPresetChange(e.target.value)}
                  className="flex-1 border border-[#1b1717]/25 px-2.5 py-2 text-xs bg-[#ffffff] outline-none focus:border-[#5d100a]"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Color</option>
                </select>
              </div>
              {isCustomColor && (
                <div className="mt-2">
                  <label className="block text-[9px] uppercase tracking-[0.16em] text-[#5d100a] font-semibold mb-1">
                    Manual Color Name ({form.colorHex.toUpperCase()}) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="e.g., Emerald Green, Champagne Rose"
                    className="w-full border border-[#5d100a]/45 px-2.5 py-1.5 text-xs outline-none focus:border-[#5d100a]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Sizes & Variants */}
          <div className="border border-[#1b1717]/15 p-4 space-y-4">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold">
                Available Sizes, SKUs &amp; Opening Stock *
              </span>
              <p className="text-[11px] text-[#1b1717]/55 mt-0.5">
                {isSaree
                  ? "Sarees use Free Size draping — apparel sizes (XS–XL) are automatically disabled."
                  : "Select applicable apparel sizes (XS–XL). Free Size is disabled for tailored garments."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((size) => {
                const disabled = isSaree ? size !== "Free Size" : size === "Free Size";
                const selected = form.variants.some((v) => v.size === size);
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleSizeVariant(size)}
                    className={`px-3.5 py-1.5 text-[11px] uppercase tracking-wider border rounded-[2px] transition-colors ${
                      disabled
                        ? "border-[#1b1717]/10 bg-[#1b1717]/5 text-[#1b1717]/30 cursor-not-allowed"
                        : selected
                        ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a] cursor-pointer"
                        : "border-[#1b1717]/25 text-[#1b1717] hover:border-[#1b1717] cursor-pointer"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {form.variants.map((v) => (
                <div key={v.size} className="border border-[#1b1717]/15 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{v.size}</span>
                    {v.stockReserved > 0 && (
                      <span className="text-[10px] text-[#5d100a]">{v.stockReserved} reserved</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#1b1717]/55 mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) => updateVariantField(v.size, "sku", e.target.value)}
                      className="w-full border border-[#1b1717]/20 px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-[#5d100a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#1b1717]/55 mb-1">
                      Stock On Hand
                    </label>
                    <input
                      type="number"
                      min={v.stockReserved || 0}
                      required
                      value={v.stockOnHand}
                      onChange={(e) => updateVariantField(v.size, "stockOnHand", e.target.value)}
                      className="w-full border border-[#1b1717]/20 px-2.5 py-1.5 text-xs outline-none focus:border-[#5d100a]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Description & Craft Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Editorial Description *
              </label>
              <textarea
                rows={4}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Artisan Craft Notes (One bullet per line)
              </label>
              <textarea
                rows={4}
                value={form.craftNotesText}
                onChange={(e) => setForm({ ...form, craftNotesText: e.target.value })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
              />
            </div>
          </div>

          {/* Row 5: Drag-Drop 1-5 Image Uploader & Reorder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold">
                Product Gallery ({form.galleryMedia.length}/5 Images — Min 1, Max 5) *
              </label>
              <span className="text-[10px] text-[#1b1717]/55">
                Drag thumbnails to reorder • Slot #1 is Primary Cover
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDropActive(true);
              }}
              onDragLeave={() => setIsDropActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDropActive(false);
                if (e.dataTransfer.files?.length) uploadFilesAsync(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed p-5 transition-colors ${
                isDropActive
                  ? "border-[#5d100a] bg-[#5d100a]/5"
                  : "border-[#1b1717]/25 bg-[#1b1717]/[0.015]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {form.galleryMedia.map((img, idx) => (
                  <div
                    key={`${img.fileId || img.url}-${idx}`}
                    draggable
                    onDragStart={() => setDraggedImgIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleImageDropReorder(idx);
                    }}
                    className="relative w-24 h-32 border border-[#1b1717]/25 bg-[#ffffff] overflow-hidden cursor-grab active:cursor-grabbing"
                  >
                    <img
                      src={ikUrl(img.url, { width: 240 })}
                      alt={`Gallery ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[9px] uppercase tracking-widest font-semibold ${
                        idx === 0
                          ? "bg-[#5d100a] text-[#ffffff]"
                          : "bg-[#1b1717]/80 text-[#ffffff]"
                      }`}
                    >
                      {idx === 0 ? "Primary" : `#${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label="Remove image"
                      className="absolute top-1 right-1 bg-[#1b1717]/85 text-[#ffffff] hover:bg-[#5d100a] p-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {Array.from({ length: uploadingCount }).map((_, i) => (
                  <div
                    key={`uploading-${i}`}
                    className="w-24 h-32 border border-[#1b1717]/20 bg-[#ffffff] flex flex-col items-center justify-center gap-1.5 text-[10px] text-[#5d100a]"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ))}

                {form.galleryMedia.length + uploadingCount < 5 && (
                  <label className="w-28 h-32 border border-dashed border-[#1b1717]/35 hover:border-[#5d100a] bg-[#ffffff] flex flex-col items-center justify-center gap-2 text-center px-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#5d100a]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#1b1717]/75">
                      Drop or Select
                    </span>
                    <span className="text-[9px] text-[#1b1717]/45">Up to 5 total</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        uploadFilesAsync(e.target.files);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Row 6 */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#1b1717]/15">
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>Active on Storefront</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeFormWithCleanup}
                className="px-5 py-2.5 border border-[#1b1717]/25 text-xs uppercase tracking-widest cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingCount > 0 || form.galleryMedia.length < 1}
                className="px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Product" : "Publish Product"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Draggable Product List with Inline Active/Draft Toggle */}
      <div className="border border-[#1b1717]/15 overflow-x-auto bg-[#ffffff]">
        {reordering && (
          <div className="px-4 py-2 bg-[#5d100a]/5 text-[11px] text-[#5d100a] border-b border-[#1b1717]/10">
            Saving new product display order...
          </div>
        )}
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-3 w-10">Order</th>
              <th className="py-3 px-4">Garment</th>
              <th className="py-3 px-4">Category / Season</th>
              <th className="py-3 px-4">Final MRP</th>
              <th className="py-3 px-4">Available Stock</th>
              <th className="py-3 px-4">Visibility</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#1b1717]/55">
                  Loading products...
                </td>
              </tr>
            ) : (
              products.map((p, idx) => {
                const stock = (p.variants || []).reduce(
                  (sum, v) => sum + Math.max(0, v.stockOnHand - v.stockReserved),
                  0
                );
                return (
                  <tr
                    key={p._id}
                    draggable
                    onDragStart={() => setDraggedProdIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleProductDrop(idx)}
                    className={`transition-colors ${
                      draggedProdIdx === idx
                        ? "opacity-45 bg-[#5d100a]/5"
                        : "hover:bg-[#1b1717]/[0.02]"
                    }`}
                  >
                    <td className="py-3 px-3 text-[#1b1717]/45 cursor-grab active:cursor-grabbing">
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-[10px]">{(page - 1) * 15 + idx + 1}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img
                        src={ikUrl(p.imageMedia?.url, { width: 100 })}
                        alt={p.title}
                        className="w-10 h-12 object-cover bg-[#1b1717]/5 shrink-0"
                      />
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-[10px] text-[#1b1717]/55">
                          {p.slug} • {p.galleryMedia?.length || 1} photo(s)
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {p.categoryLabel} • {p.season}
                      <div className="text-[10px] text-[#1b1717]/55 flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20 inline-block"
                          style={{ backgroundColor: p.colorHex }}
                        />
                        <span>
                          {p.fabric} • {p.color}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{formatINR(p.price)}</td>
                    <td className="py-3 px-4">{stock} pcs</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        disabled={togglingId === p._id}
                        onClick={() => handleToggleActive(p)}
                        title="Click to toggle Active / Draft (Hidden)"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-[2px] transition-colors cursor-pointer disabled:opacity-50 ${
                          p.isActive
                            ? "bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a]"
                            : "bg-[#5d100a]/10 text-[#5d100a] border border-[#5d100a]/30 hover:bg-[#5d100a] hover:text-[#ffffff]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.isActive ? "bg-emerald-400" : "bg-[#5d100a]"
                          }`}
                        />
                        <span>{p.isActive ? "Active" : "Draft"}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(p)}
                          title="Edit Product"
                          className="p-1.5 border border-[#1b1717]/20 hover:border-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p._id, p.title)}
                          title="Delete (or Hide if previously ordered)"
                          className="p-1.5 border border-[#5d100a]/30 text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <UrlPagination
        page={page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        onPageChange={setPage}
      />
    </div>
  );
}