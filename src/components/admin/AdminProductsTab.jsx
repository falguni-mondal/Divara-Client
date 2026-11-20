"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { uploadAdminImageToImageKit, ikUrl } from "@/lib/imagekit";
import { formatINR } from "@/data/catalogData";

const INITIAL_FORM = {
  title: "",
  slug: "",
  category: "saree",
  season: "Winter",
  color: "Maroon",
  colorHex: "#5d100a",
  fabric: "Silk",
  price: 25000,
  description: "",
  craftNotesText: "",
  sizesCsv: "Free Size",
  stockPerSize: 8,
  imageMedia: { url: "", fileId: null },
  galleryMedia: [],
  isFeatured: false,
};

export default function AdminProductsTab() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadProducts = useCallback(async () => {
    const { data } = await api.get("/admin/products");
    setProducts(data.data?.products || []);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handlePrimaryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const uploaded = await uploadAdminImageToImageKit(file, "/divara/products");
      setForm((prev) => ({
        ...prev,
        imageMedia: uploaded,
        galleryMedia: [uploaded, ...prev.galleryMedia],
      }));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      const slug =
        form.slug.trim() ||
        form.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const sizes = form.sizesCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const variants = sizes.map((size) => ({
        size,
        sku: `DIV-${form.category.slice(0, 3).toUpperCase()}-${slug.slice(0, 4).toUpperCase()}-${size.replace(/\s+/g, "")}`,
        stockOnHand: Number(form.stockPerSize) || 5,
        stockReserved: 0,
      }));

      await api.post("/admin/products", {
        slug,
        title: form.title.trim(),
        category: form.category,
        season: form.season,
        color: form.color.trim(),
        colorHex: form.colorHex,
        fabric: form.fabric.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        craftNotes: form.craftNotesText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        imageMedia: form.imageMedia,
        galleryMedia: form.galleryMedia.length > 0 ? form.galleryMedia : [form.imageMedia],
        variants,
        isFeatured: form.isFeatured,
      });

      setForm(INITIAL_FORM);
      setShowForm(false);
      await loadProducts();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not create product."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}" permanently?`)) return;
    await api.delete(`/admin/products/${id}`);
    await loadProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Catalog &amp; ImageKit Inventory
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Products ({products.length})
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? "Close Form" : "Add Product"}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              required
              placeholder="Product Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
            />
            <input
              type="text"
              placeholder="Slug (auto-generated if blank)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
            />
            <input
              type="number"
              required
              min={1000}
              placeholder="Price (INR) *"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
            >
              <option value="saree">Sarees</option>
              <option value="dress">Dresses</option>
              <option value="denim">Denim Wears</option>
              <option value="shirt">Shirts</option>
            </select>
            <select
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
            >
              <option value="Winter">Winter</option>
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
              <option value="Autumn">Autumn</option>
            </select>
            <input
              type="text"
              required
              placeholder="Fabric (e.g. Silk, Velvet, Chanderi)"
              value={form.fabric}
              onChange={(e) => setForm({ ...form, fabric: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
            <input
              type="text"
              required
              placeholder="Color Name (e.g. Maroon)"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
            <input
              type="text"
              required
              placeholder="Sizes CSV (XS,S,M,L or Free Size)"
              value={form.sizesCsv}
              onChange={(e) => setForm({ ...form, sizesCsv: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
            <input
              type="number"
              min={1}
              placeholder="Stock per size"
              value={form.stockPerSize}
              onChange={(e) => setForm({ ...form, stockPerSize: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
          </div>

          <textarea
            rows={2}
            required
            placeholder="Product Description *"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
          />

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-[#1b1717]/40 hover:border-[#5d100a] text-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? "Uploading to ImageKit..." : "Upload Primary Image to ImageKit"}</span>
              <input type="file" accept="image/*" onChange={handlePrimaryUpload} className="hidden" />
            </label>
            {form.imageMedia.url && (
              <img
                src={ikUrl(form.imageMedia.url, { width: 120 })}
                alt="Preview"
                className="w-12 h-16 object-cover border border-[#1b1717]/20"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={saving || uploading || !form.imageMedia.url}
            className="px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving..." : "Publish Product"}
          </button>
        </form>
      )}

      <div className="border border-[#1b1717]/15 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4">Garment</th>
              <th className="py-3 px-4">Category / Season</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Total Stock</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {products.map((p) => {
              const stock = (p.variants || []).reduce(
                (sum, v) => sum + Math.max(0, v.stockOnHand - v.stockReserved),
                0
              );
              return (
                <tr key={p._id}>
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img
                      src={ikUrl(p.imageMedia?.url, { width: 100 })}
                      alt={p.title}
                      className="w-10 h-12 object-cover bg-[#1b1717]/5"
                    />
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-[10px] text-[#1b1717]/55">{p.slug}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {p.categoryLabel} • {p.season}
                  </td>
                  <td className="py-3 px-4 font-semibold">{formatINR(p.price)}</td>
                  <td className="py-3 px-4">{stock} pcs</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(p._id, p.title)}
                      className="p-1.5 text-[#5d100a] hover:bg-[#5d100a]/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}