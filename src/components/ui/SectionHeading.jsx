"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SectionHeading({ text, className = "" }) {
  const headingRef = useRef(null);

  useGSAP(
    () => {
      if (!headingRef.current) return;
      gsap.fromTo(
        headingRef.current,
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: headingRef }
  );

  return (
    <h2
      ref={headingRef}
      className={`heading-serif uppercase block w-fit mx-auto text-center text-[6vw] sm:text-2xl lg:text-[28px] tracking-wider font-normal leading-snug ${className}`}
    >
      {text}
    </h2>
  );
}