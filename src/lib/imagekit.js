import { api, getApiErrorMessage } from "./api";

const IK_ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "").replace(/\/$/, "");
const IK_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";
const ALLOWED_REVIEW_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isImageKitUrl(src) {
  return Boolean(src && typeof src === "string" && src.includes("ik.imagekit.io"));
}

/**
 * Dynamically transforms ImageKit URLs with width, optional height, quality,
 * c-at_max (never upscales), and f-auto (AVIF/WebP).
 */
export function ikUrl(src, { width = 800, height = null, quality = 80 } = {}) {
  if (!src) return "";
  if (!isImageKitUrl(src)) return src;

  const clean = src.split("?")[0];
  const parts = [`w-${width}`];
  if (height) parts.push(`h-${height}`);
  parts.push("c-at_max", `q-${quality}`, "f-auto");
  return `${clean}?tr=${parts.join(",")}`;
}

/**
 * Generates a tiny (~1-2 KB) blurred Low-Quality Image Placeholder (LQIP) URL
 * via ImageKit's edge blur transform so high-res PDP/card images fade in smoothly.
 */
export function ikBlurUrl(src, { width = 48, quality = 20, blur = 8 } = {}) {
  if (!src || !isImageKitUrl(src)) return null;
  const clean = src.split("?")[0];
  return `${clean}?tr=w-${width},q-${quality},bl-${blur},f-auto`;
}

/**
 * Generates an HTML responsive srcSet string for ImageKit assets so mobile,
 * tablet, and desktop screens each download the exact optimal resolution.
 */
export function ikSrcSet(src, widths = [320, 480, 640, 960, 1280], quality = 80) {
  if (!isImageKitUrl(src)) return undefined;
  return widths.map((w) => `${ikUrl(src, { width: w, quality })} ${w}w`).join(", ");
}

async function uploadToImageKit({ file, authEndpoint, folder, prefix }) {
  if (!IK_PUBLIC_KEY) {
    throw new Error("ImageKit public key is not configured in client/.env.local");
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error("Only image or video files are allowed");
  }

  const { data: authRes } = await api.get(authEndpoint);
  const { token, expire, signature } = authRes.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", `${prefix}_${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
  formData.append("folder", folder);
  formData.append("publicKey", IK_PUBLIC_KEY);
  formData.append("token", token);
  formData.append("expire", String(expire));
  formData.append("signature", signature);

  const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`ImageKit upload failed: ${errText}`);
  }

  const uploaded = await uploadRes.json();
  return {
    url: uploaded.url || `${IK_ENDPOINT}${uploaded.filePath}`,
    fileId: uploaded.fileId,
  };
}

export async function uploadReviewImageToImageKit(file) {
  if (!ALLOWED_REVIEW_MIMES.has(file.type)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed for reviews");
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("Each review image must be under 3 MB");
  }

  try {
    const { data } = await api.post("/media/review-upload", file, {
      headers: { "Content-Type": file.type },
    });
    return data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err, "Review image upload failed."));
  }
}

export function uploadAdminImageToImageKit(file, folder = "/divara/products") {
  return uploadToImageKit({
    file,
    authEndpoint: "/media/imagekit-auth",
    folder,
    prefix: "divara",
  });
}

export async function deleteAdminImageFromImageKit(fileId) {
  if (!fileId) return;
  try {
    await api.delete(`/media/${encodeURIComponent(fileId)}`);
  } catch {
    // Non-blocking cleanup
  }
}