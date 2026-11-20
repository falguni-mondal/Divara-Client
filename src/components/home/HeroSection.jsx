"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrandLogo from "@/components/ui/BrandLogo";
import { useSeasonAndYear } from "@/utils/season";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export default function HeroSection() {
  const heroRef = useRef(null);
  const bgRef = useRef(null);
  const brandRef = useRef(null);
  const ctaRef = useRef(null);
  const scrollTextRef = useRef(null);
  const { currentSeason, seasonAndYear } = useSeasonAndYear();

  useGSAP(
    () => {
      const revealItems = heroRef.current?.querySelectorAll(".hero-cta-item");

      // 1. Initial Entrance Timeline (animates wrappers, never the button's CSS transition properties)
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        brandRef.current,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, delay: 0.12 }
      ).fromTo(
        revealItems || [],
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.12,
          clearProps: "transform",
        },
        "-=0.6"
      );

      // 2. Pure Overflow-Hidden Mask Trick Loop on "Scroll to Discover More"
      if (scrollTextRef.current) {
        const loopTl = gsap.timeline({ repeat: -1 });
        loopTl
          .set(scrollTextRef.current, { yPercent: 115 })
          .to(scrollTextRef.current, {
            yPercent: 0,
            duration: 0.85,
            ease: "power3.out",
          })
          .to(scrollTextRef.current, {
            yPercent: 0,
            duration: 1.25,
          })
          .to(scrollTextRef.current, {
            yPercent: -115,
            duration: 0.75,
            ease: "power3.in",
          });
      }

      // 3. Hero Background Parallax + Accelerated Vertical Scroll Speed on Foreground
      if (bgRef.current) {
        gsap.fromTo(
          bgRef.current,
          { yPercent: 0, scale: 1.06 },
          {
            yPercent: 15,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }

      if (ctaRef.current) {
        gsap.to(ctaRef.current, {
          yPercent: -35,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      id="hero-section"
      className="w-full h-svh relative flex flex-col items-center justify-between text-[#ffffff] overflow-hidden"
    >
      {/* Parallax Hero Background Image */}
      <picture
        ref={bgRef}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        <source media="(min-width: 1024px)" srcSet="/bg/hero.webp" />
        <img
          className="w-full h-full object-cover"
          src="/bg/hero_mobile_2.webp"
          alt={`Divara ${seasonAndYear} Hero`}
        />
      </picture>

      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      {/* Brand Name: Top on mobile (pt-[9vh]), Centered on PC */}
      <div
        ref={brandRef}
        data-velocity="-0.35"
        className="brand-name relative z-10 w-[80%] pt-[9vh] lg:pt-0 lg:w-[46%] xl:w-[42%] lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
      >
        <BrandLogo fill="#ffffff" />
      </div>

      {/* Bottom CTA Container */}
      <div
        ref={ctaRef}
        className="cta-container pb-[4vh] lg:pb-8 lg:mt-auto relative z-10 flex flex-col items-center gap-[1.8vh] lg:gap-3.5"
      >
        <h1 className="hero-cta-item heading heading-serif text-[6vw] sm:text-2xl lg:text-[28px] tracking-tight font-normal">
          {seasonAndYear}
        </h1>

        {/* Automatically filters by currentSeason when navigating to /collections */}
        <div className="hero-cta-item">
          <Link
            href={`/collections?season=${encodeURIComponent(currentSeason)}`}
            id="cta-btn"
            className="inline-block py-[3.5vw] px-[8vw] sm:py-2.5 sm:px-7 lg:py-3 lg:px-8 text-[3vw] sm:text-xs lg:text-[12px] font-semibold rounded-[2px] bg-[#ffffff] text-[#1b1717] hover:bg-[#ffffff]/85 transition-colors duration-300"
          >
            SHOP NOW
          </Link>
        </div>

        {/* Pure Overflow-Hidden Mask Trick Container */}
        <div className="hero-cta-item scroll-txt h-[4vw] sm:h-[18px] lg:h-[20px] flex items-center text-[3vw] sm:text-xs lg:text-[12px] overflow-hidden">
          <span
            ref={scrollTextRef}
            className="scroll-txt-container relative flex items-center gap-[0.5vw] sm:gap-1 leading-none will-change-transform"
          >
            Scroll to Discover More <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
}