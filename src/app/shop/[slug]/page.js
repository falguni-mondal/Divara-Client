import { Suspense } from "react";
import { connection } from "next/server";
import ProductDetailClient from "./ProductDetailClient";

const SITE_URL = "https://divara.byfalguni.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://divaraapi.byfalguni.com/api/v1"
    : "http://localhost:5000/api/v1");

function toOgJpgUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  if (rawUrl.includes("ik.imagekit.io")) {
    const clean = rawUrl.split("?")[0];
    return `${clean}?tr=w-1200,h-630,cm-pad_resize,bg-F7F5F2,q-82,f-jpg`;
  }
  return rawUrl.startsWith("http") ? rawUrl : null;
}

function formatPriceInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `₹${n.toLocaleString("en-IN")}`;
}

async function fetchProductMeta(slug) {
  try {
    const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.product || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await fetchProductMeta(slug);
  const fallbackImg = `${SITE_URL}/opengraph-image`;

  if (!product) {
    return {
      title: "Garment Details",
      description: "Explore handcrafted Indian luxury fashion at Divara.",
      openGraph: {
        title: "Divara — Limitless Luxury",
        description: "Explore handcrafted Indian luxury fashion at Divara.",
        url: `${SITE_URL}/shop/${slug}`,
        images: [{ url: fallbackImg, width: 1200, height: 630, alt: "Divara" }],
      },
      twitter: {
        card: "summary_large_image",
        images: [fallbackImg],
      },
    };
  }

  const priceText = formatPriceInr(product.price);
  const title = priceText ? `${product.title} — ${priceText}` : product.title;
  const rawDesc =
    product.description ||
    `${product.title} in ${product.fabric || "luxury fabric"} (${product.color || "Signature"}). Handcrafted by Divara.`;
  const description =
    rawDesc.length > 158 ? `${rawDesc.slice(0, 155).trim()}...` : rawDesc;

  const ogImageUrl = toOgJpgUrl(product.image || product.gallery?.[0]) || fallbackImg;
  const productUrl = `${SITE_URL}/shop/${product.slug || slug}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Divara`,
      description,
      url: productUrl,
      siteName: "Divara",
      type: "website",
      locale: "en_IN",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Divara`,
      description,
      images: [ogImageUrl],
    },
  };
}

async function DynamicRouteMarker() {
  await connection();
  return null;
}

export default function ProductDetailRoute() {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicRouteMarker />
      </Suspense>
      <ProductDetailClient />
    </>
  );
}