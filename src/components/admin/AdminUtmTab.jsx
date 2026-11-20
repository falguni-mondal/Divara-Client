"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Copy, Check, Trash2, Link2, ExternalLink } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/data/catalogData";

const SOURCE_PRESETS = ["instagram", "whatsapp", "youtube", "facebook", "email", "influencer", "qr_card"];
const MEDIUM_PRESETS = ["social", "referral", "story", "reel", "cpc", "email", "offline_qr"];
const PATH_PRESETS = [
  { label: "Homepage (/)", path: "/" },
  { label: "Collections (/collections)", path: "/collections" },
  { label: "Sarees (/collections?category=saree)", path: "/collections?category=saree" },
  { label: "Dresses (/collections?category=dress)", path: "/collections?category=dress" },
  { label: "Craftsmanship (/craftsmanship)", path: "/craftsmanship" },
  { label: "Contact (/contact)", path: "/contact" },
];

function cleanSlug(val) {
  return String(val || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

export default function AdminUtmTab() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [form, setForm] = useState({
    label: "",
    targetPath: "/",
    utmSource: "instagram",
    utmMedium: "referral",
    utmCampaign: "",
    utmContent: "",
    referralPerson: "",
  });

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/utm-links");
      setLinks(data.data?.links || []);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const previewUrl = useMemo(() => {
    const base = "https://divara.byfalguni.com";
    const path = form.targetPath.startsWith("/") ? form.targetPath : `/${form.targetPath}`;
    try {
      const url = new URL(`${base}${path}`);
      if (cleanSlug(form.utmSource)) url.searchParams.set("utm_source", cleanSlug(form.utmSource));
      if (cleanSlug(form.utmMedium)) url.searchParams.set("utm_medium", cleanSlug(form.utmMedium));
      if (cleanSlug(form.utmCampaign)) url.searchParams.set("utm_campaign", cleanSlug(form.utmCampaign));
      if (cleanSlug(form.utmContent)) url.searchParams.set("utm_content", cleanSlug(form.utmContent));
      if (cleanSlug(form.referralPerson)) url.searchParams.set("utm_ref", cleanSlug(form.referralPerson));
      return url.toString();
    } catch {
      return base;
    }
  }, [form]);

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/admin/utm-links", form);
      setForm({
        label: "",
        targetPath: "/",
        utmSource: "instagram",
        utmMedium: "referral",
        utmCampaign: "",
        utmContent: "",
        referralPerson: "",
      });
      await loadLinks();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save UTM link."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/utm-links/${id}`);
      await loadLinks();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Campaign & Ambassador Attribution
        </span>
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
          UTM & Personal Referral Generator
        </h1>
      </div>

      {/* Generator Form */}
      <form
        onSubmit={handleCreate}
        className="border border-[#1b1717]/15 p-5 sm:p-6 bg-[#ffffff] space-y-5"
      >
        {error && (
          <div className="p-3 border border-[#5d100a]/30 bg-[#5d100a]/5 text-xs text-[#5d100a]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/65 mb-1.5">
              Link Label / Description *
            </label>
            <input
              type="text"
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g., Festive Silk Drop — Ananya Stylist"
              className="w-full px-3 py-2.5 text-xs border border-[#1b1717]/20 focus:border-[#5d100a] outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/65 mb-1.5">
              Landing Page Path *
            </label>
            <input
              type="text"
              required
              value={form.targetPath}
              onChange={(e) => setForm({ ...form, targetPath: e.target.value })}
              placeholder="/collections or /shop/royal-kanjivaram-saree"
              className="w-full px-3 py-2.5 text-xs border border-[#1b1717]/20 focus:border-[#5d100a] outline-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PATH_PRESETS.map((p) => (
                <button
                  key={p.path}
                  type="button"
                  onClick={() => setForm({ ...form, targetPath: p.path })}
                  className="px-2 py-0.5 text-[10px] border border-[#1b1717]/15 hover:border-[#1b1717] cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/65 mb-1.5">
              utm_source *
            </label>
            <input
              type="text"
              required
              value={form.utmSource}
              onChange={(e) => setForm({ ...form, utmSource: e.target.value })}
              placeholder="instagram"
              className="w-full px-3 py-2 text-xs border border-[#1b1717]/20 focus:border-[#5d100a] outline-none"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {SOURCE_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, utmSource: s })}
                  className="px-1.5 py-0.5 text-[9px] uppercase border border-[#1b1717]/15 hover:border-[#5d100a] cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/65 mb-1.5">
              utm_medium *
            </label>
            <input
              type="text"
              required
              value={form.utmMedium}
              onChange={(e) => setForm({ ...form, utmMedium: e.target.value })}
              placeholder="referral"
              className="w-full px-3 py-2 text-xs border border-[#1b1717]/20 focus:border-[#5d100a] outline-none"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {MEDIUM_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, utmMedium: m })}
                  className="px-1.5 py-0.5 text-[9px] uppercase border border-[#1b1717]/15 hover:border-[#5d100a] cursor-pointer"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/65 mb-1.5">
              utm_campaign
            </label>
            <input
              type="text"
              value={form.utmCampaign}
              onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })}
              placeholder="winter-edit-2026"
              className="w-full px-3 py-2 text-xs border border-[#1b1717]/20 focus:border-[#5d100a] outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#5d100a] font-semibold mb-1.5">
              Referral Person (utm_ref)
            </label>
            <input
              type="text"
              value={form.referralPerson}
              onChange={(e) => setForm({ ...form, referralPerson: e.target.value })}
              placeholder="e.g., ananya-roy"
              className="w-full px-3 py-2 text-xs border border-[#5d100a]/40 focus:border-[#5d100a] outline-none"
            />
            <span className="block text-[10px] text-[#1b1717]/50 mt-1">
              Tracks visits & sales for a specific person
            </span>
          </div>
        </div>

        {/* Live Generated URL Preview */}
        <div className="p-3.5 bg-[#1b1717]/[0.03] border border-[#1b1717]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[9px] uppercase tracking-[0.2em] text-[#1b1717]/50 mb-1">
              Generated Standardized URL
            </span>
            <p className="text-xs font-mono text-[#1b1717] break-all">{previewUrl}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy(previewUrl, "preview")}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#1b1717] text-[10px] uppercase tracking-widest hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
            >
              {copiedId === "preview" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === "preview" ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5d100a] hover:bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Link"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Saved UTM & Referral Links Performance Table */}
      <div className="border border-[#1b1717]/15 p-5 bg-[#ffffff]">
        <h2 className="heading-serif text-lg font-normal mb-4">
          Saved Campaign & Referral Links ({links.length})
        </h2>

        {loading ? (
          <p className="text-xs text-[#1b1717]/55">Loading links...</p>
        ) : links.length === 0 ? (
          <p className="text-xs text-[#1b1717]/55">
            No saved UTM links yet. Create your first campaign or personal referral link above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#1b1717]/15 text-[10px] uppercase tracking-wider text-[#1b1717]/55">
                <tr>
                  <th className="py-2.5 pr-3">Campaign / Label</th>
                  <th className="py-2.5 px-2">Source / Medium</th>
                  <th className="py-2.5 px-2">Referral Person</th>
                  <th className="py-2.5 px-2">Visits</th>
                  <th className="py-2.5 px-2">Orders</th>
                  <th className="py-2.5 px-2">Revenue</th>
                  <th className="py-2.5 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1717]/10">
                {links.map((link) => (
                  <tr key={link._id}>
                    <td className="py-3 pr-3 max-w-[240px]">
                      <p className="font-medium text-[#1b1717] truncate">{link.label}</p>
                      <p className="text-[10px] text-[#1b1717]/50 font-mono truncate">
                        {link.fullUrl}
                      </p>
                    </td>
                    <td className="py-3 px-2 uppercase text-[10px]">
                      {link.utmSource} / {link.utmMedium}
                    </td>
                    <td className="py-3 px-2 font-medium text-[#5d100a]">
                      {link.referralPerson || "—"}
                    </td>
                    <td className="py-3 px-2">
                      {link.stats?.visits || 0}{" "}
                      <span className="text-[10px] text-[#1b1717]/50">
                        ({link.stats?.uniqueVisitors || 0} uniq)
                      </span>
                    </td>
                    <td className="py-3 px-2">{link.stats?.orders || 0}</td>
                    <td className="py-3 px-2 font-medium">
                      {formatINR(link.stats?.revenueInr || 0)}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(link.fullUrl, link._id)}
                          title="Copy URL"
                          className="p-1.5 border border-[#1b1717]/20 hover:border-[#1b1717] cursor-pointer"
                        >
                          {copiedId === link._id ? (
                            <Check className="w-3.5 h-3.5 text-[#5d100a]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={link.fullUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Link"
                          className="p-1.5 border border-[#1b1717]/20 hover:border-[#1b1717]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(link._id)}
                          title="Delete Link"
                          className="p-1.5 border border-[#5d100a]/30 text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}