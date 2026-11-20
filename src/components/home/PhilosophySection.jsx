"use client";

import React, { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeading from "@/components/ui/SectionHeading";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function PhilosophySection() {
  const sectionRef = useRef(null);
  const videoParallaxRef = useRef(null);
  const textColRef = useRef(null);

  useGSAP(
    () => {
      const items = sectionRef.current?.querySelectorAll(".philosophy-reveal");
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { y: 44, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.14,
            ease: "power3.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );
      }

      // Parallax on the left video inside its overflow-hidden frame
      if (videoParallaxRef.current) {
        gsap.fromTo(
          videoParallaxRef.current,
          { yPercent: -8 },
          {
            yPercent: 8,
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

      // Differential vertical scroll speed on the right text column
      // (No data-velocity on this same node so it never fights ScrollTrigger's y scrub)
      if (textColRef.current) {
        gsap.fromTo(
          textColRef.current,
          { y: 32 },
          {
            y: -32,
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
      id="philosophy-section"
      className="px-[3vw] lg:px-10 mb-[30vw] sm:mb-24 lg:mb-32 max-w-[1440px] mx-auto"
    >
      <div className="philosophy-reveal section-divider w-full text-center mb-[12vw] sm:mb-10 lg:mb-14 uppercase text-[3.5vw] sm:text-xs lg:text-[12px] font-semibold tracking-widest">
        featuring
      </div>

      {/* Mobile: Stacked | PC (lg:): Clean 2-Column with Compact Left Video & Right Text */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 lg:items-center">
        <div className="philosophy-reveal lg:col-span-5 flex justify-center">
          <div className="video-container relative w-full h-[65vh] sm:h-[58vh] lg:w-[380px] xl:w-[420px] lg:h-[480px] mb-[8vw] sm:mb-8 lg:mb-0 overflow-hidden bg-[#1b1717]">
            <video
              ref={videoParallaxRef}
              src="/videos/models.mp4"
              className="absolute -top-[10%] left-0 h-[120%] w-full object-cover will-change-transform"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </div>

        <div
          ref={textColRef}
          className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left will-change-transform"
        >
          <div className="philosophy-reveal w-full">
            <SectionHeading
              text="The Divara Craftmanship"
              className="lg:mx-0 lg:text-left"
            />
          </div>

          <p className="philosophy-reveal philosophy-paragraph text-[4.2vw] sm:text-sm lg:text-[15px] font-light mt-[3vw] sm:mt-4 leading-relaxed text-[#1b1717] max-w-xl">
            Every creation is more than a product—it is a statement of artistry,
            detail, and timeless design. Reflects passion, craftsmanship, and
            elegance, turning simple ideas into luxury.
          </p>

          <p className="philosophy-reveal hidden lg:block text-[14px] font-light mt-4 leading-relaxed text-[#1b1717]/75 max-w-xl">
            From pure handwoven silks to modern silhouettes, every piece is
            finished with quiet precision and enduring quality.
          </p>

          <div className="philosophy-reveal mt-6 hidden lg:block">
            <Link
              href="/craftsmanship"
              className="inline-block py-2.5 px-7 text-[12px] uppercase font-semibold rounded-[2px] bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] transition-colors duration-300"
            >
              Read Our Story
            </Link>
          </div>
        </div>
      </div>

      <div className="philosophy-reveal section-divider w-full text-center mt-[12vw] sm:mt-12 lg:mt-16 uppercase text-[3vw] sm:text-xs lg:text-[12px] font-semibold tracking-widest">
        keep discovering
      </div>
    </section>
  );
}