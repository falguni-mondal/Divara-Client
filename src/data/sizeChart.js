/**
 * DIVARA Category-Aware Size System & Garment Measurement Engine
 *
 * Categories & Size Systems:
 * - saree                                      -> ["Free Size"]
 * - denim, trouser                             -> ["26", "28", "30", "32", "34", "36"] (also supports legacy XS-XXL fallback)
 * - dress, kurta, lehenga                      -> ["XS", "S", "M", "L", "XL", "XXL"]
 * - shirt, sweatshirt, jacket, knitwear        -> ["XS", "S", "M", "L", "XL", "XXL"]
 */

export const ALL_VALID_SIZES = [
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
];

export const ALPHA_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const WAIST_SIZES = ["26", "28", "30", "32", "34", "36"];

export const CATEGORY_SIZE_SYSTEM = {
  saree: {
    type: "free",
    label: "Standard Drape (Free Size)",
    sizes: ["Free Size"],
    defaultSizes: ["Free Size"],
    fitNote:
      "Includes a full 5.5 m drape and 0.9 m matching unstitched blouse fabric suitable for custom tailoring across 32\"–42\" bust.",
  },
  dress: {
    type: "alpha",
    label: "Indian Dress Sizing (XS–XXL)",
    sizes: ALPHA_SIZES,
    defaultSizes: ["XS", "S", "M", "L", "XL"],
    fitNote:
      "Tailored for an effortless contoured silhouette with ~1.5\"–2\" ease at the bust. Size up if between two measurements.",
  },
  kurta: {
    type: "alpha",
    label: "Indian Ethnic Sizing (XS–XXL)",
    sizes: ALPHA_SIZES,
    defaultSizes: ["XS", "S", "M", "L", "XL", "XXL"],
    fitNote:
      "Cut with traditional Indian ethnic ease (~2\" garment ease over body bust) for breathable all-day drape.",
  },
  lehenga: {
    type: "alpha",
    label: "Couture Lehenga & Choli Sizing (XS–XXL)",
    sizes: ALPHA_SIZES,
    defaultSizes: ["XS", "S", "M", "L", "XL"],
    fitNote:
      "High-waist lehenga skirt with concealed side zipper and drawstring adjustment; choli includes 1.5\" inner seam allowance.",
  },
  shirt: {
    type: "alpha",
    label: "Tailored Shirt Sizing (XS–XXL)",
    sizes: ALPHA_SIZES,
    defaultSizes: ["XS", "S", "M", "L", "XL"],
    fitNote:
      "Relaxed luxury tailoring across the shoulder and chest. True to size for a clean drape.",
  },
  sweatshirt: {
    type: "alpha",
    label: "Relaxed Sweatshirt Sizing (XS–XXL)",
    sizes: ALPHA_SIZES,
    defaultSizes: ["XS", "S", "M", "L", "XL", "XXL"],
    fitNote:
      "Designed with a slightly relaxed drop-shoulder fit for layering. Take your regular size or size down for a closer fit.",
  },
  jacket: {
    type: "alpha",
    label: "Outerwear & Jacket Sizing (XS–XXL)",
    sizes: ALPHA_SIZES,
    defaultSizes: ["XS", "S", "M", "L", "XL"],
    fitNote:
      "Structured outerwear cut with room for light knitwear or shirts underneath.",
  },
  knitwear: {
    type: "alpha",
    label: "Knitwear Sizing (XS–XXL)",
    sizes: ALPHA_SIZES,
    defaultSizes: ["XS", "S", "M", "L", "XL"],
    fitNote:
      "Natural knit stretch adapts comfortably to your silhouette; measurements shown are unstretched flat-lay equivalents.",
  },
  denim: {
    type: "waist",
    label: "Waist Sizing (26–36)",
    sizes: WAIST_SIZES,
    defaultSizes: ["26", "28", "30", "32", "34"],
    fitNote:
      "Mid-to-high rise tailored denim. If you prefer a relaxed fit through the hip and thigh, choose one waist size up.",
  },
  trouser: {
    type: "waist",
    label: "Waist Sizing (26–36)",
    sizes: WAIST_SIZES,
    defaultSizes: ["26", "28", "30", "32", "34"],
    fitNote:
      "High-waisted fluid drape trousers with clean front pleats. Measure at your natural waist for the most accurate fit.",
  },
};

export function getSizeSystemForCategory(category) {
  return (
    CATEGORY_SIZE_SYSTEM[String(category || "").toLowerCase()] ||
    CATEGORY_SIZE_SYSTEM.dress
  );
}

export function getAllowedSizesForCategory(category) {
  return getSizeSystemForCategory(category).sizes;
}

export function getDefaultSizesForCategory(category) {
  return getSizeSystemForCategory(category).defaultSizes;
}

// Base Indian women's measurements in inches (garment/body guidance)
const ETHNIC_DRESS_IN = {
  XS: { bust: 32, waist: 26, hip: 35, shoulder: 13.5 },
  S: { bust: 34, waist: 28, hip: 37, shoulder: 14.0 },
  M: { bust: 36, waist: 30, hip: 39, shoulder: 14.5 },
  L: { bust: 38, waist: 32, hip: 41, shoulder: 15.0 },
  XL: { bust: 40, waist: 34, hip: 43, shoulder: 15.5 },
  XXL: { bust: 42, waist: 36, hip: 45, shoulder: 16.0 },
};

const DRESS_LENGTH_IN = { XS: 44, S: 45, M: 46, L: 47, XL: 48, XXL: 48 };
const KURTA_LENGTH_IN = { XS: 43, S: 44, M: 45, L: 46, XL: 47, XXL: 47 };
const LEHENGA_SKIRT_LENGTH_IN = { XS: 41, S: 42, M: 42, L: 43, XL: 43, XXL: 43 };

const TOP_GARMENT_IN = {
  shirt: {
    XS: { chest: 34, waist: 30, shoulder: 14.0, length: 25.5, sleeve: 22.5 },
    S: { chest: 36, waist: 32, shoulder: 14.5, length: 26.0, sleeve: 23.0 },
    M: { chest: 38, waist: 34, shoulder: 15.0, length: 26.5, sleeve: 23.5 },
    L: { chest: 40, waist: 36, shoulder: 15.5, length: 27.5, sleeve: 24.0 },
    XL: { chest: 42, waist: 38, shoulder: 16.0, length: 28.0, sleeve: 24.5 },
    XXL: { chest: 44, waist: 40, shoulder: 16.5, length: 28.5, sleeve: 25.0 },
  },
  sweatshirt: {
    XS: { chest: 38, waist: 34, shoulder: 17.5, length: 25.0, sleeve: 22.5 },
    S: { chest: 40, waist: 36, shoulder: 18.0, length: 26.0, sleeve: 23.0 },
    M: { chest: 42, waist: 38, shoulder: 18.5, length: 27.0, sleeve: 23.5 },
    L: { chest: 44, waist: 40, shoulder: 19.5, length: 28.0, sleeve: 24.0 },
    XL: { chest: 46, waist: 42, shoulder: 20.5, length: 29.0, sleeve: 24.5 },
    XXL: { chest: 48, waist: 44, shoulder: 21.5, length: 30.0, sleeve: 25.0 },
  },
  jacket: {
    XS: { chest: 36, waist: 32, shoulder: 14.5, length: 23.5, sleeve: 23.0 },
    S: { chest: 38, waist: 34, shoulder: 15.0, length: 24.0, sleeve: 23.5 },
    M: { chest: 40, waist: 36, shoulder: 15.5, length: 24.5, sleeve: 24.0 },
    L: { chest: 42, waist: 38, shoulder: 16.0, length: 25.5, sleeve: 24.5 },
    XL: { chest: 44, waist: 40, shoulder: 16.5, length: 26.0, sleeve: 25.0 },
    XXL: { chest: 46, waist: 42, shoulder: 17.0, length: 26.5, sleeve: 25.5 },
  },
  knitwear: {
    XS: { chest: 34, waist: 30, shoulder: 14.0, length: 23.0, sleeve: 22.5 },
    S: { chest: 36, waist: 32, shoulder: 14.5, length: 23.5, sleeve: 23.0 },
    M: { chest: 38, waist: 34, shoulder: 15.0, length: 24.5, sleeve: 23.5 },
    L: { chest: 40, waist: 36, shoulder: 15.5, length: 25.0, sleeve: 24.0 },
    XL: { chest: 42, waist: 38, shoulder: 16.0, length: 26.0, sleeve: 24.5 },
    XXL: { chest: 44, waist: 40, shoulder: 16.5, length: 26.5, sleeve: 25.0 },
  },
};

const BOTTOMS_WAIST_IN = {
  "26": { waist: [26, 27], hip: [35, 36], rise: 10.5, inseam: 30.0, outseam: 40.5, uk: "UK 8" },
  "28": { waist: [28, 29], hip: [37, 38], rise: 11.0, inseam: 30.0, outseam: 41.0, uk: "UK 10" },
  "30": { waist: [30, 31], hip: [39, 40], rise: 11.2, inseam: 30.5, outseam: 41.5, uk: "UK 12" },
  "32": { waist: [32, 33], hip: [41, 42], rise: 11.5, inseam: 30.5, outseam: 42.0, uk: "UK 14" },
  "34": { waist: [34, 35], hip: [43, 44], rise: 12.0, inseam: 31.0, outseam: 42.5, uk: "UK 16" },
  "36": { waist: [36, 37], hip: [45, 46], rise: 12.5, inseam: 31.0, outseam: 43.0, uk: "UK 18" },
};

// Map legacy alpha sizes on denim/trouser products cleanly to waist equivalents
const ALPHA_TO_WAIST_FALLBACK = {
  XS: "26",
  S: "28",
  M: "30",
  L: "32",
  XL: "34",
  XXL: "36",
};

function fmtValue(valIn, unit = "in") {
  if (Array.isArray(valIn)) {
    const [a, b] = valIn;
    if (unit === "cm") {
      return `${Math.round(a * 2.54)}–${Math.round(b * 2.54)} cm`;
    }
    return `${a}–${b}"`;
  }
  if (unit === "cm") {
    return `${(valIn * 2.54).toFixed(1).replace(/\.0$/, "")} cm`;
  }
  return `${valIn}"`;
}

/**
 * Returns structured measurements for any (category, size, unit) combination
 * so the PDP and Admin form can display instant size help.
 */
export function getSizeMeasurements(category, size, unit = "in") {
  const cat = String(category || "dress").toLowerCase();
  const sz = String(size || "").trim();
  const sys = getSizeSystemForCategory(cat);

  if (cat === "saree" || sz === "Free Size") {
    return {
      size: sz || "Free Size",
      subtitle: "Standard Indian Luxury Drape",
      fitNote: CATEGORY_SIZE_SYSTEM.saree.fitNote,
      metrics: [
        {
          label: "Saree Length",
          value: unit === "cm" ? "550 cm (5.5 m)" : '216" (5.5 m)',
        },
        {
          label: "Saree Width",
          value: unit === "cm" ? "112–114 cm" : '44–45"',
        },
        {
          label: "Unstitched Blouse",
          value: unit === "cm" ? "90 cm (0.9 m)" : '35" (0.9 m)',
        },
        {
          label: "Blouse Bust Fit",
          value: unit === "cm" ? "81–107 cm" : '32–42"',
        },
      ],
    };
  }

  if (cat === "denim" || cat === "trouser" || BOTTOMS_WAIST_IN[sz]) {
    const mappedKey = BOTTOMS_WAIST_IN[sz] ? sz : ALPHA_TO_WAIST_FALLBACK[sz] || "30";
    const row = BOTTOMS_WAIST_IN[mappedKey];
    return {
      size: sz,
      subtitle: `${cat === "denim" ? "Denim" : "Trouser"} Waist ${mappedKey} (${row.uk})`,
      fitNote: sys.fitNote,
      metrics: [
        { label: "Waist", value: fmtValue(row.waist, unit) },
        { label: "Hip", value: fmtValue(row.hip, unit) },
        { label: "Front Rise", value: fmtValue(row.rise, unit) },
        { label: "Inseam", value: fmtValue(row.inseam, unit) },
        { label: "Outseam", value: fmtValue(row.outseam, unit) },
      ],
    };
  }

  if (TOP_GARMENT_IN[cat]) {
    const row = TOP_GARMENT_IN[cat][sz] || TOP_GARMENT_IN[cat].M;
    return {
      size: sz,
      subtitle: `${sys.label}`,
      fitNote: sys.fitNote,
      metrics: [
        { label: "Chest / Bust", value: fmtValue(row.chest, unit) },
        { label: "Waist", value: fmtValue(row.waist, unit) },
        { label: "Shoulder", value: fmtValue(row.shoulder, unit) },
        { label: "Garment Length", value: fmtValue(row.length, unit) },
        { label: "Sleeve Length", value: fmtValue(row.sleeve, unit) },
      ],
    };
  }

  // Dress, Kurta, Lehenga
  const base = ETHNIC_DRESS_IN[sz] || ETHNIC_DRESS_IN.M;
  const lengthLabel =
    cat === "lehenga"
      ? "Skirt Length"
      : cat === "kurta"
      ? "Kurta Length"
      : "Dress Length";
  const lengthIn =
    cat === "lehenga"
      ? LEHENGA_SKIRT_LENGTH_IN[sz] || 42
      : cat === "kurta"
      ? KURTA_LENGTH_IN[sz] || 45
      : DRESS_LENGTH_IN[sz] || 46;

  return {
    size: sz,
    subtitle: sys.label,
    fitNote: sys.fitNote,
    metrics: [
      { label: "Bust", value: fmtValue(base.bust, unit) },
      { label: "Waist", value: fmtValue(base.waist, unit) },
      { label: "Hip", value: fmtValue(base.hip, unit) },
      { label: "Shoulder", value: fmtValue(base.shoulder, unit) },
      { label: lengthLabel, value: fmtValue(lengthIn, unit) },
    ],
  };
}