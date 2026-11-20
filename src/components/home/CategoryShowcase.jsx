"use client";

import React, { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeading from "@/components/ui/SectionHeading";
import { CATEGORIES } from "@/data/catalogData";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CategoryShowcase() {
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      const items = sectionRef.current?.querySelectorAll(".shop-category-item");
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
      id="shop-category-section"
      className="mt-[18vw] sm:mt-20 lg:mt-28 relative w-full"
    >
      <div className="shop-category-heading">
        <SectionHeading text="Discover Timeless Luxury" />
      </div>

      <div className="shop-category-items-container w-full px-[3vw] lg:px-10 pt-[8vw] sm:pt-10 lg:pt-12 max-w-[1440px] mx-auto">
        <ul className="flex justify-between flex-wrap w-full">
          {CATEGORIES.map((item) => (
            <li
              key={`${item.title}-category-key`}
              className="w-[49%] lg:w-[24%] mb-6 lg:mb-0 shop-category-item group"
            >
              <Link href={item.path} className="block">
                {/* Only this section under the Home Hero uses zoom-out-img on hover */}
                <div className="overflow-hidden bg-[#1b1717]/5">
                  <img
                    className="zoom-out-img w-full h-[28vh] sm:h-[36vh] lg:h-[46vh] object-cover"
                    src={item.poster}
                    alt={item.title}
                  />
                </div>
                <p className="w-full text-center text-[3.5vw] sm:text-sm lg:text-[14px] mt-3 font-semibold text-[#1b1717] transition-colors duration-300 group-hover:text-[#5d100a]">
                  {item.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}