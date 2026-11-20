"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Upload, X, Check, EyeOff, Trash2, Star } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import {
  uploadAdminImageToImageKit,
  deleteAdminImageFromImageKit,
  ikUrl,
} from "@/lib/imagekit";

export default function AdminReviewsTab() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, published: 0, hidden: 0 });
  const [loadingQueue, setLoadingQueue] = useState(true);

  const [products, setProducts] = useState([]);
  const [showSeedForm, setShowSeedForm] = useState(false);
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

  const loadQueue = useCallback(
    async (status = statusFilter) => {
      setLoadingQueue(true);
      try {
        const { data } = await api.get("/reviews/admin/list", { params: { status } });
        setReviews(data.data?.reviews || []);
        if (data.data?.counts) setCounts(data.data.counts);
      } finally {
        setLoadingQueue(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    loadQueue(statusFilter);
  }, [statusFilter, loadQueue]);

  useEffect(() => {
    api.get("/admin/products", { params: { exportAll: "true" } }).then(({ data }) => {
      const list = data.data?.products || [];
      setProducts(list);
      if (list[0]) setForm((prev) => ({ ...prev, productSlug: list[0].slug }));
    });
  }, []);

  const handleModerate = async (reviewId, nextStatus) => {
    setErrorMsg("");
    try {
      await api.patch(`/reviews/admin/${reviewId}/status`, { status: nextStatus });
      await loadQueue(statusFilter);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not update review status."));
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Delete this review permanently?")) return;
    await api.delete(`/reviews/admin/${reviewId}`);
    await loadQueue(statusFilter);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - images.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map((file) => uploadAdminImageToImageKit(file, "/divara/reviews"))
      );
      setImages((prev) => [...prev, ...uploaded].slice(0, 3));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSeedImage = async (fileId) => {
    setImages((prev) => prev.filter((i) => i.fileId !== fileId));
    await deleteAdminImageFromImageKit(fileId);
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
      await loadQueue(statusFilter);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not seed review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Moderation &amp; Social Proof
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Reviews &amp; Approval Queue
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowSeedForm((s) => !s)}
          className="px-5 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer"
        >
          {showSeedForm ? "Hide Seed Form" : "Seed Review"}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
          {errorMsg}
        </div>
      )}
      {feedback && (
        <div className="p-3 bg-[#1b1717]/5 border border-[#1b1717]/20 text-xs">{feedback}</div>
      )}

      {showSeedForm && (
        <form onSubmit={handleSeed} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4">
          <h2 className="heading-serif text-lg font-normal border-b border-[#1b1717]/15 pb-2">
            Seed Published Product Review
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Product *
              </label>
              <select
                value={form.productSlug}
                onChange={(e) => setForm({ ...form, productSlug: e.target.value })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
              >
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Reviewer Name *
              </label>
              <input
                type="text"
                required
                value={form.reviewerName}
                onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Star Rating *
              </label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} Stars
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Custom Review Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={form.createdAt}
                onChange={(e) => setForm({ ...form, createdAt: e.target.value })}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
              Review Title *
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
              Review Comment *
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {images.map((img) => (
              <div key={img.fileId} className="relative w-14 h-18 border border-[#1b1717]/20">
                <img src={ikUrl(img.url, { width: 160 })} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveSeedImage(img.fileId)}
                  className="absolute top-0 right-0 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] p-0.5 cursor-pointer"
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
              className="px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
            >
              {saving ? "Seeding..." : "Publish Seeded Review"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[#1b1717]/15 pb-3">
        {[
          { id: "PENDING", label: `Pending Approval (${counts.pending})` },
          { id: "PUBLISHED", label: `Published (${counts.published})` },
          { id: "HIDDEN", label: `Hidden (${counts.hidden})` },
          { id: "ALL", label: "All Reviews" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 text-[10px] uppercase tracking-widest border rounded-[2px] cursor-pointer transition-colors ${
              statusFilter === tab.id
                ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                : "border-[#1b1717]/20 text-[#1b1717]/75 hover:border-[#1b1717]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingQueue ? (
        <p className="text-xs text-[#1b1717]/55">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="border border-[#1b1717]/15 p-8 text-center text-xs text-[#1b1717]/60">
          No reviews in this queue.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="border border-[#1b1717]/15 p-5 bg-[#ffffff] flex flex-col lg:flex-row lg:items-start justify-between gap-5"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
                  <span
                    className={`px-2 py-0.5 font-semibold rounded-[2px] ${
                      rev.status === "PUBLISHED"
                        ? "bg-[#1b1717] text-[#ffffff]"
                        : rev.status === "PENDING"
                        ? "bg-[#5d100a] text-[#ffffff]"
                        : "bg-[#1b1717]/15 text-[#1b1717]"
                    }`}
                  >
                    {rev.status}
                  </span>
                  <span className="font-semibold text-[#5d100a]">{rev.productTitle}</span>
                  <span className="text-[#1b1717]/50">
                    • {new Date(rev.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[#5d100a]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.rating ? "fill-[#5d100a]" : "text-[#1b1717]/20"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs font-semibold text-[#1b1717]">{rev.reviewerName}</span>
                </div>

                <h3 className="heading-serif text-base font-normal">{rev.title}</h3>
                <p className="text-xs font-light leading-relaxed text-[#1b1717]/80">
                  {rev.comment}
                </p>

                {rev.images?.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {rev.images.map((img) => (
                      <img
                        key={img.fileId}
                        src={ikUrl(img.url, { width: 140 })}
                        alt=""
                        className="w-12 h-16 object-cover border border-[#1b1717]/15"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                {rev.status !== "PUBLISHED" && (
                  <button
                    type="button"
                    onClick={() => handleModerate(rev.id, "PUBLISHED")}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[10px] uppercase tracking-widest font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}
                {rev.status !== "HIDDEN" && (
                  <button
                    type="button"
                    onClick={() => handleModerate(rev.id, "HIDDEN")}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-[#1b1717]/25 hover:border-[#1b1717] text-[10px] uppercase tracking-widest cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteReview(rev.id)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-[#5d100a]/30 text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff] text-[10px] uppercase tracking-widest cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}