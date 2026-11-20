"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";

const INITIAL_COUPON = {
  code: "",
  name: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: 10,
  maxDiscountInr: "",
  applyMode: "MANUAL",
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: "",
  maxTotalUses: "",
  maxUsesPerUser: "1",
  applicableTo: "ALL",
  eligibleEmailsCsv: "",
  minOrderSubtotal: 0,
  firstOrderOnly: false,
};

export default function AdminCouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(INITIAL_COUPON);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCoupons = useCallback(async () => {
    const { data } = await api.get("/coupons/admin");
    setCoupons(data.data?.coupons || []);
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      const eligibleEmails = form.eligibleEmailsCsv
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      await api.post("/coupons/admin", {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountInr: form.maxDiscountInr ? Number(form.maxDiscountInr) : null,
        applyMode: form.applyMode,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        maxTotalUses: form.maxTotalUses ? Number(form.maxTotalUses) : null,
        maxUsesPerUser: form.maxUsesPerUser ? Number(form.maxUsesPerUser) : null,
        applicableTo: form.applicableTo,
        eligibleEmails,
        minOrderSubtotal: Number(form.minOrderSubtotal) || 0,
        firstOrderOnly: form.firstOrderOnly,
      });

      setForm(INITIAL_COUPON);
      await loadCoupons();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Failed to create coupon."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/coupons/admin/${id}`);
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

      <form onSubmit={handleCreate} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold">
          <Plus className="w-4 h-4 text-[#5d100a]" />
          <span>Create Coupon</span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
            {errorMsg}
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
            <label className="block text-[10px] uppercase text-[#1b1717]/55 mb-1">Start Date/Time</label>
            <input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full border border-[#1b1717]/25 px-3 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#1b1717]/55 mb-1">End Date/Time (optional)</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="w-full border border-[#1b1717]/25 px-3 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#1b1717]/55 mb-1">Min Order Subtotal (₹)</label>
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

        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={form.firstOrderOnly}
            onChange={(e) => setForm({ ...form, firstOrderOnly: e.target.checked })}
          />
          <span>First Order Only</span>
        </label>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Coupon"}
          </button>
        </div>
      </form>

      <div className="border border-[#1b1717]/15 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4">Code &amp; Name</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Mode</th>
              <th className="py-3 px-4">Usage</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {coupons.map((c) => (
              <tr key={c._id}>
                <td className="py-3 px-4">
                  <div className="font-semibold text-[#5d100a]">{c.code}</div>
                  <div className="text-[11px]">{c.name}</div>
                </td>
                <td className="py-3 px-4">
                  {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                </td>
                <td className="py-3 px-4 uppercase text-[10px]">{c.applyMode}</td>
                <td className="py-3 px-4">
                  {c.usedCount} / {c.maxTotalUses ?? "∞"} (per user: {c.maxUsesPerUser ?? "∞"})
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(c._id)}
                    className="p-1.5 text-[#5d100a] hover:bg-[#5d100a]/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}