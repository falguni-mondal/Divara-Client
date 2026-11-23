"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, CornerDownRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import InteractiveInput from "@/components/ui/InteractiveInput";
import { useSeasonAndYear } from "@/utils/season";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useShop } from "@/context/ShopContext";
import { api, getApiErrorMessage } from "@/lib/api";
import { ikUrl } from "@/lib/imagekit";
import { useAiConcierge } from "@/context/AiConciergeContext";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const DEFAULT_CONTACT = {
  bannerImage: { url: "/bg/contact_bg.webp" },
  email: "support@divara.byfalguni.com",
  phone: "+91 (033) 2284-9100",
  supportHours: "Monday – Saturday, 10:00 AM to 8:00 PM IST",
  locations: ["Kolkata", "Mumbai", "New Delhi"],
  faqs: [
    {
      question: "How long does shipping take within India?",
      answer:
        "Standard orders are dispatched within 2 to 4 business days and delivered within 5 to 7 business days across India with complimentary insured shipping.",
    },
    {
      question: "What is your return and exchange policy?",
      answer:
        "We accept returns and size exchanges within 7 days of delivery for unworn items in original condition with all tags and packaging intact.",
    },
    {
      question: "How should I care for silk and handwoven garments?",
      answer:
        "We recommend professional dry cleaning only for our silk sarees, Chanderi pieces, and velvet garments. Store them in the breathable cotton bag provided with your order.",
    },
    {
      question: "Can I track my order after checkout?",
      answer:
        "Yes. Once your order is dispatched, you will receive an email with your tracking link and estimated delivery date.",
    },
  ],
};

function TicketReplyNode({
  reply,
  allReplies,
  ticketId,
  activeReplyTarget,
  setActiveReplyTarget,
  replyDraft,
  setReplyDraft,
  onSubmitReply,
  submittingReply,
  depth = 0,
}) {
  const children = allReplies.filter((r) => r.parentReplyId === reply.id);
  const isAdmin = reply.authorRole === "admin" || reply.authorRole === "super_admin";
  const isReplyingHere =
    activeReplyTarget?.ticketId === ticketId &&
    activeReplyTarget?.parentReplyId === reply.id;

  return (
    <div className={depth > 0 ? "ml-5 sm:ml-8 pl-4 border-l border-[#1b1717]/15 mt-3" : "mt-4"}>
      <div className={`p-3.5 sm:p-4 border ${isAdmin ? "border-[#5d100a]/25 bg-[#5d100a]/[0.03]" : "border-[#1b1717]/12 bg-[#ffffff]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1b1717]">{reply.authorName}</span>
            {isAdmin && (
              <span className="px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] bg-[#5d100a] text-[#ffffff]">
                DIVARA Support
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#1b1717]/50">
            {new Date(reply.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>

        <p className="mt-2 text-xs sm:text-sm font-light leading-relaxed text-[#1b1717]/85">
          {reply.message}
        </p>

        {isAdmin && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() =>
                setActiveReplyTarget(
                  isReplyingHere ? null : { ticketId, parentReplyId: reply.id }
                )
              }
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#5d100a] hover:text-[#1b1717] transition-colors cursor-pointer"
            >
              <CornerDownRight className="w-3 h-3" />
              <span>{isReplyingHere ? "Cancel" : "Reply"}</span>
            </button>
          </div>
        )}

        {isReplyingHere && (
          <form
            onSubmit={(e) => onSubmitReply(e, ticketId, reply.id)}
            className="mt-3 flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              required
              minLength={2}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={`Reply to ${reply.authorName}...`}
              className="flex-1 border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a] bg-[#ffffff]"
            />
            <button
              type="submit"
              disabled={submittingReply}
              className="px-4 py-2 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[10px] uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {submittingReply ? "..." : "Send"}
            </button>
          </form>
        )}
      </div>

      {children.map((child) => (
        <TicketReplyNode
          key={child.id}
          reply={child}
          allReplies={allReplies}
          ticketId={ticketId}
          activeReplyTarget={activeReplyTarget}
          setActiveReplyTarget={setActiveReplyTarget}
          replyDraft={replyDraft}
          setReplyDraft={setReplyDraft}
          onSubmitReply={onSubmitReply}
          submittingReply={submittingReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function ContactPage() {
  const pageRef = useRef(null);
  const heroBgRef = useRef(null);
  const { seasonAndYear } = useSeasonAndYear();
  const { refreshScroll } = useSmoothScroll();
  const { user } = useShop();

  const [contactCms, setContactCms] = useState(DEFAULT_CONTACT);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [submittedRef, setSubmittedRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });

  const [tickets, setTickets] = useState([]);
  const [activeReplyTarget, setActiveReplyTarget] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  useEffect(() => {
    api
      .get("/cms/site-content")
      .then(({ data }) => {
        if (data.data?.contact) setContactCms(data.data.contact);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.fullName || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);


  const { registerFormHandler } = useAiConcierge();

  useEffect(() => {
    return registerFormHandler("contact", (fields) => {
      setFormData((prev) => ({
        ...prev,
        ...(fields.fullName || fields.name ? { name: fields.fullName || fields.name } : {}),
        ...(fields.email ? { email: fields.email } : {}),
        ...(fields.subject ? { subject: fields.subject } : {}),
        ...(fields.message ? { message: fields.message } : {}),
      }));
    });
  }, [registerFormHandler]);

  

  const loadMyTickets = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/crm/contact/my-tickets");
      setTickets(data.data?.tickets || []);
    } catch {
      setTickets([]);
    }
  }, [user]);

  useEffect(() => {
    loadMyTickets();
  }, [loadMyTickets]);

  const toggleFaq = (idx) => {
    setOpenFaqIndex((prev) => (prev === idx ? -1 : idx));
    setTimeout(() => refreshScroll(), 350);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/crm/contact", formData);
      const created = data.data?.ticket;
      setSubmittedRef(created?.ticketNumber || "RECEIVED");
      if (created) {
        setTickets((prev) => [created, ...prev]);
      }
      setFormData({
        name: user?.fullName || "",
        email: user?.email || "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Unable to send message right now."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e, ticketId, parentReplyId) => {
    e.preventDefault();
    if (!replyDraft.trim()) return;
    setReplyError("");
    setSubmittingReply(true);
    try {
      const { data } = await api.post(`/crm/contact/${ticketId}/reply`, {
        message: replyDraft.trim(),
        parentReplyId,
      });
      const updatedTicket = data.data?.ticket;
      if (updatedTicket) {
        setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
      }
      setReplyDraft("");
      setActiveReplyTarget(null);
    } catch (err) {
      setReplyError(getApiErrorMessage(err, "Could not post reply."));
    } finally {
      setSubmittingReply(false);
    }
  };

  useGSAP(
    () => {
      gsap.fromTo(
        ".contact-page-hero",
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: "power3.out", clearProps: "transform" }
      );
      if (heroBgRef.current) {
        gsap.fromTo(
          heroBgRef.current,
          { yPercent: -8 },
          {
            yPercent: 12,
            ease: "none",
            scrollTrigger: {
              trigger: heroBgRef.current.parentElement,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
      gsap.fromTo(
        ".contact-page-block",
        { y: 44, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.14,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: { trigger: ".contact-main-grid", start: "top 82%", toggleActions: "play none none none" },
        }
      );
      gsap.fromTo(
        ".faq-item-reveal",
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: { trigger: ".faq-section", start: "top 85%", toggleActions: "play none none none" },
        }
      );
    },
    { scope: pageRef }
  );

  return (
    <div ref={pageRef} className="w-full min-h-screen bg-[#ffffff] text-[#1b1717]">
      <section className="relative w-full h-[42vh] lg:h-[48vh] overflow-hidden flex items-end">
        <img
          ref={heroBgRef}
          src={ikUrl(contactCms.bannerImage?.url || "/bg/contact_bg.webp", { width: 1600 })}
          alt="Contact Divara"
          className="absolute -top-[10%] left-0 w-full h-[120%] object-cover object-right will-change-transform"
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 max-w-[1440px] w-full mx-auto px-[3vw] lg:px-10 pb-8 lg:pb-12 text-[#ffffff]">
          <span className="contact-page-hero block text-[3vw] sm:text-xs uppercase tracking-[0.22em] text-[#ffffff]/75 mb-2">
            Client Support • {seasonAndYear}
          </span>
          <h1 className="contact-page-hero heading-serif text-[7.5vw] sm:text-3xl lg:text-[40px] font-normal tracking-tight">
            Contact Us
          </h1>
        </div>
      </section>

      <section className="contact-main-grid max-w-[1440px] mx-auto px-[3vw] lg:px-10 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="contact-page-block lg:col-span-5 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-[0.22em] text-[#5d100a] font-semibold">Get in Touch</span>
              <h2 className="heading-serif text-2xl sm:text-3xl lg:text-[32px] font-normal mt-2">We Are Here to Help</h2>
              <p className="mt-4 text-xs sm:text-sm font-light leading-relaxed text-[#1b1717]/80">
                Whether you have a question about our outfits, shipping, or an existing order, reach out to our team and we will respond within 24 hours.
              </p>

              <div className="mt-8 space-y-6 border-t border-[#1b1717]/15 pt-6">
                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-[#1b1717]/55 font-semibold">Email</span>
                  <p className="mt-1 text-sm font-medium text-[#1b1717]">{contactCms.email}</p>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-[#1b1717]/55 font-semibold">Phone</span>
                  <p className="mt-1 text-sm font-medium text-[#1b1717]">{contactCms.phone}</p>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-[#1b1717]/55 font-semibold">Support Hours</span>
                  <p className="mt-1 text-sm font-light text-[#1b1717]/85">{contactCms.supportHours}</p>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-[#1b1717]/55 font-semibold">Locations</span>
                  <p className="mt-1 text-sm font-light text-[#1b1717]/85">{(contactCms.locations || []).join(" • ")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-page-block lg:col-span-7">
            <div className="border border-[#1b1717]/15 p-6 sm:p-8 lg:p-10 bg-[#ffffff]">
              <h2 className="heading-serif text-xl sm:text-2xl font-normal mb-6">Send a Message</h2>

              {submittedRef && (
                <div className="mb-6 p-4 border border-[#5d100a]/30 bg-[#5d100a]/[0.03] text-xs text-[#1b1717]">
                  Inquiry <strong>{submittedRef}</strong> has been posted below. You will receive an email as soon as our team replies.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
                    {errorMsg}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InteractiveInput
                    label="Full Name *"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your Name"
                  />
                  <InteractiveInput
                    label="Email Address *"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </div>
                <InteractiveInput
                  label="Subject *"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Order Inquiry, Product Question, etc."
                />
                <InteractiveInput
                  as="textarea"
                  rows={5}
                  label="Message *"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Write your message here..."
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 text-xs uppercase tracking-widest font-semibold bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] transition-colors duration-300 cursor-pointer rounded-[2px] disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-[3vw] lg:px-10 pb-16">
        <div className="border-t border-[#1b1717]/15 pt-12 max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Conversation History
          </span>
          <h2 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Your Inquiries &amp; Atelier Replies
          </h2>

          {replyError && (
            <div className="mt-4 p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
              {replyError}
            </div>
          )}

          {!user && tickets.length === 0 ? (
            <div className="mt-6 border border-[#1b1717]/15 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm font-light text-[#1b1717]/75">
                Sign in to view your past inquiries and reply directly to DIVARA support messages.
              </p>
              <Link
                href="/account"
                className="shrink-0 px-5 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[11px] uppercase tracking-widest font-semibold transition-colors text-center"
              >
                Sign In
              </Link>
            </div>
          ) : tickets.length === 0 ? (
            <p className="mt-4 text-xs sm:text-sm font-light text-[#1b1717]/65">
              You have not submitted any inquiries yet. Messages you send above will appear here with replies from our atelier.
            </p>
          ) : (
            <div className="mt-8 space-y-6">
              {tickets.map((ticket) => {
                const topLevelReplies = (ticket.replies || []).filter((r) => !r.parentReplyId);
                return (
                  <article
                    key={ticket.id}
                    id={`ticket-${ticket.ticketNumber}`}
                    className="border border-[#1b1717]/15 p-5 sm:p-6 bg-[#ffffff]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                          {ticket.ticketNumber} • {ticket.status.replace("_", " ")}
                        </span>
                        <h3 className="heading-serif text-lg sm:text-xl font-normal mt-1">
                          {ticket.subject}
                        </h3>
                      </div>
                      <span className="text-[11px] text-[#1b1717]/50">
                        {new Date(ticket.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>

                    <p className="mt-3 text-xs sm:text-sm font-light leading-relaxed text-[#1b1717]/85">
                      {ticket.message}
                    </p>

                    {!ticket.hasAdminReply && (
                      <p className="mt-3 text-[11px] italic text-[#1b1717]/55">
                        Awaiting reply from DIVARA Client Support — you will be able to reply once our team responds.
                      </p>
                    )}

                    {topLevelReplies.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#1b1717]/10">
                        {topLevelReplies.map((reply) => (
                          <TicketReplyNode
                            key={reply.id}
                            reply={reply}
                            allReplies={ticket.replies || []}
                            ticketId={ticket.id}
                            activeReplyTarget={activeReplyTarget}
                            setActiveReplyTarget={setActiveReplyTarget}
                            replyDraft={replyDraft}
                            setReplyDraft={setReplyDraft}
                            onSubmitReply={handleReplySubmit}
                            submittingReply={submittingReply}
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
      </section>

      <section className="faq-section max-w-[1440px] mx-auto px-[3vw] lg:px-10 pb-16 lg:pb-24">
        <div className="border-t border-[#1b1717]/15 pt-12 lg:pt-16 max-w-3xl mx-auto">
          <div className="faq-item-reveal text-center mb-8 lg:mb-10">
            <span className="text-xs uppercase tracking-[0.22em] text-[#5d100a] font-semibold">Common Questions</span>
            <h2 className="heading-serif text-2xl sm:text-3xl font-normal mt-2">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-[#1b1717]/15 border-y border-[#1b1717]/15">
            {(contactCms.faqs || []).map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={faq.question} className="faq-item-reveal">
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    className="w-full py-4 sm:py-5 flex items-center justify-between text-left gap-4 cursor-pointer group"
                  >
                    <h3 className="heading-serif text-base sm:text-lg font-normal text-[#1b1717] group-hover:text-[#5d100a] transition-colors">
                      {faq.question}
                    </h3>
                    <span
                      className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-[#1b1717]/25 transition-transform duration-300 ${
                        isOpen ? "rotate-45 bg-[#5d100a] border-[#5d100a] text-[#ffffff]" : "rotate-0 text-[#1b1717]"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 text-xs sm:text-sm font-light leading-relaxed text-[#1b1717]/75">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}