export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/checkout", "/api/"],
      },
    ],
    sitemap: "https://divara.byfalguni.com/sitemap.xml",
  };
}