export const CATEGORIES = [
  {
    id: "saree",
    title: "Sarees",
    poster: "/images/saree_poster.webp",
    path: "/collections?category=saree",
  },
  {
    id: "dress",
    title: "Dresses",
    poster: "/images/dress_poster.webp",
    path: "/collections?category=dress",
  },
  {
    id: "denim",
    title: "Denim Wears",
    poster: "/images/denim_poster.webp",
    path: "/collections?category=denim",
  },
  {
    id: "shirt",
    title: "Shirts",
    poster: "/images/shirt_poster.webp",
    path: "/collections?category=shirt",
  },
];

/**
 * Shared outfit intelligence for AdminProductsTab & Collections filters.
 */
export const CATEGORY_CONFIG = [
  {
    value: "saree",
    label: "Sarees",
    code: "SAR",
    freeSizeOnly: true,
    defaultFabric: "Silk",
    defaultSeason: "Winter",
    defaultPrice: 38500,
    recommendedFabrics: ["Silk", "Chanderi", "Velvet", "Organza", "Linen", "Cotton"],
    disallowedFabrics: ["Cotton Denim", "Cotton Fleece", "French Terry"],
    craftTemplate: (fabric, color) => [
      `Handloom ${color.toLowerCase()} ${fabric.toLowerCase()} woven with artisanal zari detailing`,
      "Includes 5.5m saree with matching 0.9m unstitched blouse piece",
      "Dry clean only; store folded in unbleached muslin cloth away from direct moisture",
    ],
  },
  {
    value: "dress",
    label: "Dresses",
    code: "DRS",
    freeSizeOnly: false,
    defaultFabric: "Velvet",
    defaultSeason: "Winter",
    defaultPrice: 32500,
    recommendedFabrics: ["Velvet", "Silk", "Chanderi", "Organza", "Linen", "Cotton"],
    disallowedFabrics: ["Cotton Fleece"],
    craftTemplate: (fabric, color) => [
      `Tailored in luxury ${color.toLowerCase()} ${fabric.toLowerCase()} with fluid drape`,
      "Breathable inner lining with concealed zip fastening and French seams",
      "Dry clean recommended; steam lightly from the reverse side",
    ],
  },
  {
    value: "denim",
    label: "Denim Wears",
    code: "DNM",
    freeSizeOnly: false,
    lockFabric: true,
    defaultFabric: "Cotton Denim",
    defaultSeason: "Autumn",
    defaultPrice: 24500,
    recommendedFabrics: ["Cotton Denim"],
    disallowedFabrics: [],
    craftTemplate: (_fabric, color) => [
      `13oz organic selvedge cotton denim dyed in rich ${color.toLowerCase()}`,
      "Custom brushed-metal hardware and reinforced felled seams",
      "Cold gentle wash inside-out; line dry in shade to preserve dye depth",
    ],
  },
  {
    value: "shirt",
    label: "Shirts",
    code: "SHR",
    freeSizeOnly: false,
    defaultFabric: "Silk",
    defaultSeason: "Summer",
    defaultPrice: 16500,
    recommendedFabrics: ["Silk", "Linen", "Cotton", "Chanderi", "Velvet"],
    disallowedFabrics: ["Cotton Fleece"],
    craftTemplate: (fabric, color) => [
      `Relaxed-tailored ${color.toLowerCase()} ${fabric.toLowerCase()} with natural luster`,
      "Concealed front placket, mother-of-pearl buttons, and single-needle French seams",
      "Dry clean or gentle cold hand wash; steam on low heat",
    ],
  },
  {
    value: "sweatshirt",
    label: "Sweatshirts",
    code: "SWT",
    freeSizeOnly: false,
    defaultFabric: "Cotton Fleece",
    defaultSeason: "Winter",
    defaultPrice: 12500,
    recommendedFabrics: ["Cotton Fleece", "French Terry", "Cashmere Wool", "Cotton"],
    disallowedFabrics: ["Organza", "Chanderi", "Cotton Denim"],
    craftTemplate: (fabric, color) => [
      `Heavyweight 400 GSM ${color.toLowerCase()} ${fabric.toLowerCase()} brushed for winter warmth`,
      "Structured ribbed collar, cuffs, and hem with subtle tonal atelier embroidery",
      "Cold gentle machine wash inside-out; dry flat in shade",
    ],
  },
  {
    value: "kurta",
    label: "Kurta Sets",
    code: "KRT",
    freeSizeOnly: false,
    defaultFabric: "Chanderi",
    defaultSeason: "Spring",
    defaultPrice: 22500,
    recommendedFabrics: ["Chanderi", "Silk", "Cotton", "Linen", "Velvet"],
    disallowedFabrics: ["Cotton Denim", "Cotton Fleece", "French Terry"],
    craftTemplate: (fabric, color) => [
      `Artisanal ${color.toLowerCase()} ${fabric.toLowerCase()} kurta paired with coordinated bottoms`,
      "Hand-finished neckline detailing with breathable cotton mulmul lining",
      "Dry clean recommended; steam lightly from the reverse side",
    ],
  },
  {
    value: "lehenga",
    label: "Lehengas",
    code: "LHG",
    freeSizeOnly: false,
    defaultFabric: "Silk",
    defaultSeason: "Winter",
    defaultPrice: 58500,
    recommendedFabrics: ["Silk", "Velvet", "Organza", "Chanderi"],
    disallowedFabrics: ["Cotton Denim", "Cotton Fleece", "French Terry"],
    craftTemplate: (fabric, color) => [
      `Couture multi-panel kalidar lehenga crafted in ${color.toLowerCase()} ${fabric.toLowerCase()}`,
      "Includes hand-embroidered choli and matching bordered organza or silk dupatta",
      "Professional dry clean only; store in breathable muslin garment bag",
    ],
  },
  {
    value: "jacket",
    label: "Jackets & Blazers",
    code: "JKT",
    freeSizeOnly: false,
    defaultFabric: "Velvet",
    defaultSeason: "Autumn",
    defaultPrice: 29500,
    recommendedFabrics: ["Velvet", "Cashmere Wool", "Silk", "Linen", "Cotton Denim"],
    disallowedFabrics: ["Organza"],
    craftTemplate: (fabric, color) => [
      `Structured tailored silhouette crafted in ${color.toLowerCase()} ${fabric.toLowerCase()}`,
      "Full breathable bemberg lining with hand-finished lapel and bespoke buttons",
      "Dry clean only; hang on a wide contoured wooden hanger",
    ],
  },
  {
    value: "trouser",
    label: "Trousers",
    code: "TRS",
    freeSizeOnly: false,
    defaultFabric: "Linen",
    defaultSeason: "Summer",
    defaultPrice: 14500,
    recommendedFabrics: ["Linen", "Cotton", "Silk", "Cashmere Wool", "Cotton Denim"],
    disallowedFabrics: ["Organza", "Chanderi"],
    craftTemplate: (fabric, color) => [
      `High-waisted wide-leg trousers tailored from ${color.toLowerCase()} ${fabric.toLowerCase()}`,
      "Pressed front pleats, concealed hook-and-bar closure, and deep side pockets",
      "Dry clean or gentle cold wash; steam press along crease lines",
    ],
  },
  {
    value: "knitwear",
    label: "Knitwear",
    code: "KNT",
    freeSizeOnly: false,
    defaultFabric: "Cashmere Wool",
    defaultSeason: "Winter",
    defaultPrice: 19500,
    recommendedFabrics: ["Cashmere Wool", "Cotton", "Cotton Fleece", "French Terry"],
    disallowedFabrics: ["Organza", "Chanderi", "Cotton Denim"],
    craftTemplate: (fabric, color) => [
      `Fine-gauge ${color.toLowerCase()} ${fabric.toLowerCase()} knitted for featherlight winter warmth`,
      "Fully fashioned seams with resilient rib-knit collar, cuffs, and hem",
      "Hand wash cold or dry clean; reshape and dry flat away from direct heat",
    ],
  },
];

export const COLOR_PALETTE = [
  { name: "Maroon", hex: "#5d100a" },
  { name: "Black", hex: "#1b1717" },
  { name: "Ivory", hex: "#edebdd" },
  { name: "Indigo", hex: "#26364d" },
  { name: "Gold", hex: "#b69148" },
  { name: "Emerald", hex: "#0f4c3a" },
  { name: "Blush Rose", hex: "#d8a7a7" },
  { name: "Sage", hex: "#7c8c74" },
  { name: "Rust", hex: "#9e472a" },
  { name: "Navy", hex: "#1b2845" },
  { name: "Charcoal", hex: "#3a3a3c" },
  { name: "Champagne", hex: "#e6d5b8" },
  { name: "Wine", hex: "#5b1a2e" },
  { name: "Olive", hex: "#4f583d" },
  { name: "Lavender", hex: "#9d8fb8" },
  { name: "Teal", hex: "#155e63" },
];

export const FABRIC_LIST = [
  "Silk",
  "Velvet",
  "Cotton Denim",
  "Chanderi",
  "Cotton Fleece",
  "French Terry",
  "Linen",
  "Cotton",
  "Organza",
  "Cashmere Wool",
];

export const LUXURY_PILLARS = [
  {
    heading: "The Luxury of Experience",
    paragraph:
      "Luxury is more than what you wear—it’s the experience you live. Every detail, from our designs to our packaging, is created to immerse you in a world of exclusivity.",
    image: "/images/divara_bag.webp",
  },
  {
    heading: "Crafted to Your Perfection",
    paragraph:
      "Luxury is personal, every design begins with you. From precise measurements to the finest fabric selection, our creations are tailored to embrace individuality.",
    video: "/videos/customizations.mp4",
  },
  {
    heading: "Elegance in Every Thread",
    paragraph:
      "Craftsmanship begins with precision and finishes with perfection. Every fabric, every stitch, and every detail is carefully curated to embody sophistication.",
    image: "/images/branding_cloth.webp",
  },
  {
    heading: "Draped in Timeless Grace",
    paragraph:
      "A Divara creation is more than attire—it’s a masterpiece of elegance that transcends seasons. Our designs celebrate the harmony of form, fabric, and finesse.",
    image: "/images/satin_closet.webp",
  },
];

export const FILTER_OPTIONS = {
  categories: [
    { id: "all", label: "All Types" },
    ...CATEGORY_CONFIG.map((c) => ({ id: c.value, label: c.label })),
  ],
  seasons: ["All", "Winter", "Spring", "Summer", "Autumn"],
  colors: [{ name: "All", hex: null }, ...COLOR_PALETTE],
  fabrics: ["All", ...FABRIC_LIST],
  sizes: [
    "All",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "26",
    "28",
    "30",
    "32",
    "34",
    "36",
    "Free Size",
  ],
  priceRanges: [
    { id: "all", label: "All Prices" },
    { id: "under-25k", label: "Under ₹25,000" },
    { id: "25k-45k", label: "₹25,000 – ₹45,000" },
    { id: "above-45k", label: "Above ₹45,000" },
  ],
};

export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}