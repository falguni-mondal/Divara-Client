import { api } from "./api";

const IK_ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "").replace(/\/$/, "");
const IK_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

export function ikUrl(src, { width = 900, quality = 80 } = {}) {
  if (!src) return "";
  if (src.startsWith("/") || !src.includes("ik.imagekit.io")) {
    return src;
  }
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}tr=w-${width},q-${quality},f-auto`;
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

export function uploadReviewImageToImageKit(file) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Each review image must be under 5 MB");
  }
  return uploadToImageKit({
    file,
    authEndpoint: "/media/review-upload-auth",
    folder: "/divara/reviews",
    prefix: "review",
  });
}

export function uploadAdminImageToImageKit(file, folder = "/divara/products") {
  return uploadToImageKit({
    file,
    authEndpoint: "/media/imagekit-auth",
    folder,
    prefix: "divara",
  });
}