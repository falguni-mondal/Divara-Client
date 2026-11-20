"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PRODUCTS, formatINR } from "@/data/catalogData";
import { useShop } from "@/context/ShopContext";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useSeasonAndYear } from "@/utils/season";
import { api } from "@/lib/api";
import { ikUrl } from "@/lib/imagekit";
import ProductReviews from "@/components/shop/ProductReviews";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function ProductDetailContent() {
  const params = useParams();
  const slug = params?.slug;

  const fallbackProduct =
    PRODUCTS.find((p) => p.slug === slug) || PRODUCTS[0];

  const [product, setProduct] = useState(fallbackProduct);
  const [relatedProducts, setRelatedProducts] = useState(
    PRODUCTS.filter((p) => p.id !== fallbackProduct.id).slice(0, 4)
  );
  const [activeImage, setActiveImage] = useState(fallbackProduct.image);
  const [selectedSize, setSelectedSize] = useState(fallbackProduct.sizes[0]);
  const [openAccordion, setOpenAccordion] = useState("details");

  const { addToBag } = useShop();
  const { refreshScroll } = useSmoothScroll();
  const { seasonAndYear } = useSeasonAndYear();
  const pageRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;

    api
      .get(`/products/${slug}`)
      .then(({ data }) => {
        if (!active || !data.data?.product) return;
        const live = data.data.product;
        setProduct(live);
        setActiveImage(live.image);
        setSelectedSize(live.sizes?.[0] || "M");
        if (data.data.related?.length > 0) {
          setRelatedProducts(data.data.related);
        }
      })
      .catch(() => {
        if (!active) return;
        const local = PRODUCTS.find((p) => p.slug === slug) || PRODUCTS[0];
        setProduct(local);
        setActiveImage(local.image);
        setSelectedSize(local.sizes[0]);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useGSAP(
    () => {
      gsap.fromTo(
        ".pdp-reveal",
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger: 0.08, ease: "power3.out" }
      );

      gsap.fromTo(
        ".pdp-related-reveal",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".pdp-related-section",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: pageRef, dependencies: [product.slug] }
  );

  const handleToggleAccordion = (id) => {
    setOpenAccordion((prev) => (prev === id ? "" : id));
    setTimeout(() => refreshScroll(), 320);
  };

  const accordionSections = [
    {
      id: "details",
      title: "Product Details",
      content: (product.craftNotes || []).join(" "),
    },
    {
      id: "shipping",
      title: "Shipping & Returns",
      content:
        "Complimentary insured shipping across India within 5 to 7 business days. Easy 7-day returns and size exchanges on unworn items.",
    },
    {
      id: "care",
      title: "Fabric & Care",
      content: `${product.fabric} in ${product.color}. Professional dry clean recommended. Store away from direct sunlight.`,
    },
  ];

  return (
    <div
      ref={pageRef}
      className="w-full min-h-screen bg-[#ffffff] text-[#1b1717] pt-20 lg:pt-28 pb-16 lg:pb-24"
    >
      <div className="max-w-[1440px] mx-auto px-[3vw] lg:px-10">
        <div className="pdp-reveal mb-6">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#1b1717]/70 hover:text-[#5d100a] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Collection</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="pdp-reveal lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-visible">
              {(product.gallery || [product.image]).map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`shrink-0 w-16 sm:w-20 aspect-[3/4] overflow-hidden border transition-all cursor-pointer ${
                    activeImage === img
                      ? "border-[#5d100a]"
                      : "border-transparent opacity-65 hover:opacity-100"
                  }`}
                >
                  <img
                    src={ikUrl(img, { width: 220 })}
                    alt={`${product.title} view ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex-1 aspect-[3/4] overflow-hidden bg-[#1b1717]/5">
              <img
                src={ikUrl(activeImage || product.image, { width: 1200 })}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <span className="pdp-reveal text-xs uppercase tracking-widest text-[#5d100a] font-semibold">
              {product.categoryLabel} • {product.season} ({seasonAndYear})
            </span>

            <h1 className="pdp-reveal heading-serif text-2xl sm:text-3xl lg:text-[32px] font-normal mt-2 text-[#1b1717]">
              {product.title}
            </h1>

            <p className="pdp-reveal mt-3 text-lg sm:text-xl font-medium text-[#1b1717]">
              {formatINR(product.price)}
            </p>
            <span className="pdp-reveal text-[11px] text-[#1b1717]/55">
              Inclusive of all taxes
            </span>

            <p className="pdp-reveal mt-5 text-xs sm:text-sm font-light leading-relaxed text-[#1b1717]/80">
              {product.description}
            </p>

            <div className="pdp-reveal mt-6 flex items-center gap-6 border-y border-[#1b1717]/15 py-3.5 text-xs">
              <div>
                <span className="uppercase tracking-wider text-[#1b1717]/55 mr-2">Color:</span>
                <span className="font-medium">{product.color}</span>
              </div>
              <div>
                <span className="uppercase tracking-wider text-[#1b1717]/55 mr-2">Fabric:</span>
                <span className="font-medium">{product.fabric}</span>
              </div>
            </div>

            <div className="pdp-reveal mt-6">
              <span className="block text-xs uppercase tracking-widest text-[#1b1717]/75 mb-2.5">
                Select Size
              </span>
              <div className="flex flex-wrap gap-2">
                {(product.sizes || []).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 text-xs uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer ${
                      selectedSize === size
                        ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a]"
                        : "border-[#1b1717]/25 text-[#1b1717] hover:border-[#1b1717]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp-reveal mt-8">
              <button
                type="button"
                onClick={() => addToBag(product, selectedSize)}
                className="w-full py-3.5 px-6 text-xs uppercase tracking-widest font-semibold bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] transition-colors duration-300 rounded-[2px] cursor-pointer"
              >
                Add to Bag — {formatINR(product.price)}
              </button>
            </div>

            <div className="pdp-reveal mt-8 divide-y divide-[#1b1717]/15 border-y border-[#1b1717]/15">
              {accordionSections.map((sec) => {
                const isOpen = openAccordion === sec.id;
                return (
                  <div key={sec.id}>
                    <button
                      type="button"
                      onClick={() => handleToggleAccordion(sec.id)}
                      className="w-full py-3.5 flex items-center justify-between text-left text-xs uppercase tracking-widest font-medium cursor-pointer"
                    >
                      <span>{sec.title}</span>
                      <Plus
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${
                          isOpen ? "rotate-45 text-[#5d100a]" : "rotate-0"
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="pb-4 text-xs font-light leading-relaxed text-[#1b1717]/75">
                          {sec.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Authenticated Ratings & Reviews with Max 3 ImageKit Photos */}
        <ProductReviews productSlug={product.slug} />

        {/* Related Items */}
        <div className="pdp-related-section mt-20 border-t border-[#1b1717]/15 pt-12">
          <h2 className="pdp-related-reveal heading-serif text-xl sm:text-2xl font-normal mb-6">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/shop/${item.slug}`}
                className="pdp-related-reveal group flex flex-col"
              >
                <div className="w-full aspect-[3/4] overflow-hidden bg-[#1b1717]/5">
                  <img
                    src={ikUrl(item.image, { width: 600 })}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="heading-serif text-sm sm:text-base font-normal mt-2.5 group-hover:text-[#5d100a] transition-colors">
                  {item.title}
                </h3>
                <span className="text-xs font-medium text-[#1b1717]/80 mt-0.5">
                  {formatINR(item.price)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#ffffff]" />}>
      <ProductDetailContent />
    </Suspense>
  );
}