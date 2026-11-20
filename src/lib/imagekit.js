import { api } from "./api";

const IK_ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "").replace(/\/$/, "");
const IK_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

/**
 * Optimizes ImageKit URLs on the fly (?tr=w-900,f-auto,q-80) while leaving local /images/* paths intact.
 */
export function ikUrl(src, { width = 900, quality = 80 } = {}) {
  if (!src) return "";
  if (src.startsWith("/") || !src.includes("ik.imagekit.io")) {
    return src;
  }
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}tr=w-${width},q-${quality},f-auto`;
}

/**
 * Uploads a single user review photo directly to ImageKit using short-lived signed auth
 * params from GET /api/v1/media/review-upload-auth (private key stays on /server).
 */
export async function uploadReviewImageToImageKit(file) {
  if (!IK_PUBLIC_KEY) {
    throw new Error("ImageKit public key is not configured in client/.env.local");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files (JPG, PNG, WEBP) are allowed");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Each review image must be under 5 MB");
  }

  const { data: authRes } = await api.get("/media/review-upload-auth");
  const { token, expire, signature } = authRes.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", `review_${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
  formData.append("folder", "/divara/reviews");
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