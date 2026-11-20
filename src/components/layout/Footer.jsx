"use client";

import React, { useRef, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrandLogo from "@/components/ui/BrandLogo";
import AnimatedNavLink from "@/components/ui/AnimatedNavLink";
import InteractiveInput from "@/components/ui/InteractiveInput";
import { useSeasonAndYear } from "@/utils/season";
import { api, getApiErrorMessage } from "@/lib/api";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const MENU_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Collection", href: "/collections" },
  { label: "Account", href: "/account" },
];

const CATEGORY_ITEMS = [
  { label: "Sarees", href: "/collections?category=saree" },
  { label: "Dresses", href: "/collections?category=dress" },
  { label: "Denim Wears", href: "/collections?category=denim" },
  { label: "Shirts", href: "/collections?category=shirt" },
];

const SUPPORT_ITEMS = [
  { label: "About", href: "/craftsmanship" },
  { label: "Contact us", href: "/contact" },
  { label: "Privacy Policy", href: "/policies/privacy-policy" },
  { label: "Shipping & Returns", href: "/policies/shipping-returns" },
  { label: "Terms", href: "/policies/terms-of-service" },
];

const SOCIAL_ITEMS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Github", href: "https://github.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
];

function FooterActiveNavLink({ href, label }) {
  const pathname = usePathname();
  return (
    <AnimatedNavLink
      href={href}
      label={label}
      active={pathname === href}
      underlineColor="bg-[#ffffff]"
    />
  );
}

export default function Footer() {
  const footerRef = useRef(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMsg, setNewsletterMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { currentYear, seasonAndYear } = useSeasonAndYear();

  useGSAP(
    () => {
      const revealEls = footerRef.current?.querySelectorAll(".footer-reveal");
      if (!revealEls || revealEls.length === 0) return;

      gsap.fromTo(
        revealEls,
        { y: 44, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: footerRef }
  );

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubmitting(true);
    setNewsletterMsg("");
    try {
      const { data } = await api.post("/crm/newsletter", {
        email: newsletterEmail.trim(),
      });
      setNewsletterMsg(data.message || "Subscribed successfully.");
      setNewsletterEmail("");
    } catch (err) {
      setNewsletterMsg(getApiErrorMessage(err, "Unable to subscribe right now."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      ref={footerRef}
      id="footer-section"
      className="text-[#ffffff] bg-[#1b1717] py-[20vw] sm:py-16 lg:py-24 px-[3vw] lg:px-10 mt-[10vh]"
    >
      <div className="max-w-[1440px] mx-auto">
        <footer className="mb-[16vw] sm:mb-14 lg:mb-20 px-[2vw] sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 pb-12 lg:pb-16 border-b border-[#ffffff]/15">
            <div className="footer-reveal lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="heading-serif uppercase text-[4.5vw] sm:text-base lg:text-[18px] tracking-wider font-normal">
                  Newsletter
                </h3>
                <p className="mt-2.5 text-[3.5vw] sm:text-xs lg:text-[13px] font-light text-[#ffffff]/65 max-w-sm leading-relaxed">
                  Subscribe to receive updates on our {seasonAndYear} releases and new arrivals.
                </p>

                <form onSubmit={handleNewsletterSubmit} className="mt-6 w-full max-w-sm">
                  <InteractiveInput
                    variant="footer"
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="ENTER YOUR EMAIL"
                    rightSlot={
                      <button
                        type="submit"
                        disabled={submitting}
                        className="text-[3.2vw] sm:text-xs uppercase tracking-widest font-semibold text-[#ffffff] hover:text-[#ffffff]/75 cursor-pointer pl-3 disabled:opacity-50"
                      >
                        {submitting ? "..." : "Join"}
                      </button>
                    }
                  />
                  {newsletterMsg && (
                    <p className="mt-2.5 text-[11px] text-[#ffffff]/80">{newsletterMsg}</p>
                  )}
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8">
              <div className="footer-reveal menu-section">
                <h3 className="footer-heading heading-serif text-[3.5vw] sm:text-xs lg:text-[13px] uppercase font-semibold tracking-wider text-[#ffffff]/75">
                  (Menu)
                </h3>
                <ul className="link-container mt-3.5 flex flex-col gap-2 text-[3.5vw] sm:text-xs lg:text-[12.5px] uppercase">
                  {MENU_ITEMS.map((item) => (
                    <li key={item.label}>
                      <Suspense fallback={<AnimatedNavLink href={item.href} label={item.label} underlineColor="bg-[#ffffff]" />}>
                        <FooterActiveNavLink href={item.href} label={item.label} />
                      </Suspense>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-reveal curations-section">
                <h3 className="footer-heading heading-serif text-[3.5vw] sm:text-xs lg:text-[13px] uppercase font-semibold tracking-wider text-[#ffffff]/75">
                  (Categories)
                </h3>
                <ul className="link-container mt-3.5 flex flex-col gap-2 text-[3.5vw] sm:text-xs lg:text-[12.5px] uppercase">
                  {CATEGORY_ITEMS.map((item) => (
                    <li key={item.label}>
                      <AnimatedNavLink href={item.href} label={item.label} underlineColor="bg-[#ffffff]" />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-reveal customer-support-section">
                <h3 className="footer-heading heading-serif text-[3.5vw] sm:text-xs lg:text-[13px] uppercase font-semibold tracking-wider text-[#ffffff]/75">
                  (Customer Support)
                </h3>
                <ul className="link-container mt-3.5 flex flex-col gap-2 text-[3.5vw] sm:text-xs lg:text-[12.5px] uppercase">
                  {SUPPORT_ITEMS.map((item) => (
                    <li key={item.label}>
                      <Suspense fallback={<AnimatedNavLink href={item.href} label={item.label} underlineColor="bg-[#ffffff]" />}>
                        <FooterActiveNavLink href={item.href} label={item.label} />
                      </Suspense>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-reveal socials-section">
                <h3 className="footer-heading heading-serif text-[3.5vw] sm:text-xs lg:text-[13px] uppercase font-semibold tracking-wider text-[#ffffff]/75">
                  (Socials)
                </h3>
                <ul className="link-container mt-3.5 flex flex-col gap-2 text-[3.5vw] sm:text-xs lg:text-[12.5px] uppercase">
                  {SOCIAL_ITEMS.map((item) => (
                    <li key={item.label}>
                      <AnimatedNavLink href={item.href} label={item.label} underlineColor="bg-[#ffffff]" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </footer>

        <div className="footer-reveal flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[3.5vw] sm:text-xs lg:text-[12.5px] text-[#ffffff]/65 mb-10 px-[2vw] sm:px-0">
          <span>© {currentYear} Divara - All rights reserved.</span>
          <span className="uppercase tracking-widest text-[3vw] sm:text-[11px]">{seasonAndYear}</span>
        </div>

        <Link href="/" aria-label="DIVARA Home" className="footer-reveal brand-logo block w-full">
          <BrandLogo fill="#ffffff" />
        </Link>
      </div>
    </section>
  );
}