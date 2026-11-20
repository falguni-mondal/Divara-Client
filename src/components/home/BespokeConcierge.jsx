"use client";

import React, { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function BespokeConcierge() {
  const sectionRef = useRef(null);
  const bgParallaxRef = useRef(null);

  useGSAP(
    () => {
      const items = sectionRef.current?.querySelectorAll(".contact-reveal");
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { y: 44, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.12,
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

      if (bgParallaxRef.current) {
        gsap.fromTo(
          bgParallaxRef.current,
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
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="contact-section"
      className="w-full px-[3vw] lg:px-10 mt-[30vw] sm:mt-24 lg:mt-32 max-w-[1440px] mx-auto"
    >
      <div className="contact-reveal contact-bg-container w-full h-[40vh] sm:h-[46vh] lg:h-[420px] relative overflow-hidden">
        <img
          ref={bgParallaxRef}
          className="absolute -top-[12%] left-0 h-[124%] w-full object-cover object-right will-change-transform"
          src="/bg/contact_bg.webp"
          alt="Contact Divara"
        />

        <div
          id="contact-overlay"
          className="absolute inset-0 w-full h-full flex flex-col lg:flex-row lg:items-center lg:justify-between text-[#ffffff] px-[10vw] sm:px-12 lg:px-16 bg-gradient-to-r from-black/75 via-black/50 to-black/30"
        >
          <div className="my-auto lg:max-w-lg">
            <div className="contact-header mb-[5vh] sm:mb-6">
              <span className="contact-reveal leading-none text-[4.5vw] sm:text-xs lg:text-[12px] uppercase tracking-widest block mb-2 text-[#ffffff]/75">
                Need Help ?
              </span>
              <h2 className="contact-reveal heading-serif uppercase text-[6vw] sm:text-2xl lg:text-[30px] tracking-wider leading-tight font-normal">
                We are here to help
              </h2>
              <p className="contact-reveal hidden sm:block mt-3 text-xs lg:text-[13.5px] font-light text-[#ffffff]/85 leading-relaxed">
                Have a question about our collections, orders, or deliveries?
                Our client support team is available Monday through Saturday to
                assist you.
              </p>
            </div>

            <div className="contact-reveal flex items-center gap-4">
              <Link
                href="/contact"
                className="w-[30vw] sm:w-36 lg:w-40 h-[4.5vh] sm:h-10 flex justify-center items-center border border-[#ffffff] rounded-[3px] text-[3.5vw] sm:text-xs lg:text-[12px] uppercase backdrop-blur-[15px] bg-[#ffffff12] text-[#ffffff] hover:bg-[#ffffff] hover:text-[#1b1717] transition-colors duration-300"
              >
                Contact
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-5 border-l border-[#ffffff]/20 pl-12 max-w-xs">
            <div className="contact-reveal">
              <span className="block text-[11px] uppercase tracking-widest text-[#ffffff]/70 font-semibold">
                Email Support
              </span>
              <p className="mt-1 text-xs font-light text-[#ffffff]">
                support@divara.byfalguni.com
              </p>
            </div>

            <div className="contact-reveal">
              <span className="block text-[11px] uppercase tracking-widest text-[#ffffff]/70 font-semibold">
                Support Hours
              </span>
              <p className="mt-1 text-xs font-light text-[#ffffff]">
                Mon – Sat, 10:00 AM to 8:00 PM IST
              </p>
            </div>

            <div className="contact-reveal">
              <span className="block text-[11px] uppercase tracking-widest text-[#ffffff]/70 font-semibold">
                Locations
              </span>
              <p className="mt-1 text-xs font-light text-[#ffffff]">
                Kolkata • Mumbai • New Delhi
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}