import { Suspense } from "react";
import { connection } from "next/server";
import ProductDetailClient from "./ProductDetailClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const SITE_URL = "https://divara.byfalguni.com";

function toOgJpgUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  if (rawUrl.includes("ik.imagekit.io")) {
    const clean = rawUrl.split("?")[0];
    // Pad 3:4 fashion portrait onto a luxury ivory 1200x630 JPG (<150 KB, never crops head/hem)
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
  "use cache";
  try {
    const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
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

  if (!product) {
    return {
      title: "Garment Details",
      description: "Explore handcrafted Indian luxury fashion at Divara.",
    };
  }

  const priceText = formatPriceInr(product.price);
  const title = priceText ? `${product.title} — ${priceText}` : product.title;
  const rawDesc =
    product.description ||
    `${product.title} in ${product.fabric || "luxury fabric"} (${product.color || "Signature"}). Handcrafted by Divara.`;
  const description =
    rawDesc.length > 158 ? `${rawDesc.slice(0, 155).trim()}...` : rawDesc;

  const ogImageUrl = toOgJpgUrl(product.image || product.gallery?.[0]);
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
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: product.title,
                type: "image/jpeg",
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Divara`,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

// Signals to Next.js 16.4 Cache Components that this dynamic product route intentionally
// resolves per-slug metadata at request time alongside the client PDP shell.
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