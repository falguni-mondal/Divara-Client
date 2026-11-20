const BASE_URL = "https://divara.byfalguni.com";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export default async function sitemap() {
  const staticRoutes = [
    "",
    "/collections",
    "/craftsmanship",
    "/contact",
    "/policies/privacy-policy",
    "/policies/terms-of-service",
    "/policies/shipping-policy",
    "/policies/return-policy",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/collections" ? "daily" : "monthly",
    priority: path === "" ? 1.0 : path === "/collections" ? 0.9 : 0.6,
  }));

  try {
    const res = await fetch(`${API_URL}/products?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return staticRoutes;
    const json = await res.json();
    const items = json?.data?.items || [];

    const productRoutes = items.map((p) => ({
      url: `${BASE_URL}/shop/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}