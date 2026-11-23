"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User, Search } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextLogo } from "@/components/ui/BrandLogo";
import AnimatedNavLink from "@/components/ui/AnimatedNavLink";
import NavMenu from "@/components/layout/NavMenu";
import SearchOverlay from "@/components/layout/SearchOverlay";
import { useShop } from "@/context/ShopContext";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collection", href: "/collections" },
  { label: "About", href: "/craftsmanship" },
  { label: "Contact Us", href: "/contact" },
];

function NavbarInner() {
  const [showNav, setShowNav] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  const { bagCount, setIsBagOpen, isAdmin } = useShop();
  const logoContainerRef = useRef(null);

  const navMenuController = () => {
    setShowNav((prev) => !prev);
  };

  useEffect(() => {
    setShowNav(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Allow NIRA AI overlay command ("open search") to trigger SearchOverlay
  useEffect(() => {
    const onOpenSearch = () => setIsSearchOpen(true);
    window.addEventListener("divara:open-search", onOpenSearch);
    return () => window.removeEventListener("divara:open-search", onOpenSearch);
  }, []);

  const isLinkActive = (href) => {
    if (href === "/") return pathname === "/";
    if (href === "/collections") {
      return pathname === "/collections" || pathname?.startsWith("/shop/");
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  useGSAP(
    () => {
      const logoEl = logoContainerRef.current;
      if (!logoEl) return;

      if (pathname !== "/") {
        gsap.set(logoEl, { opacity: 1 });
        return;
      }

      gsap.set(logoEl, { opacity: 0 });

      let logoTween = null;
      const initTimer = setTimeout(() => {
        if (!logoContainerRef.current) return;

        logoTween = gsap.fromTo(
          logoContainerRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            ease: "none",
            immediateRender: false,
            scrollTrigger: {
              trigger: document.body,
              start: "200px top",
              end: "320px top",
              scrub: true,
              invalidateOnRefresh: true,
              onLeaveBack: () => {
                if (logoContainerRef.current) {
                  gsap.set(logoContainerRef.current, { opacity: 0 });
                }
              },
            },
          }
        );

        ScrollTrigger.refresh();
      }, 180);

      return () => {
        clearTimeout(initTimer);
        if (logoTween) {
          logoTween.scrollTrigger?.kill();
          logoTween.kill();
        }
      };
    },
    { dependencies: [pathname], revertOnUpdate: true }
  );

  return (
    <>
      <header
        id="navbar-container"
        className="w-full fixed top-0 left-0 flex justify-center items-center z-[999] bg-transparent mix-blend-difference text-[#ffffff]"
      >
        <div
          id="mobile-navbar"
          className="navbar w-full max-w-[1440px] flex justify-between items-center px-3 sm:px-6 lg:px-10 h-[45px] sm:h-[56px] bg-transparent"
        >
          <div
            ref={logoContainerRef}
            style={{ opacity: pathname === "/" ? 0 : 1 }}
            className="logo-container"
          >
            <Link href="/" aria-label="DIVARA Home">
              <TextLogo className="w-[82px] sm:w-[92px]" fill="#ffffff" />
            </Link>
          </div>

          <nav
            aria-label="Desktop Navigation"
            className="hidden lg:flex items-center gap-9 text-[12px] uppercase tracking-[0.14em] text-[#ffffff]"
          >
            {NAV_LINKS.map((link) => (
              <AnimatedNavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isLinkActive(link.href)}
                underlineColor="bg-[#ffffff]"
              />
            ))}
          </nav>

          <div className="nav-container flex gap-5 items-center">
            <nav className="flex gap-4 sm:gap-5 items-center text-[#ffffff]">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Open Search"
                className="flex items-center cursor-pointer"
              >
                <Search className="w-[18px] h-[18px] stroke-[1.5]" />
              </button>

              <Link
                href="/account"
                aria-label={isAdmin ? "Admin Console" : "Account"}
                className="flex items-center"
              >
                <User className="w-[18px] h-[18px] stroke-[1.5]" />
              </Link>

              <button
                type="button"
                disabled={isAdmin}
                onClick={() => !isAdmin && setIsBagOpen(true)}
                aria-label={isAdmin ? "Shopping Bag disabled for Admin" : "Shopping Bag"}
                title={isAdmin ? "Shopping Bag is disabled for Admin accounts" : "Shopping Bag"}
                className={`relative flex items-center ${
                  isAdmin ? "opacity-35 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <ShoppingBag className="w-[18px] h-[18px] stroke-[1.5]" />
                {!isAdmin && bagCount > 0 && (
                  <span className="ml-1 text-[10px] font-medium">({bagCount})</span>
                )}
              </button>
            </nav>

            <button
              type="button"
              onClick={navMenuController}
              aria-label="Toggle Mobile Menu"
              className="lg:hidden relative h-[45px] w-[26px] cursor-pointer"
              id="nav-hamburger"
            >
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 h-[1.5px] w-full block transition-all duration-500 ease-out -translate-y-[3.5px] bg-[#ffffff]" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 h-[1.5px] w-full block transition-all duration-500 ease-out translate-y-[3.5px] bg-[#ffffff]" />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <NavMenu
        showNav={showNav}
        navMenuController={navMenuController}
        navLinks={NAV_LINKS}
        pathname={pathname}
      />
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarInner />
    </Suspense>
  );
}