"use client";

import React, { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";

const POLICY_SLUGS = ["privacy-policy", "shipping-returns", "terms-of-service"];

export default function AdminCmsTab() {
  const [selectedSlug, setSelectedSlug] = useState("privacy-policy");
  const [policy, setPolicy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setFeedback("");
    api
      .get(`/policies/${selectedSlug}`)
      .then(({ data }) => setPolicy(data.data?.policy || null))
      .catch(() => setPolicy(null));
  }, [selectedSlug]);

  const updateSection = (idx, field, value) => {
    setPolicy((prev) => {
      const nextSections = [...(prev.sections || [])];
      nextSections[idx] = { ...nextSections[idx], [field]: value };
      return { ...prev, sections: nextSections };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      await api.patch(`/admin/policies/${selectedSlug}`, {
        title: policy.title,
        summary: policy.summary,
        effectiveDate: policy.effectiveDate,
        sections: policy.sections,
      });
      setFeedback("Policy saved and published live.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Save failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Editorial &amp; Legal CMS
        </span>
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
          Policy Pages Editor
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {POLICY_SLUGS.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setSelectedSlug(slug)}
            className={`px-4 py-2 text-[11px] uppercase tracking-widest border cursor-pointer ${
              selectedSlug === slug
                ? "bg-[#1b1717] text-[#ffffff] border-[#1b1717]"
                : "border-[#1b1717]/20 hover:border-[#5d100a]"
            }`}
          >
            {slug.replace("-", " ")}
          </button>
        ))}
      </div>

      {policy && (
        <form onSubmit={handleSave} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4">
          {feedback && (
            <div className="p-3 bg-[#1b1717]/5 border border-[#1b1717]/20 text-xs">{feedback}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={policy.title || ""}
              onChange={(e) => setPolicy({ ...policy, title: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs font-medium"
            />
            <input
              type="text"
              value={policy.effectiveDate || ""}
              onChange={(e) => setPolicy({ ...policy, effectiveDate: e.target.value })}
              className="border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
          </div>

          <textarea
            rows={2}
            value={policy.summary || ""}
            onChange={(e) => setPolicy({ ...policy, summary: e.target.value })}
            className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
          />

          <div className="space-y-4 pt-2">
            {(policy.sections || []).map((sec, idx) => (
              <div key={idx} className="border border-[#1b1717]/15 p-4 space-y-2">
                <input
                  type="text"
                  value={sec.heading}
                  onChange={(e) => updateSection(idx, "heading", e.target.value)}
                  className="w-full border border-[#1b1717]/20 px-3 py-1.5 text-xs font-semibold"
                />
                <textarea
                  rows={3}
                  value={sec.body}
                  onChange={(e) => updateSection(idx, "body", e.target.value)}
                  className="w-full border border-[#1b1717]/20 px-3 py-1.5 text-xs"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Policy"}
          </button>
        </form>
      )}
    </div>
  );
}