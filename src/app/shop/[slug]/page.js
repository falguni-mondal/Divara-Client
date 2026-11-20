"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, Lock } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { formatINR } from "@/data/catalogData";
import { useShop } from "@/context/ShopContext";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useSeasonAndYear } from "@/utils/season";
import { api } from "@/lib/api";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import ProductReviews from "@/components/shop/ProductReviews";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function ProductDetailSkeleton() {
  return (
    <div className="w-full min-h-screen bg-[#ffffff] pt-20 lg:pt-28 pb-16 lg:pb-24">
      <div className="max-w-[1440px] mx-auto px-[3vw] lg:px-10">
        <div className="h-4 w-36 bg-[#1b1717]/[0.07] animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            <div className="flex sm:flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="shrink-0 w-16 sm:w-20 aspect-[3/4] bg-[#1b1717]/[0.07] animate-pulse"
                />
              ))}
            </div>
            <div className="flex-1 aspect-[3/4] bg-[#1b1717]/[0.07] animate-pulse" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="h-3.5 w-44 bg-[#1b1717]/[0.06] animate-pulse" />
            <div className="h-9 w-4/5 bg-[#1b1717]/[0.08] animate-pulse" />
            <div className="h-6 w-28 bg-[#1b1717]/[0.07] animate-pulse" />
            <div className="h-20 w-full bg-[#1b1717]/[0.05] animate-pulse" />
            <div className="flex gap-2 pt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-14 bg-[#1b1717]/[0.07] animate-pulse" />
              ))}
            </div>
            <div className="h-12 w-full bg-[#1b1717]/[0.09] animate-pulse mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function getAvailableStockForSize(product, size) {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null;
  }
  const variant = product.variants.find((v) => v.size === size);
  if (!variant) return 0;

  // Storefront DTO returns `availableStock`; raw admin docs return `stockOnHand` & `stockReserved`
  if (typeof variant.availableStock === "number") {
    return Math.max(0, variant.availableStock);
  }
  return Math.max(0, (variant.stockOnHand ?? 0) - (variant.stockReserved ?? 0));
}

function ProductDetailContent() {
  const params = useParams();
  const slug = params?.slug;

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [openAccordion, setOpenAccordion] = useState("details");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { addToBag, isAdmin } = useShop();
  const { refreshScroll } = useSmoothScroll();
  const { seasonAndYear } = useSeasonAndYear();
  const pageRef = useRef(null);
  const accordionTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (accordionTimerRef.current) clearTimeout(accordionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);

    api
      .get(`/products/${slug}`)
      .then(({ data }) => {
        if (!active) return;
        const live = data.data?.product;
        if (live) {
          setProduct(live);
          setActiveImage(live.image || live.gallery?.[0] || "");
          const firstInStockSize =
            (live.sizes || []).find((sz) => {
              const avail = getAvailableStockForSize(live, sz);
              return avail === null || avail > 0;
            }) ||
            live.sizes?.[0] ||
            "Free Size";
          setSelectedSize(firstInStockSize);
          setRelatedProducts(data.data?.related || []);
        } else {
          setProduct(null);
          setNotFound(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setProduct(null);
        setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useGSAP(
    () => {
      if (loading || !product) return;
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
    { scope: pageRef, dependencies: [product?.slug, loading] }
  );

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (notFound || !product) {
    return (
      <div className="w-full min-h-[70vh] bg-[#ffffff] text-[#1b1717] pt-36 pb-24 px-6 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] uppercase tracking-[0.24em] text-[#5d100a] font-semibold">
          Archive Notice
        </span>
        <h1 className="heading-serif text-3xl sm:text-4xl font-normal mt-2">
          Garment Not Found
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-[#1b1717]/65 max-w-md">
          This piece may have been archived or moved from our current seasonal collection.
        </p>
        <Link
          href="/collections"
          className="mt-7 px-7 py-3 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest transition-colors"
        >
          Explore Collection
        </Link>
      </div>
    );
  }

  const handleToggleAccordion = (id) => {
    setOpenAccordion((prev) => (prev === id ? "" : id));
    if (accordionTimerRef.current) clearTimeout(accordionTimerRef.current);
    accordionTimerRef.current = setTimeout(() => refreshScroll(), 320);
  };

  const selectedSizeStock = getAvailableStockForSize(product, selectedSize);
  const isOutOfStock = selectedSizeStock !== null && selectedSizeStock <= 0;

  const galleryImages =
    Array.isArray(product.gallery) && product.gallery.length > 0
      ? product.gallery
      : [product.image].filter(Boolean);

  const accordionSections = [
    {
      id: "details",
      title: "Product Details",
      content: (product.craftNotes || []).join(" ") || product.description,
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
              {galleryImages.map((img, i) => (
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
                  <ResponsiveImage
                    src={img}
                    alt={`${product.title} view ${i + 1}`}
                    preset="thumb"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex-1 aspect-[3/4] overflow-hidden bg-[#1b1717]/5">
              <ResponsiveImage
                src={activeImage || product.image}
                alt={product.title}
                preset="pdp"
                priority
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <span className="pdp-reveal text-xs uppercase tracking-widest text-[#5d100a] font-semibold">
              {product.categoryLabel || product.category} • {product.season} ({seasonAndYear})
            </span>

            <h1 className="pdp-reveal heading-serif text-2xl sm:text-3xl lg:text-[32px] font-normal mt-2 text-[#1b1717]">
              {product.title}
            </h1>

            <p className="pdp-reveal mt-3 text-lg sm:text-xl font-medium text-[#1b1717]">
              {formatINR(product.price)}
            </p>
            <span className="pdp-reveal text-[11px] text-[#1b1717]/55">
              Final MRP • Inclusive of 12% GST &amp; all taxes
            </span>

            <p className="pdp-reveal mt-5 text-xs sm:text-sm font-light leading-relaxed text-[#1b1717]/80">
              {product.description}
            </p>

            <div className="pdp-reveal mt-6 flex flex-wrap items-center gap-6 border-y border-[#1b1717]/15 py-3.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-wider text-[#1b1717]/55">Color:</span>
                {product.colorHex && (
                  <span
                    className="w-3 h-3 rounded-full border border-black/20"
                    style={{ backgroundColor: product.colorHex }}
                  />
                )}
                <span className="font-medium">{product.color}</span>
              </div>
              <div>
                <span className="uppercase tracking-wider text-[#1b1717]/55 mr-2">Fabric:</span>
                <span className="font-medium">{product.fabric}</span>
              </div>
            </div>

            <div className="pdp-reveal mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="block text-xs uppercase tracking-widest text-[#1b1717]/75">
                  Select Size
                </span>
                {selectedSizeStock !== null && (
                  <span
                    className={`text-[10px] uppercase tracking-widest ${
                      selectedSizeStock === 0
                        ? "text-[#5d100a] font-semibold"
                        : selectedSizeStock <= 3
                        ? "text-[#5d100a]"
                        : "text-[#1b1717]/55"
                    }`}
                  >
                    {selectedSizeStock === 0
                      ? "Out of Stock"
                      : selectedSizeStock <= 3
                      ? `Only ${selectedSizeStock} left`
                      : "In Stock"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(product.sizes || []).map((size) => {
                  const avail = getAvailableStockForSize(product, size);
                  const sizeSoldOut = avail !== null && avail <= 0;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isAdmin || sizeSoldOut}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 text-xs uppercase tracking-wider border rounded-[2px] transition-colors ${
                        isAdmin || sizeSoldOut
                          ? "border-[#1b1717]/15 text-[#1b1717]/35 bg-[#1b1717]/5 cursor-not-allowed line-through"
                          : selectedSize === size
                          ? "bg-[#5d100a] text-[#ffffff] border-[#5d100a] cursor-pointer"
                          : "border-[#1b1717]/25 text-[#1b1717] hover:border-[#1b1717] cursor-pointer"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pdp-reveal mt-8">
              <button
                type="button"
                disabled={isAdmin || isOutOfStock}
                onClick={() => !isAdmin && !isOutOfStock && addToBag(product, selectedSize)}
                aria-disabled={isAdmin || isOutOfStock}
                title={
                  isAdmin
                    ? "Shopping is disabled for Admin accounts"
                    : isOutOfStock
                    ? "Selected size is out of stock"
                    : "Add to Bag"
                }
                className={`w-full py-3.5 px-6 text-xs uppercase tracking-widest font-semibold rounded-[2px] transition-colors duration-300 flex items-center justify-center gap-2 ${
                  isAdmin || isOutOfStock
                    ? "bg-[#1b1717]/10 text-[#1b1717]/40 border border-[#1b1717]/20 cursor-not-allowed select-none"
                    : "bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] cursor-pointer"
                }`}
              >
                {isAdmin ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Add to Bag Disabled (Admin Mode)</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Currently Out of Stock</span>
                ) : (
                  <span>Add to Bag — {formatINR(product.price)}</span>
                )}
              </button>
              {isAdmin && (
                <p className="mt-2 text-[11px] text-[#1b1717]/55 text-center">
                  Signed in as Admin. Switch to a customer account to test bag or checkout.
                </p>
              )}
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

        <ProductReviews productSlug={product.slug} />

        {relatedProducts.length > 0 && (
          <div className="pdp-related-section mt-20 border-t border-[#1b1717]/15 pt-12">
            <h2 className="pdp-related-reveal heading-serif text-xl sm:text-2xl font-normal mb-6">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((item) => (
                <Link
                  key={item._id || item.id || item.slug}
                  href={`/shop/${item.slug}`}
                  className="pdp-related-reveal group flex flex-col"
                >
                  <div className="w-full aspect-[3/4] overflow-hidden bg-[#1b1717]/5">
                    <ResponsiveImage
                      src={item.image || item.gallery?.[0]}
                      alt={item.title}
                      preset="card"
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
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailContent />
    </Suspense>
  );
}