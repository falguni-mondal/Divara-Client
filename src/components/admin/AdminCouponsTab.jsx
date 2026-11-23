"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";

function toLocalDateTimeInput(isoOrDate) {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function makeEmptyCouponForm(startsAt = "") {
  return {
    code: "",
    name: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    maxDiscountInr: "",
    applyMode: "MANUAL",
    startsAt,
    endsAt: "",
    maxTotalUses: "",
    maxUsesPerUser: "1",
    applicableTo: "ALL",
    eligibleEmailsCsv: "",
    minOrderSubtotal: 0,
    firstOrderOnly: false,
    isActive: true,
  };
}

export default function AdminCouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(() => makeEmptyCouponForm(""));
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    setForm((prev) =>
      prev.startsAt ? prev : { ...prev, startsAt: toLocalDateTimeInput(new Date()) }
    );
  }, []);

  const loadCoupons = useCallback(async () => {
    const { data } = await api.get("/coupons/admin");
    setCoupons(data.data?.coupons || []);
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const startEditing = (c) => {
    setErrorMsg("");
    setSuccessMsg("");
    setEditingCoupon(c);
    setForm({
      code: c.code || "",
      name: c.name || "",
      description: c.description || "",
      discountType: c.discountType || "PERCENTAGE",
      discountValue: c.discountValue ?? 10,
      maxDiscountInr: c.maxDiscountInr ?? "",
      applyMode: c.applyMode || "MANUAL",
      startsAt: toLocalDateTimeInput(c.startsAt || new Date()),
      endsAt: toLocalDateTimeInput(c.endsAt),
      maxTotalUses: c.maxTotalUses ?? "",
      maxUsesPerUser: c.maxUsesPerUser ?? "",
      applicableTo: c.applicableTo || "ALL",
      eligibleEmailsCsv: Array.isArray(c.eligibleEmails)
        ? c.eligibleEmails.join(", ")
        : "",
      minOrderSubtotal: c.minOrderSubtotal ?? 0,
      firstOrderOnly: Boolean(c.firstOrderOnly),
      isActive: c.isActive !== false,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEditing = () => {
    setEditingCoupon(null);
    setErrorMsg("");
    setForm(makeEmptyCouponForm(toLocalDateTimeInput(new Date())));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);
    try {
      const eligibleEmails = form.eligibleEmailsCsv
        .split(",")
        .map((em) => em.trim().toLowerCase())
        .filter(Boolean);

      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountInr: form.maxDiscountInr !== "" ? Number(form.maxDiscountInr) : null,
        applyMode: form.applyMode,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        maxTotalUses: form.maxTotalUses !== "" ? Number(form.maxTotalUses) : null,
        maxUsesPerUser: form.maxUsesPerUser !== "" ? Number(form.maxUsesPerUser) : null,
        applicableTo: form.applicableTo,
        eligibleEmails,
        minOrderSubtotal: Number(form.minOrderSubtotal) || 0,
        firstOrderOnly: form.firstOrderOnly,
        isActive: form.isActive,
      };

      if (editingCoupon?._id) {
        await api.patch(`/coupons/admin/${editingCoupon._id}`, payload);
        setSuccessMsg(`Coupon ${payload.code} updated.`);
        setEditingCoupon(null);
      } else {
        await api.post("/coupons/admin", payload);
        setSuccessMsg(`Coupon ${payload.code} created.`);
      }

      setForm(makeEmptyCouponForm(toLocalDateTimeInput(new Date())));
      await loadCoupons();
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(
          err,
          editingCoupon ? "Failed to update coupon." : "Failed to create coupon."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this coupon permanently?")) return;
    await api.delete(`/coupons/admin/${id}`);
    if (editingCoupon?._id === id) cancelEditing();
    await loadCoupons();
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Promotions &amp; Member Offers
        </span>
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
          Coupons &amp; Discounts
        </h1>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold">
            {editingCoupon ? (
              <>
                <Pencil className="w-4 h-4 text-[#5d100a]" />
                <span>Editing Coupon: {editingCoupon.code}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-[#5d100a]" />
                <span>Create Coupon</span>
              </>
            )}
          </div>

          {editingCoupon && (
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center gap-1 px-3 py-1 text-[10px] uppercase tracking-widest border border-[#1b1717]/25 hover:border-[#1b1717] cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        {editingCoupon && editingCoupon.usedCount > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
            This coupon has already been redeemed{" "}
            <strong>{editingCoupon.usedCount}</strong> time
            {editingCoupon.usedCount === 1 ? "" : "s"}. Your changes will apply
            immediately to all upcoming checkouts without affecting past orders.
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            required
            placeholder="CODE * (e.g. ROYAL15)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs uppercase"
          />
          <input
            type="text"
            required
            placeholder="NAME * (AUTO CAPITALIZED)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs uppercase"
          />
          <select
            value={form.applyMode}
            onChange={(e) => setForm({ ...form, applyMode: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
          >
            <option value="MANUAL">Manual Code Entry</option>
            <option value="AUTO">Auto-Apply Best Offer</option>
          </select>
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs bg-[#ffffff]"
          >
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed Rate (₹ INR)</option>
          </select>
          <input
            type="number"
            required
            min={1}
            placeholder="Discount Value *"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs"
          />
          <input
            type="number"
            min={1}
            placeholder="Max Discount Cap ₹ (optional)"
            value={form.maxDiscountInr}
            onChange={(e) => setForm({ ...form, maxDiscountInr: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs"
          />
          <div>
            <label className="block text-[10px] uppercase text-[#1b1717]/55 mb-1">
              Start Date/Time
            </label>
            <input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full border border-[#1b1717]/25 px-3 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#1b1717]/55 mb-1">
              End Date/Time (optional)
            </label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="w-full border border-[#1b1717]/25 px-3 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#1b1717]/55 mb-1">
              Min Order Subtotal (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.minOrderSubtotal}
              onChange={(e) => setForm({ ...form, minOrderSubtotal: e.target.value })}
              className="w-full border border-[#1b1717]/25 px-3 py-1.5 text-xs"
            />
          </div>
          <input
            type="number"
            min={1}
            placeholder="Global Max Uses (blank = infinite)"
            value={form.maxTotalUses}
            onChange={(e) => setForm({ ...form, maxTotalUses: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs"
          />
          <input
            type="number"
            min={1}
            placeholder="Max Uses Per User (blank = infinite)"
            value={form.maxUsesPerUser}
            onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs"
          />
          <input
            type="text"
            placeholder="Specific User Emails CSV (blank = all)"
            value={form.eligibleEmailsCsv}
            onChange={(e) => setForm({ ...form, eligibleEmailsCsv: e.target.value })}
            className="border border-[#1b1717]/25 px-3 py-2 text-xs"
          />
        </div>

        <input
          type="text"
          placeholder="Description (shown to client)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
        />

        <div className="flex flex-wrap items-center gap-6">
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={form.firstOrderOnly}
              onChange={(e) => setForm({ ...form, firstOrderOnly: e.target.checked })}
            />
            <span>First Order Only</span>
          </label>

          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <span>Coupon Active</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving
              ? editingCoupon
                ? "Updating..."
                : "Creating..."
              : editingCoupon
              ? "Update Coupon"
              : "Create Coupon"}
          </button>
          {editingCoupon && (
            <button
              type="button"
              onClick={cancelEditing}
              className="px-5 py-2.5 border border-[#1b1717]/25 text-xs uppercase tracking-widest hover:border-[#1b1717] cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="border border-[#1b1717]/15 overflow-x-auto bg-[#ffffff]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4">Code &amp; Name</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Mode</th>
              <th className="py-3 px-4">Usage</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {coupons.map((c) => (
              <tr
                key={c._id}
                className={editingCoupon?._id === c._id ? "bg-[#5d100a]/[0.04]" : ""}
              >
                <td className="py-3 px-4">
                  <div className="font-semibold text-[#5d100a]">{c.code}</div>
                  <div className="text-[11px]">{c.name}</div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${
                      c.isActive !== false
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-[#1b1717]/10 text-[#1b1717]/60"
                    }`}
                  >
                    {c.isActive !== false ? "Active" : "Paused"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {c.discountType === "PERCENTAGE"
                    ? `${c.discountValue}%`
                    : `₹${c.discountValue}`}
                </td>
                <td className="py-3 px-4 uppercase text-[10px]">{c.applyMode}</td>
                <td className="py-3 px-4">
                  {c.usedCount} / {c.maxTotalUses ?? "∞"} (per user:{" "}
                  {c.maxUsesPerUser ?? "∞"})
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEditing(c)}
                      title="Edit Coupon"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#1b1717]/25 hover:border-[#1b1717] text-[10px] uppercase tracking-widest cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c._id)}
                      title="Delete Coupon"
                      className="p-1.5 text-[#5d100a] hover:bg-[#5d100a]/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}