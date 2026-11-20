"use client";

import React, { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSeasonAndYear } from "@/utils/season";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CollectionBanner() {
  const sectionRef = useRef(null);
  const parallaxImgRef = useRef(null);
  const contentRef = useRef(null);
  const { currentSeason, seasonAndYear } = useSeasonAndYear();

  useGSAP(
    () => {
      const els = sectionRef.current?.querySelectorAll(".collection-reveal");
      if (els && els.length > 0) {
        gsap.fromTo(
          els,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.14,
            ease: "power3.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );
      }

      // Parallax Image Animation on Banner Background (non-product image)
      if (parallaxImgRef.current) {
        gsap.fromTo(
          parallaxImgRef.current,
          { yPercent: -10 },
          {
            yPercent: 10,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }

      // Faster vertical scroll speed on foreground text/CTA
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { y: 36 },
          {
            y: -36,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="collection-section"
      className="w-full h-[70vh] lg:h-[80vh] relative my-[18vw] sm:my-24 lg:my-32 text-[#ffffff] max-w-[1440px] mx-auto px-[3vw] lg:px-10"
    >
      <div className="collection-reveal relative w-full h-full overflow-hidden">
        <picture
          ref={parallaxImgRef}
          className="absolute -top-[12%] left-0 w-full h-[124%] will-change-transform"
        >
          <source media="(min-width: 1024px)" srcSet="/bg/collection.webp" />
          <img
            className="h-full w-full object-cover"
            src="/bg/collection_mobile.webp"
            alt={`${seasonAndYear} Collection`}
            id="collection-bg-mobile"
          />
        </picture>

        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        <div
          ref={contentRef}
          className="collection-link-container relative z-10 w-full h-full flex flex-col items-center justify-center will-change-transform"
        >
          <h2 className="collection-reveal heading-serif text-[6vw] sm:text-2xl lg:text-[30px] tracking-tight font-normal">
            {seasonAndYear}
          </h2>

          {/* Automatically routes to /collections filtered by currentSeason */}
          <div className="collection-reveal mt-[3vw] sm:mt-4">
            <Link
              href={`/collections?season=${encodeURIComponent(currentSeason)}`}
              className="collection-link-btn inline-block text-[3vw] sm:text-xs lg:text-[12px] font-medium py-[3vw] px-[6vw] sm:py-2.5 sm:px-7 lg:py-3 lg:px-8 rounded-[3px] bg-[#ffffff15] backdrop-blur-[7px] border border-[#ffffff] text-[#ffffff] hover:bg-[#ffffff] hover:text-[#1b1717] transition-colors duration-300"
            >
              SHOP NOW
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}