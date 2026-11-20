"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag, User } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TextLogo } from "@/components/ui/BrandLogo";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useShop } from "@/context/ShopContext";
import { useSeasonAndYear } from "@/utils/season";

export default function NavMenu({
  showNav,
  navMenuController,
  navLinks,
  pathname = "/",
}) {
  const menuRef = useRef(null);
  const tlRef = useRef(null);
  const { stopScroll, startScroll } = useSmoothScroll();
  const { bagCount, setIsBagOpen } = useShop();
  const { seasonAndYear } = useSeasonAndYear();

  useEffect(() => {
    if (showNav) {
      stopScroll();
    } else {
      startScroll();
    }
    return () => startScroll();
  }, [showNav, stopScroll, startScroll]);

  useGSAP(
    () => {
      if (!menuRef.current) return;

      const links = menuRef.current.querySelectorAll(".nav-menu-item");
      const footerItems = menuRef.current.querySelectorAll(".nav-menu-footer");

      const tl = gsap.timeline({ paused: true });

      tl.fromTo(
        menuRef.current,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          pointerEvents: "none",
        },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          pointerEvents: "auto",
          duration: 0.65,
          ease: "power4.inOut",
        }
      )
        .fromTo(
          links,
          { y: 36, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.07,
            ease: "power3.out",
          },
          "-=0.25"
        )
        .fromTo(
          footerItems,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.06,
            ease: "power3.out",
          },
          "-=0.3"
        );

      tlRef.current = tl;
    },
    { scope: menuRef }
  );

  useEffect(() => {
    if (!tlRef.current) return;
    if (showNav) {
      tlRef.current.play();
    } else {
      tlRef.current.reverse();
    }
  }, [showNav]);

  const isLinkActive = (href) => {
    if (href === "/") return pathname === "/";
    if (href === "/collections") {
      return pathname === "/collections" || pathname?.startsWith("/shop/");
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <div
      ref={menuRef}
      data-lenis-prevent
      id="mobile-nav-menu"
      style={{ clipPath: "inset(0% 0% 100% 0%)", pointerEvents: "none" }}
      className="lg:hidden fixed inset-0 z-[9999] bg-[#1b1717] text-[#ffffff] flex flex-col justify-between px-5 sm:px-8 pb-8 pt-1"
    >
      {/* Top Bar: Brand Logo & Minimal Close Button */}
      <div className="flex items-center justify-between h-[45px] sm:h-[56px] border-b border-[#ffffff]/10">
        <Link
          href="/"
          onClick={navMenuController}
          aria-label="DIVARA Home"
          className="py-1"
        >
          <TextLogo className="w-[82px] sm:w-[92px]" fill="#ffffff" />
        </Link>

        <button
          type="button"
          onClick={navMenuController}
          aria-label="Close Menu"
          className="flex items-center gap-2.5 py-2 text-[11px] uppercase tracking-[0.22em] text-[#ffffff]/80 hover:text-[#ffffff] cursor-pointer"
          id="nav-hamburger-close"
        >
          <span>Close</span>
          <span className="relative h-4 w-4 flex items-center justify-center">
            <span className="absolute h-[1.5px] w-full bg-[#ffffff] rotate-45" />
            <span className="absolute h-[1.5px] w-full bg-[#ffffff] -rotate-45" />
          </span>
        </button>
      </div>

      {/* Center: Editorial Numbered Navigation Links */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="my-auto py-8 divide-y divide-[#ffffff]/10 border-y border-[#ffffff]/10"
      >
        {navLinks.map((item, idx) => {
          const active = isLinkActive(item.href);
          const indexStr = String(idx + 1).padStart(2, "0");

          return (
            <div key={item.href} className="nav-menu-item overflow-hidden">
              <Link
                href={item.href}
                onClick={navMenuController}
                className="group flex items-center justify-between py-4 sm:py-5 transition-colors"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className={`text-[11px] tracking-[0.2em] font-light ${
                      active ? "text-[#5d100a] font-semibold" : "text-[#ffffff]/45"
                    }`}
                  >
                    {indexStr}
                  </span>
                  <span className="heading-serif text-2xl sm:text-3xl uppercase tracking-wider font-normal text-[#ffffff]">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5d100a]" />
                  )}
                  <ArrowUpRight className="w-4 h-4 text-[#ffffff]/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#ffffff]" />
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom: Quick Actions & Seasonal Stamp */}
      <div className="space-y-5">
        <div className="nav-menu-footer grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              navMenuController();
              setIsBagOpen(true);
            }}
            className="flex items-center justify-center gap-2.5 border border-[#ffffff]/20 py-3 text-xs uppercase tracking-[0.18em] text-[#ffffff] hover:bg-[#ffffff] hover:text-[#1b1717] transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
            <span>Bag ({bagCount})</span>
          </button>

          <Link
            href="/account"
            onClick={navMenuController}
            className="flex items-center justify-center gap-2.5 border border-[#ffffff]/20 py-3 text-xs uppercase tracking-[0.18em] text-[#ffffff] hover:bg-[#ffffff] hover:text-[#1b1717] transition-colors"
          >
            <User className="w-4 h-4 stroke-[1.5]" />
            <span>Account</span>
          </Link>
        </div>

        <div className="nav-menu-footer flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#ffffff]/45 pt-2">
          <span>{seasonAndYear}</span>
          <span>Kolkata • Mumbai • Delhi</span>
        </div>
      </div>
    </div>
  );
}