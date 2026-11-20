"use client";

import React, { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { uploadAdminImageToImageKit, ikUrl } from "@/lib/imagekit";

export default function AdminReviewsTab() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    productSlug: "",
    reviewerName: "",
    rating: 5,
    title: "",
    comment: "",
    isVerifiedPurchase: true,
    createdAt: "",
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    api.get("/admin/products").then(({ data }) => {
      const list = data.data?.products || [];
      setProducts(list);
      if (list[0]) setForm((prev) => ({ ...prev, productSlug: list[0].slug }));
    });
  }, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - images.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await uploadAdminImageToImageKit(file, "/divara/reviews"));
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, 3));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSeed = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setFeedback("");
    try {
      const { data } = await api.post("/reviews/admin/seed", {
        productSlug: form.productSlug,
        reviews: [
          {
            reviewerName: form.reviewerName.trim(),
            rating: Number(form.rating),
            title: form.title.trim(),
            comment: form.comment.trim(),
            images,
            isVerifiedPurchase: form.isVerifiedPurchase,
            ...(form.createdAt ? { createdAt: new Date(form.createdAt).toISOString() } : {}),
          },
        ],
      });
      setFeedback(data.message || "Review seeded.");
      setForm((prev) => ({ ...prev, reviewerName: "", title: "", comment: "", createdAt: "" }));
      setImages([]);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not seed review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Social Proof &amp; Moderation
        </span>
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
          Seed Product Reviews
        </h1>
      </div>

      <form onSubmit={handleSeed} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4">
        {errorMsg && (
          <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
            {errorMsg}
          </div>
        )}
        {feedback && (
          <div className="p-3 bg-[#1b1717]/5 border border-[#1b1717]/20 text-xs">{feedback}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={form.productSlug}
            onChange={(e) => setForm({ ...form, productSlug: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
          >
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>

          <input
            type="text"
            required
            placeholder="Reviewer Name *"
            value={form.reviewerName}
            onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs"
          />

          <select
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} Stars
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={form.createdAt}
            onChange={(e) => setForm({ ...form, createdAt: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs"
            title="Optional custom review date"
          />
        </div>

        <input
          type="text"
          required
          minLength={3}
          placeholder="Review Title *"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
        />

        <textarea
          rows={3}
          required
          minLength={10}
          placeholder="Review Comment *"
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
        />

        <div className="flex flex-wrap items-center gap-3">
          {images.map((img) => (
            <div key={img.fileId} className="relative w-14 h-18 border border-[#1b1717]/20">
              <img src={ikUrl(img.url, { width: 160 })} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((i) => i.fileId !== img.fileId))}
                className="absolute top-0 right-0 bg-[#1b1717] text-[#ffffff] p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#1b1717]/35 text-[11px] cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? "Uploading..." : `Add Photos (${images.length}/3)`}</span>
              <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>

        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={form.isVerifiedPurchase}
            onChange={(e) => setForm({ ...form, isVerifiedPurchase: e.target.checked })}
          />
          <span>Show Verified Purchase Badge</span>
        </label>

        <div>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-6 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving ? "Seeding..." : "Publish Seeded Review"}
          </button>
        </div>
      </form>
    </div>
  );
}