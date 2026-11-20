"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Star, Upload, X, Trash2, CheckCircle2, CornerDownRight } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { uploadReviewImageToImageKit, ikUrl } from "@/lib/imagekit";
import { useShop } from "@/context/ShopContext";

function ReviewReplyNode({
  reply,
  allReplies,
  reviewId,
  user,
  activeReplyBox,
  setActiveReplyBox,
  replyText,
  setReplyText,
  onPostReply,
  onDeleteReply,
  postingReply,
  depth = 0,
}) {
  const children = allReplies.filter((r) => r.parentReplyId === reply.id);
  const isAdmin = reply.authorRole === "admin";
  const isReplyingHere =
    activeReplyBox?.reviewId === reviewId &&
    activeReplyBox?.parentReplyId === reply.id;

  return (
    <div className={`mt-3 ${depth > 0 ? "ml-4 sm:ml-7 pl-3.5 border-l border-[#1b1717]/15" : "pl-4 border-l-2 border-[#1b1717]/15"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-[#1b1717]">{reply.authorName}</span>
          {isAdmin && (
            <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-widest bg-[#5d100a] text-[#ffffff]">
              DIVARA Atelier
            </span>
          )}
          <span className="text-[#1b1717]/50">
            • {new Date(reply.createdAt).toLocaleDateString("en-IN")}
          </span>
        </div>

        {user && (reply.userId === user.id || user.role === "admin") && (
          <button
            type="button"
            onClick={() => onDeleteReply(reviewId, reply.id)}
            aria-label="Delete reply"
            className="text-[#1b1717]/40 hover:text-[#5d100a] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="mt-1 text-xs font-light leading-relaxed text-[#1b1717]/80">
        {reply.comment}
      </p>

      {user && (
        <button
          type="button"
          onClick={() =>
            setActiveReplyBox(
              isReplyingHere ? null : { reviewId, parentReplyId: reply.id }
            )
          }
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-semibold text-[#1b1717]/60 hover:text-[#5d100a] cursor-pointer"
        >
          <CornerDownRight className="w-3 h-3" />
          <span>{isReplyingHere ? "Cancel" : "Reply"}</span>
        </button>
      )}

      {isReplyingHere && (
        <form
          onSubmit={(e) => onPostReply(e, reviewId, reply.id)}
          className="mt-2.5 flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            required
            minLength={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to ${reply.authorName}...`}
            className="flex-1 border border-[#1b1717]/25 px-3 py-1.5 text-xs outline-none focus:border-[#5d100a]"
          />
          <button
            type="submit"
            disabled={postingReply}
            className="px-4 py-1.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[10px] uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            {postingReply ? "..." : "Post"}
          </button>
        </form>
      )}

      {children.map((child) => (
        <ReviewReplyNode
          key={child.id}
          reply={child}
          allReplies={allReplies}
          reviewId={reviewId}
          user={user}
          activeReplyBox={activeReplyBox}
          setActiveReplyBox={setActiveReplyBox}
          replyText={replyText}
          setReplyText={setReplyText}
          onPostReply={onPostReply}
          onDeleteReply={onDeleteReply}
          postingReply={postingReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function ProductReviews({ productSlug }) {
  const { user } = useShop();
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!productSlug) return;
    try {
      const { data } = await api.get(`/reviews/${productSlug}`);
      if (data.data?.summary) setSummary(data.data.summary);
      setReviews(data.data?.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productSlug]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const remainingSlots = 3 - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg("Maximum 3 images allowed per review.");
      return;
    }

    const toUpload = files.slice(0, remainingSlots);
    setErrorMsg("");
    setUploading(true);

    try {
      const uploaded = [];
      for (const file of toUpload) {
        const res = await uploadReviewImageToImageKit(file);
        uploaded.push(res);
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, 3));
    } catch (err) {
      setErrorMsg(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      await api.post(`/reviews/${productSlug}`, {
        rating,
        title: title.trim(),
        comment: comment.trim(),
        images,
      });
      setTitle("");
      setComment("");
      setRating(5);
      setImages([]);
      setSuccessMsg("Your review has been published.");
      await fetchReviews();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Unable to publish review."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await api.delete(`/reviews/item/${reviewId}`);
      await fetchReviews();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Unable to delete review."));
    }
  };

  const handlePostReply = async (e, reviewId, parentReplyId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setPostingReply(true);
    try {
      await api.post(`/reviews/${reviewId}/replies`, {
        comment: replyText.trim(),
        parentReplyId,
      });
      setReplyText("");
      setActiveReplyBox(null);
      await fetchReviews();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Unable to post reply."));
    } finally {
      setPostingReply(false);
    }
  };

  const handleDeleteReply = async (reviewId, replyId) => {
    try {
      await api.delete(`/reviews/${reviewId}/replies/${replyId}`);
      await fetchReviews();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Unable to delete reply."));
    }
  };

  return (
    <section className="mt-20 border-t border-[#1b1717]/15 pt-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        <div className="lg:col-span-4">
          <span className="text-[11px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Client Impressions
          </span>
          <h2 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Ratings &amp; Reviews
          </h2>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="heading-serif text-4xl font-normal">
              {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "—"}
            </span>
            <div>
              <div className="flex items-center gap-0.5 text-[#5d100a]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(summary.averageRating)
                        ? "fill-[#5d100a] text-[#5d100a]"
                        : "text-[#1b1717]/25"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-[#1b1717]/60 mt-0.5">
                Based on {summary.totalReviews}{" "}
                {summary.totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.breakdown?.[star] || 0;
              const pct =
                summary.totalReviews > 0
                  ? Math.round((count / summary.totalReviews) * 100)
                  : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-6 text-[#1b1717]/75">{star}★</span>
                  <div className="flex-1 h-1.5 bg-[#1b1717]/10 overflow-hidden">
                    <div
                      className="h-full bg-[#5d100a] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-[11px] text-[#1b1717]/55">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-10">
          <div className="border border-[#1b1717]/15 p-6 sm:p-8 bg-[#ffffff]">
            <h3 className="heading-serif text-lg sm:text-xl font-normal mb-4">
              Write a Review
            </h3>

            {!user ? (
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-[#1b1717]/70">
                  Please sign in to your DIVARA account to rate this garment, upload up to 3 photos, or reply to reviews.
                </p>
                <Link
                  href="/account"
                  className="shrink-0 px-5 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[11px] uppercase tracking-widest font-semibold transition-colors text-center"
                >
                  Sign In to Review
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-[#1b1717]/5 border border-[#1b1717]/20 text-xs text-[#1b1717]">
                    {successMsg}
                  </div>
                )}

                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-[#1b1717]/65 mb-2">
                    Your Rating *
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 cursor-pointer"
                        aria-label={`Rate ${s} stars`}
                      >
                        <Star
                          className={`w-5 h-5 transition-colors ${
                            s <= (hoverRating || rating)
                              ? "fill-[#5d100a] text-[#5d100a]"
                              : "text-[#1b1717]/25"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#1b1717]/65 mb-1.5">
                    Review Title *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={140}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Exquisite weave and drape"
                    className="w-full border border-[#1b1717]/25 px-3.5 py-2.5 text-xs outline-none focus:border-[#5d100a]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#1b1717]/65 mb-1.5">
                    Your Experience *
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={10}
                    maxLength={2000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share details on fabric quality, fit, and craftsmanship..."
                    className="w-full border border-[#1b1717]/25 px-3.5 py-2.5 text-xs outline-none focus:border-[#5d100a] resize-none"
                  />
                </div>

                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-[#1b1717]/65 mb-2">
                    Photos ({images.length}/3 — Optional)
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    {images.map((img) => (
                      <div
                        key={img.fileId}
                        className="relative w-16 h-20 border border-[#1b1717]/20 overflow-hidden"
                      >
                        <img
                          src={ikUrl(img.url, { width: 200 })}
                          alt="Uploaded review"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((i) => i.fileId !== img.fileId))}
                          aria-label="Remove image"
                          className="absolute top-0.5 right-0.5 bg-[#1b1717]/80 text-[#ffffff] p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {images.length < 3 && (
                      <label className="w-16 h-20 border border-dashed border-[#1b1717]/35 hover:border-[#5d100a] flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-[#1b1717]/65 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploading ? "..." : "Add"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploading}
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="px-7 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Publish Review"}
                </button>
              </form>
            )}
          </div>

          {loading ? (
            <p className="text-xs text-[#1b1717]/55">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-[#1b1717]/60">
              No reviews yet for this garment. Be the first to share your impressions.
            </p>
          ) : (
            <div className="divide-y divide-[#1b1717]/15 border-t border-[#1b1717]/15">
              {reviews.map((rev) => {
                const topReplies = (rev.replies || []).filter((r) => !r.parentReplyId);
                const isReplyingTop =
                  activeReplyBox?.reviewId === rev.id &&
                  activeReplyBox?.parentReplyId === null;

                return (
                  <article key={rev.id} className="py-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-[#5d100a]">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating
                                  ? "fill-[#5d100a] text-[#5d100a]"
                                  : "text-[#1b1717]/20"
                              }`}
                            />
                          ))}
                        </div>
                        <h4 className="heading-serif text-base font-normal mt-1.5">
                          {rev.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#1b1717]/60">
                          <span className="font-medium text-[#1b1717]">
                            {rev.reviewerName}
                          </span>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 text-[#5d100a] font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                            </span>
                          )}
                          <span>
                            • {new Date(rev.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {user && rev.userId === user.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          aria-label="Delete your review"
                          className="text-[#1b1717]/45 hover:text-[#5d100a] p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="mt-3 text-xs sm:text-sm font-light leading-relaxed text-[#1b1717]/80">
                      {rev.comment}
                    </p>

                    {rev.images?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {rev.images.map((img) => (
                          <button
                            key={img.fileId}
                            type="button"
                            onClick={() => setLightboxUrl(img.url)}
                            className="w-16 h-20 overflow-hidden border border-[#1b1717]/15 cursor-pointer hover:opacity-85 transition-opacity"
                          >
                            <img
                              src={ikUrl(img.url, { width: 220 })}
                              alt="Customer review"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Top-Level Reply Trigger */}
                    {user && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReplyBox(
                              isReplyingTop ? null : { reviewId: rev.id, parentReplyId: null }
                            )
                          }
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#1b1717]/65 hover:text-[#5d100a] cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>{isReplyingTop ? "Cancel" : "Reply"}</span>
                        </button>
                      </div>
                    )}

                    {isReplyingTop && (
                      <form
                        onSubmit={(e) => handlePostReply(e, rev.id, null)}
                        className="mt-3 flex flex-col sm:flex-row gap-2"
                      >
                        <input
                          type="text"
                          required
                          minLength={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${rev.reviewerName}...`}
                          className="flex-1 border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
                        />
                        <button
                          type="submit"
                          disabled={postingReply}
                          className="px-4 py-2 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[10px] uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {postingReply ? "..." : "Post"}
                        </button>
                      </form>
                    )}

                    {/* Recursive Nested Replies */}
                    {topReplies.length > 0 && (
                      <div className="mt-4">
                        {topReplies.map((reply) => (
                          <ReviewReplyNode
                            key={reply.id}
                            reply={reply}
                            allReplies={rev.replies || []}
                            reviewId={rev.id}
                            user={user}
                            activeReplyBox={activeReplyBox}
                            setActiveReplyBox={setActiveReplyBox}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            onPostReply={handlePostReply}
                            onDeleteReply={handleDeleteReply}
                            postingReply={postingReply}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4"
        >
          <img
            src={ikUrl(lightboxUrl, { width: 1200 })}
            alt="Review photo full size"
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
    </section>
  );
}