"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSeasonAndYear } from "@/utils/season";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const ATELIER_MILESTONES = [
  { metric: "2019", label: "Founded in Kolkata" },
  { metric: "14+", label: "Heritage Weaving Clusters" },
  { metric: "100%", label: "Natural Handloom Fibres" },
  { metric: "Small Batch", label: "Seasonal Production" },
];

const EDITORIAL_CHAPTERS = [
  {
    index: "Chapter I",
    subtitle: "Raw Materiality",
    title: "Sourced Directly From Historic Indian Looms",
    description:
      "Every Divara piece begins long before the cutting table. We partner directly with master weaver families in Kanchipuram, Varanasi, Chanderi, and Bhagalpur to commission pure mulberry silks, hand-spun tussar, and organic cotton denims.",
    secondaryNote:
      "By working without middlemen, we preserve traditional loom techniques while achieving lighter, more breathable drapes suited for modern wardrobes.",
    image:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1400&q=85",
    aspect: "aspect-[4/5]",
    reverse: false,
  },
  {
    index: "Chapter II",
    subtitle: "Pattern Architecture",
    title: "Where Classical Drape Meets Modern Tailoring",
    description:
      "Our studio approaches Indian silhouettes with architectural restraint. Whether structuring a raw selvedge denim jacket or balancing the fall of a silk-velvet evening dress, every seam is engineered for effortless movement.",
    secondaryNote:
      "Each pattern undergoes multiple fittings to ensure clean shoulder lines, fluid movement, and uncompromised comfort from morning through evening.",
    image:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1400&q=85",
    aspect: "aspect-[16/11]",
    reverse: true,
  },
  {
    index: "Chapter III",
    subtitle: "Quiet Finishing",
    title: "Hand-Finished Details Made to Endure",
    description:
      "True luxury lies in what is felt as much as what is seen. Our garments are finished with French seams, pure mulmul and silk linings, natural mother-of-pearl fastenings, and hand-rolled edges.",
    secondaryNote:
      "Produced in limited seasonal editions, every piece is individually steamed, inspected, and packed in breathable cotton garment care bags.",
    image:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1400&q=85",
    aspect: "aspect-[4/5]",
    reverse: false,
  },
];

const ATELIER_GALLERY = [
  {
    title: "Handloom Zari & Silk",
    caption: "Varanasi & Kanchipuram Clusters",
    image:
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80",
    span: "md:col-span-5 aspect-[4/5]",
  },
  {
    title: "Contemporary Silhouettes",
    caption: "Minimalist Cuts & Fluid Movement",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
    span: "md:col-span-7 aspect-[16/11]",
  },
  {
    title: "Natural Dye & Texture",
    caption: "Earth-Toned Pigments & Pure Fibres",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    span: "md:col-span-7 aspect-[16/11]",
  },
  {
    title: "Studio Finishing",
    caption: "Small-Batch Inspection & Care",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
    span: "md:col-span-5 aspect-[4/5]",
  },
];

export default function CraftsmanshipPage() {
  const pageRef = useRef(null);
  const floatingCardRef = useRef(null);
  const { currentYear, currentSeason, seasonAndYear } = useSeasonAndYear();

  useGSAP(
    () => {
      // 1. Masthead entrance animation
      gsap.fromTo(
        ".about-masthead-reveal",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.95,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      // 2. ScrollTrigger animations for all editorial sections
      const scrollBlocks = pageRef.current?.querySelectorAll(".about-scroll-block");
      scrollBlocks?.forEach((block) => {
        const items = block.querySelectorAll(".about-item-reveal");
        if (!items || items.length === 0) return;

        gsap.fromTo(
          items,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.14,
            ease: "power3.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: block,
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // 3. Parallax Image Animation across all editorial frames
      const parallaxImages = pageRef.current?.querySelectorAll(".about-parallax-img");
      parallaxImages?.forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -10 },
          {
            yPercent: 10,
            ease: "none",
            scrollTrigger: {
              trigger: img.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });

      // 4. Faster Vertical Scroll Speed on the overlapping Masthead secondary image
      if (floatingCardRef.current) {
        gsap.fromTo(
          floatingCardRef.current,
          { y: 45 },
          {
            y: -55,
            ease: "none",
            scrollTrigger: {
              trigger: floatingCardRef.current.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }

      // 5. Differential Vertical Scroll Speed on Editorial Chapter text columns
      const speedCols = pageRef.current?.querySelectorAll(".about-speed-col");
      speedCols?.forEach((col) => {
        gsap.fromTo(
          col,
          { y: 36 },
          {
            y: -36,
            ease: "none",
            scrollTrigger: {
              trigger: col.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });
    },
    { scope: pageRef }
  );

  return (
    <div
      ref={pageRef}
      className="w-full min-h-screen bg-[#ffffff] text-[#1b1717]"
    >
      {/* 1. Asymmetric Editorial Split Masthead */}
      <section className="pt-24 sm:pt-28 lg:pt-36 pb-16 lg:pb-24 px-[4vw] sm:px-8 lg:px-12 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
          {/* Left Column: Editorial Title & Intro */}
          <div
            data-velocity="-0.25"
            className="lg:col-span-7 flex flex-col items-start will-change-transform"
          >
            <span className="about-masthead-reveal inline-block text-[11px] uppercase tracking-[0.26em] text-[#5d100a] font-semibold mb-4">
              The House of Divara • {seasonAndYear}
            </span>

            <h1 className="about-masthead-reveal heading-serif text-[8vw] sm:text-4xl lg:text-[48px] xl:text-[54px] font-normal leading-[1.1] tracking-tight text-[#1b1717]">
              A Modern Indian Wardrobe Built on Quiet Luxury.
            </h1>

            <p className="about-masthead-reveal mt-6 text-xs sm:text-sm lg:text-[15px] font-light leading-relaxed text-[#1b1717]/80 max-w-xl">
              Founded with a devotion to authentic Indian textiles and clean
              contemporary lines, Divara bridges centuries-old handloom mastery
              with effortless everyday silhouettes.
            </p>

            <div className="about-masthead-reveal mt-8 flex flex-wrap items-center gap-6 pt-6 border-t border-[#1b1717]/15 w-full max-w-xl">
              <div>
                <span className="block text-[10px] uppercase tracking-[0.22em] text-[#1b1717]/50">
                  Current Edition
                </span>
                <span className="text-xs sm:text-sm font-medium text-[#1b1717]">
                  {currentSeason} {currentYear} Archive
                </span>
              </div>
              <div className="h-6 w-[1px] bg-[#1b1717]/15" />
              <div>
                <span className="block text-[10px] uppercase tracking-[0.22em] text-[#1b1717]/50">
                  Design Houses
                </span>
                <span className="text-xs sm:text-sm font-medium text-[#1b1717]">
                  Kolkata • Mumbai • New Delhi
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Layered Dual Web Imagery with Parallax & Vertical Scroll Speed */}
          <div className="about-masthead-reveal lg:col-span-5 relative">
            <div className="relative w-full sm:w-[88%] ml-auto aspect-[4/5] overflow-hidden bg-[#1b1717]/5">
              <img
                src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85"
                alt="Divara Editorial Look"
                className="about-parallax-img absolute -top-[12%] left-0 w-full h-[124%] object-cover will-change-transform"
              />
            </div>

            <div
              ref={floatingCardRef}
              className="hidden sm:block absolute -bottom-8 left-0 w-[46%] aspect-square overflow-hidden border-4 border-[#ffffff] bg-[#1b1717]/5 shadow-lg will-change-transform"
            >
              <img
                src="https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80"
                alt="Handwoven Silk Detail"
                className="about-parallax-img absolute -top-[12%] left-0 w-full h-[124%] object-cover will-change-transform"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Dark Editorial Manifesto & Milestones Band */}
      <section className="about-scroll-block w-full bg-[#1b1717] text-[#ffffff] py-16 sm:py-20 lg:py-28 px-[4vw] sm:px-8 lg:px-12 mt-6 sm:mt-12">
        <div className="max-w-[1440px] mx-auto">
          <span className="about-item-reveal block text-[11px] uppercase tracking-[0.28em] text-[#ffffff]/60 mb-4">
            Our Philosophy
          </span>

          <h2 className="about-item-reveal heading-serif text-xl sm:text-3xl lg:text-[36px] font-normal leading-snug max-w-4xl text-[#ffffff]">
            “We do not design for fleeting moments. We create garments meant to
            be lived in, treasured, and passed forward with grace.”
          </h2>

          <div className="mt-12 lg:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-[#ffffff]/15">
            {ATELIER_MILESTONES.map((item) => (
              <div key={item.label} className="about-item-reveal">
                <span className="block text-2xl sm:text-3xl lg:text-[34px] font-light text-[#ffffff]">
                  {item.metric}
                </span>
                <span className="mt-1.5 block text-[11px] uppercase tracking-[0.2em] text-[#ffffff]/65">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Alternating Staggered Editorial Chapters with Parallax & Vertical Scroll Speed */}
      <section className="py-16 sm:py-24 lg:py-32 px-[4vw] sm:px-8 lg:px-12 max-w-[1440px] mx-auto space-y-20 sm:space-y-28 lg:space-y-36">
        {EDITORIAL_CHAPTERS.map((chapter) => (
          <div
            key={chapter.index}
            className="about-scroll-block grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center"
          >
            {/* Image Column */}
            <div
              className={`about-item-reveal lg:col-span-6 ${
                chapter.reverse ? "lg:order-2" : "lg:order-1"
              }`}
            >
              <div
                className={`relative w-full ${chapter.aspect} overflow-hidden bg-[#1b1717]/5`}
              >
                <img
                  src={chapter.image}
                  alt={chapter.title}
                  className="about-parallax-img absolute -top-[12%] left-0 w-full h-[124%] object-cover will-change-transform"
                />
              </div>
            </div>

            {/* Narrative Column */}
            <div
              className={`about-speed-col lg:col-span-6 flex flex-col items-start will-change-transform ${
                chapter.reverse ? "lg:order-1 lg:pr-8" : "lg:order-2 lg:pl-8"
              }`}
            >
              <div className="about-item-reveal flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5d100a]">
                  {chapter.index}
                </span>
                <span className="h-[1px] w-8 bg-[#5d100a]/40" />
                <span className="text-xs uppercase tracking-[0.18em] text-[#1b1717]/55">
                  {chapter.subtitle}
                </span>
              </div>

              <h2 className="about-item-reveal heading-serif text-2xl sm:text-3xl lg:text-[32px] font-normal leading-snug text-[#1b1717]">
                {chapter.title}
              </h2>

              <p className="about-item-reveal mt-5 text-xs sm:text-sm lg:text-[15px] font-light leading-relaxed text-[#1b1717]/85">
                {chapter.description}
              </p>

              <p className="about-item-reveal mt-4 text-xs sm:text-sm lg:text-[14px] font-light leading-relaxed text-[#1b1717]/70">
                {chapter.secondaryNote}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* 4. Asymmetric Visual Moodboard / Atelier Lookbook Grid */}
      <section className="about-scroll-block border-t border-[#1b1717]/10 bg-[#ffffff] py-16 sm:py-24 lg:py-28 px-[4vw] sm:px-8 lg:px-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 lg:mb-14 gap-4">
            <div>
              <span className="about-item-reveal block text-[11px] uppercase tracking-[0.24em] text-[#5d100a] font-semibold mb-2">
                Inside The Studio • {currentYear}
              </span>
              <h2 className="about-item-reveal heading-serif text-2xl sm:text-3xl lg:text-[34px] font-normal text-[#1b1717]">
                Material & Silhouette Study
              </h2>
            </div>
            <p className="about-item-reveal text-xs sm:text-sm font-light text-[#1b1717]/75 max-w-sm">
              A closer look at the textures, natural dyes, and structured drapes
              shaping our {seasonAndYear} collection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
            {ATELIER_GALLERY.map((item) => (
              <div
                key={item.title}
                className={`about-item-reveal flex flex-col ${item.span}`}
              >
                <div className="relative w-full h-full overflow-hidden bg-[#1b1717]/5">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="about-parallax-img absolute -top-[12%] left-0 w-full h-[124%] object-cover will-change-transform"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <h3 className="heading-serif text-sm sm:text-base font-normal text-[#1b1717]">
                    {item.title}
                  </h3>
                  <span className="text-[11px] uppercase tracking-wider text-[#1b1717]/60">
                    {item.caption}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Minimal Bottom Invitation */}
          <div className="about-item-reveal mt-16 lg:mt-24 pt-10 border-t border-[#1b1717]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
                {seasonAndYear} Wardrobe
              </span>
              <h3 className="heading-serif text-xl sm:text-2xl lg:text-[28px] font-normal mt-1 text-[#1b1717]">
                Discover the Complete Collection
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-xs uppercase tracking-widest font-semibold bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] transition-colors duration-300 rounded-[2px]"
              >
                <span>Explore Collection</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-xs uppercase tracking-widest font-semibold border border-[#1b1717] bg-[#ffffff] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors duration-300 rounded-[2px]"
              >
                <span>Contact Us</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}