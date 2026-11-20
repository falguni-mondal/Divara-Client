"use client";

import React, { useEffect, useState } from "react";
import { Upload, Plus, Trash2, Save } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import {
  uploadAdminImageToImageKit,
  deleteAdminImageFromImageKit,
  ikUrl,
} from "@/lib/imagekit";

const CMS_SECTIONS = [
  { id: "homepage", label: "Homepage & Search" },
  { id: "craftsmanship", label: "About / Craftsmanship" },
  { id: "contact", label: "Contact & FAQs" },
  { id: "policies", label: "Legal Policies" },
];

const POLICY_SLUGS = [
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "shipping-returns", label: "Shipping & Returns" },
  { slug: "terms-of-service", label: "Terms of Service" },
];

const DEFAULT_SITE_CONTENT = {
  hero: {
    desktopImage: { url: "/bg/hero.webp", fileId: null },
    mobileImage: { url: "/bg/hero_mobile_2.webp", fileId: null },
    ctaLabel: "SHOP NOW",
    scrollPrompt: "Scroll to Discover More",
  },
  collectionBanner: {
    desktopImage: { url: "/bg/collection.webp", fileId: null },
    mobileImage: { url: "/bg/collection_mobile.webp", fileId: null },
    ctaLabel: "SHOP NOW",
  },
  philosophy: {
    eyebrow: "featuring",
    heading: "THE DIVARA CRAFTSMANSHIP",
    paragraphs: [],
    video: { url: "/videos/models.mp4", fileId: null },
    ctaLabel: "READ OUR STORY",
  },
  luxuryPillars: [],
  contact: {
    bannerImage: { url: "/bg/contact_bg.webp", fileId: null },
    email: "support@divara.byfalguni.com",
    phone: "+91 (033) 2284-9100",
    supportHours: "Monday – Saturday, 10:00 AM to 8:00 PM IST",
    locations: ["Kolkata", "Mumbai", "New Delhi"],
    faqs: [],
  },
  trendingSearches: ["Kanjivaram", "Sarees", "Dresses", "Winter", "Silk", "Velvet", "Chanderi", "Denim"],
};

export default function AdminCmsTab() {
  const [activeSection, setActiveSection] = useState("homepage");
  const [siteContent, setSiteContent] = useState(null);
  const [loadingCms, setLoadingCms] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState("privacy-policy");
  const [policy, setPolicy] = useState(null);

  const [uploadingField, setUploadingField] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setLoadingCms(true);
    api
      .get("/cms/site-content")
      .then(({ data }) => {
        setSiteContent(data.data || DEFAULT_SITE_CONTENT);
      })
      .catch(() => {
        setSiteContent(DEFAULT_SITE_CONTENT);
      })
      .finally(() => setLoadingCms(false));
  }, []);

  useEffect(() => {
    if (activeSection !== "policies") return;
    setFeedback("");
    api
      .get(`/policies/${selectedSlug}`)
      .then(({ data }) => setPolicy(data.data?.policy || null))
      .catch(() => setPolicy(null));
  }, [activeSection, selectedSlug]);

  const handleImageUpload = async (file, previousFileId, onUploaded, fieldKey) => {
    if (!file) return;
    setUploadingField(fieldKey);
    setErrorMsg("");
    try {
      const uploaded = await uploadAdminImageToImageKit(file, "/divara/cms");
      if (previousFileId) {
        await deleteAdminImageFromImageKit(previousFileId);
      }
      onUploaded(uploaded);
    } catch (err) {
      setErrorMsg(err.message || "ImageKit upload failed.");
    } finally {
      setUploadingField("");
    }
  };

  const handleSaveSiteContent = async (e) => {
    e.preventDefault();
    if (!siteContent) return;
    setSaving(true);
    setFeedback("");
    setErrorMsg("");
    try {
      const { _id, __v, createdAt, updatedAt, key, ...cleanPayload } = siteContent;
      await api.put("/admin/cms/site-content", cleanPayload);
      setFeedback("Storefront CMS saved and published live.");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not save CMS content."));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (!policy) return;
    setSaving(true);
    setFeedback("");
    setErrorMsg("");
    try {
      await api.put(`/admin/policies/${selectedSlug}`, {
        title: policy.title,
        summary: policy.summary,
        effectiveDate: policy.effectiveDate,
        sections: policy.sections,
      });
      setFeedback(`Saved "${policy.title}" live.`);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Policy save failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Multi-Page Storefront Studio
        </span>
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
          Smart Content Management (CMS)
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#1b1717]/15 pb-3">
        {CMS_SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => {
              setActiveSection(sec.id);
              setFeedback("");
              setErrorMsg("");
            }}
            className={`px-4 py-2 text-[11px] uppercase tracking-widest border rounded-[2px] cursor-pointer transition-colors ${
              activeSection === sec.id
                ? "bg-[#1b1717] text-[#ffffff] border-[#1b1717]"
                : "border-[#1b1717]/20 hover:border-[#5d100a]"
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
          {errorMsg}
        </div>
      )}
      {feedback && (
        <div className="p-3 bg-[#1b1717]/5 border border-[#1b1717]/20 text-xs">{feedback}</div>
      )}

      {loadingCms && activeSection !== "policies" && (
        <p className="text-xs text-[#1b1717]/55">Loading storefront CMS content...</p>
      )}

      {/* 1. Homepage & Search CMS */}
      {!loadingCms && activeSection === "homepage" && siteContent && (
        <form onSubmit={handleSaveSiteContent} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Hero CTA Button Label
              </label>
              <input
                type="text"
                value={siteContent.hero?.ctaLabel || ""}
                onChange={(e) =>
                  setSiteContent({ ...siteContent, hero: { ...siteContent.hero, ctaLabel: e.target.value } })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Hero Scroll Prompt
              </label>
              <input
                type="text"
                value={siteContent.hero?.scrollPrompt || ""}
                onChange={(e) =>
                  setSiteContent({ ...siteContent, hero: { ...siteContent.hero, scrollPrompt: e.target.value } })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Hero Desktop Image
              </label>
              <div className="flex items-center gap-3">
                {siteContent.hero?.desktopImage?.url && (
                  <img
                    src={ikUrl(siteContent.hero.desktopImage.url, { width: 180 })}
                    alt="Hero desktop"
                    className="w-20 h-12 object-cover border border-[#1b1717]/20"
                  />
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#1b1717]/35 text-[11px] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingField === "heroDesktop" ? "Uploading..." : "Swap Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(
                        e.target.files?.[0],
                        siteContent.hero?.desktopImage?.fileId,
                        (media) =>
                          setSiteContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, desktopImage: media },
                          })),
                        "heroDesktop"
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Hero Mobile Image
              </label>
              <div className="flex items-center gap-3">
                {siteContent.hero?.mobileImage?.url && (
                  <img
                    src={ikUrl(siteContent.hero.mobileImage.url, { width: 120 })}
                    alt="Hero mobile"
                    className="w-10 h-14 object-cover border border-[#1b1717]/20"
                  />
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#1b1717]/35 text-[11px] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingField === "heroMobile" ? "Uploading..." : "Swap Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(
                        e.target.files?.[0],
                        siteContent.hero?.mobileImage?.fileId,
                        (media) =>
                          setSiteContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, mobileImage: media },
                          })),
                        "heroMobile"
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
              Trending Search Quick Suggestions (Comma-Separated)
            </label>
            <input
              type="text"
              value={(siteContent.trendingSearches || []).join(", ")}
              onChange={(e) =>
                setSiteContent({
                  ...siteContent,
                  trendingSearches: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={saving || Boolean(uploadingField)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Publish Homepage CMS"}</span>
          </button>
        </form>
      )}

      {/* 2. About / Craftsmanship CMS */}
      {!loadingCms && activeSection === "craftsmanship" && siteContent && (
        <form onSubmit={handleSaveSiteContent} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Philosophy Eyebrow
              </label>
              <input
                type="text"
                value={siteContent.philosophy?.eyebrow || ""}
                onChange={(e) =>
                  setSiteContent({
                    ...siteContent,
                    philosophy: { ...siteContent.philosophy, eyebrow: e.target.value },
                  })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Philosophy Main Heading
              </label>
              <input
                type="text"
                value={siteContent.philosophy?.heading || ""}
                onChange={(e) =>
                  setSiteContent({
                    ...siteContent,
                    philosophy: { ...siteContent.philosophy, heading: e.target.value },
                  })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
              Philosophy Paragraphs (One paragraph per line)
            </label>
            <textarea
              rows={4}
              value={(siteContent.philosophy?.paragraphs || []).join("\n")}
              onChange={(e) =>
                setSiteContent({
                  ...siteContent,
                  philosophy: {
                    ...siteContent.philosophy,
                    paragraphs: e.target.value.split("\n").filter((l) => l.trim()),
                  },
                })
              }
              className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold">
                Luxury Pillars ({(siteContent.luxuryPillars || []).length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setSiteContent({
                    ...siteContent,
                    luxuryPillars: [
                      ...(siteContent.luxuryPillars || []),
                      { heading: "New Pillar", paragraph: "" },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#5d100a] cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Pillar
              </button>
            </div>

            {(siteContent.luxuryPillars || []).map((pillar, idx) => (
              <div key={idx} className="border border-[#1b1717]/15 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={pillar.heading || ""}
                    onChange={(e) => {
                      const next = [...siteContent.luxuryPillars];
                      next[idx] = { ...next[idx], heading: e.target.value };
                      setSiteContent({ ...siteContent, luxuryPillars: next });
                    }}
                    className="flex-1 border border-[#1b1717]/20 px-3 py-1.5 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (pillar.image?.fileId) {
                        await deleteAdminImageFromImageKit(pillar.image.fileId);
                      }
                      setSiteContent({
                        ...siteContent,
                        luxuryPillars: siteContent.luxuryPillars.filter((_, i) => i !== idx),
                      });
                    }}
                    className="p-1.5 text-[#5d100a] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={pillar.paragraph || ""}
                  onChange={(e) => {
                    const next = [...siteContent.luxuryPillars];
                    next[idx] = { ...next[idx], paragraph: e.target.value };
                    setSiteContent({ ...siteContent, luxuryPillars: next });
                  }}
                  className="w-full border border-[#1b1717]/20 px-3 py-1.5 text-xs"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Publish Craftsmanship CMS"}</span>
          </button>
        </form>
      )}

      {/* 3. Contact & FAQs CMS */}
      {!loadingCms && activeSection === "contact" && siteContent && (
        <form onSubmit={handleSaveSiteContent} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Support Email
              </label>
              <input
                type="email"
                value={siteContent.contact?.email || ""}
                onChange={(e) =>
                  setSiteContent({ ...siteContent, contact: { ...siteContent.contact, email: e.target.value } })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Concierge Phone
              </label>
              <input
                type="text"
                value={siteContent.contact?.phone || ""}
                onChange={(e) =>
                  setSiteContent({ ...siteContent, contact: { ...siteContent.contact, phone: e.target.value } })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Atelier Support Hours
              </label>
              <input
                type="text"
                value={siteContent.contact?.supportHours || ""}
                onChange={(e) =>
                  setSiteContent({ ...siteContent, contact: { ...siteContent.contact, supportHours: e.target.value } })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                Boutique Cities (Comma-Separated)
              </label>
              <input
                type="text"
                value={(siteContent.contact?.locations || []).join(", ")}
                onChange={(e) =>
                  setSiteContent({
                    ...siteContent,
                    contact: {
                      ...siteContent.contact,
                      locations: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
              Contact Page Banner Image
            </label>
            <div className="flex items-center gap-3">
              {siteContent.contact?.bannerImage?.url && (
                <img
                  src={ikUrl(siteContent.contact.bannerImage.url, { width: 180 })}
                  alt="Contact banner"
                  className="w-20 h-12 object-cover border border-[#1b1717]/20"
                />
              )}
              <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#1b1717]/35 text-[11px] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingField === "contactBanner" ? "Uploading..." : "Swap Banner"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageUpload(
                      e.target.files?.[0],
                      siteContent.contact?.bannerImage?.fileId,
                      (media) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, bannerImage: media },
                        })),
                      "contactBanner"
                    )
                  }
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold">
                Contact Page FAQs ({(siteContent.contact?.faqs || []).length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setSiteContent({
                    ...siteContent,
                    contact: {
                      ...siteContent.contact,
                      faqs: [...(siteContent.contact?.faqs || []), { question: "", answer: "" }],
                    },
                  })
                }
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#5d100a] cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add FAQ
              </button>
            </div>

            {(siteContent.contact?.faqs || []).map((faq, idx) => (
              <div key={idx} className="border border-[#1b1717]/15 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Question"
                    value={faq.question}
                    onChange={(e) => {
                      const next = [...siteContent.contact.faqs];
                      next[idx] = { ...next[idx], question: e.target.value };
                      setSiteContent({ ...siteContent, contact: { ...siteContent.contact, faqs: next } });
                    }}
                    className="flex-1 border border-[#1b1717]/20 px-3 py-1.5 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSiteContent({
                        ...siteContent,
                        contact: {
                          ...siteContent.contact,
                          faqs: siteContent.contact.faqs.filter((_, i) => i !== idx),
                        },
                      })
                    }
                    className="p-1.5 text-[#5d100a] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(e) => {
                    const next = [...siteContent.contact.faqs];
                    next[idx] = { ...next[idx], answer: e.target.value };
                    setSiteContent({ ...siteContent, contact: { ...siteContent.contact, faqs: next } });
                  }}
                  className="w-full border border-[#1b1717]/20 px-3 py-1.5 text-xs"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving || Boolean(uploadingField)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Publish Contact & FAQs"}</span>
          </button>
        </form>
      )}

      {/* 4. Legal Policies CMS */}
      {activeSection === "policies" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {POLICY_SLUGS.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setSelectedSlug(p.slug)}
                className={`px-3.5 py-1.5 text-[10px] uppercase tracking-widest border cursor-pointer ${
                  selectedSlug === p.slug
                    ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                    : "border-[#1b1717]/20 hover:border-[#1b1717]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {policy && (
            <form onSubmit={handleSavePolicy} className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                    Policy Title
                  </label>
                  <input
                    type="text"
                    value={policy.title || ""}
                    onChange={(e) => setPolicy({ ...policy, title: e.target.value })}
                    className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                    Effective Date
                  </label>
                  <input
                    type="text"
                    value={policy.effectiveDate || ""}
                    onChange={(e) => setPolicy({ ...policy, effectiveDate: e.target.value })}
                    className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold mb-1.5">
                  Executive Summary
                </label>
                <textarea
                  rows={2}
                  value={policy.summary || ""}
                  onChange={(e) => setPolicy({ ...policy, summary: e.target.value })}
                  className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#1b1717]/70 font-semibold">
                    Policy Sections ({(policy.sections || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPolicy({
                        ...policy,
                        sections: [...(policy.sections || []), { heading: "", body: "" }],
                      })
                    }
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#5d100a] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Section
                  </button>
                </div>

                {(policy.sections || []).map((sec, idx) => (
                  <div key={idx} className="border border-[#1b1717]/15 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sec.heading}
                        onChange={(e) => {
                          const next = [...policy.sections];
                          next[idx] = { ...next[idx], heading: e.target.value };
                          setPolicy({ ...policy, sections: next });
                        }}
                        className="flex-1 border border-[#1b1717]/20 px-3 py-1.5 text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPolicy({
                            ...policy,
                            sections: policy.sections.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1.5 text-[#5d100a] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={sec.body}
                      onChange={(e) => {
                        const next = [...policy.sections];
                        next[idx] = { ...next[idx], body: e.target.value };
                        setPolicy({ ...policy, sections: next });
                      }}
                      className="w-full border border-[#1b1717]/20 px-3 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Policy"}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}