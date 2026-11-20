"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeading from "@/components/ui/SectionHeading";
import { LUXURY_PILLARS } from "@/data/catalogData";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LuxuryPillars() {
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      const items = sectionRef.current?.querySelectorAll(".luxury-item");
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
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="luxury-section"
      className="luxury-section w-full mt-[30vw] sm:mt-24 lg:mt-32 px-[3vw] lg:px-10 max-w-[1440px] mx-auto"
    >
      <SectionHeading text="Luxury in every details" />

      <ul className="luxury-showcase w-full overflow-x-auto no-scrollbar flex lg:grid lg:grid-cols-4 gap-[10vw] sm:gap-8 lg:gap-7 py-[8vw] sm:py-10 lg:py-12">
        {LUXURY_PILLARS.map((item) => (
          <li
            key={`${item.heading}-key`}
            className="luxury-item shrink-0 w-[75vw] sm:w-[44vw] lg:w-full"
          >
            <div className="luxury-visual-content w-[75vw] h-[75vw] sm:w-[44vw] sm:h-[44vw] lg:w-full lg:h-auto lg:aspect-square overflow-hidden bg-[#1b1717]/5">
              {item.image ? (
                <img
                  className="luxury-item-image w-full h-full object-cover"
                  src={item.image}
                  alt={item.heading}
                />
              ) : (
                <video
                  className="luxury-item-image w-full h-full object-cover"
                  src={item.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
            </div>

            <div className="luxury-text-content mt-[5vw] sm:mt-4">
              <h3 className="luxury-item-heading heading-serif uppercase text-[3.4vw] sm:text-sm lg:text-[15px] mb-[3vw] sm:mb-2 font-semibold text-[#1b1717]">
                {item.heading}
              </h3>
              <p className="luxury-item-paragraph text-[4vw] sm:text-xs lg:text-[13.5px] font-light leading-relaxed text-[#1b1717]/85">
                {item.paragraph}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}