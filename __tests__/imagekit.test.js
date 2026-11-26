import { ikUrl, isImageKitUrl, uploadReviewImageToImageKit } from "@/lib/imagekit";
import { api } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
  getApiErrorMessage: (err, fallback) => err?.message || fallback,
}));

describe("imagekit utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("identifies ImageKit URLs and builds optimized transforms", () => {
    const src = "https://ik.imagekit.io/falguni22temp/divara/saree.jpg";
    expect(isImageKitUrl(src)).toBe(true);
    expect(ikUrl(src, { width: 600, quality: 75 })).toBe(
      `${src}?tr=w-600,c-at_max,q-75,f-auto`
    );
    expect(ikUrl("https://images.unsplash.com/photo-1")).toBe(
      "https://images.unsplash.com/photo-1"
    );
  });

  test("rejects non-image files before calling the API", async () => {
    const badFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(uploadReviewImageToImageKit(badFile)).rejects.toThrow(
      /Only JPEG, PNG, and WebP/i
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  test("rejects images larger than 3 MB", async () => {
    const bigBuffer = new Uint8Array(3 * 1024 * 1024 + 10);
    const bigFile = new File([bigBuffer], "huge.jpg", { type: "image/jpeg" });
    await expect(uploadReviewImageToImageKit(bigFile)).rejects.toThrow(/under 3 MB/i);
    expect(api.post).not.toHaveBeenCalled();
  });

  test("uploads valid JPEG review images to POST /media/review-upload", async () => {
    api.post.mockResolvedValueOnce({
      data: { data: { url: "https://ik.imagekit.io/falguni22temp/divara/reviews/r1.jpg", fileId: "f_1" } },
    });

    const validFile = new File(["fake-jpg-bytes"], "review.jpg", { type: "image/jpeg" });
    const result = await uploadReviewImageToImageKit(validFile);

    expect(api.post).toHaveBeenCalledWith("/media/review-upload", validFile, {
      headers: { "Content-Type": "image/jpeg" },
    });
    expect(result).toEqual({
      url: "https://ik.imagekit.io/falguni22temp/divara/reviews/r1.jpg",
      fileId: "f_1",
    });
  });
});