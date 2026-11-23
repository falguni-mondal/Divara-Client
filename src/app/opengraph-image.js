import { ImageResponse } from "next/og";

export const alt = "Divara — Limitless Luxury";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpg";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1717",
          color: "#ffffff",
          padding: "64px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "28px",
            border: "1px solid rgba(255,255,255,0.18)",
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 16,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#d4b5b2",
            marginBottom: 24,
          }}
        >
          INDIAN LUXURY ATELIER
        </div>
        <div
          style={{
            fontSize: 96,
            fontFamily: "Georgia, serif",
            letterSpacing: "0.26em",
            fontWeight: 400,
            color: "#ffffff",
            marginBottom: 22,
          }}
        >
          DIVARA
        </div>
        <div
          style={{
            width: 84,
            height: 2,
            background: "#5d100a",
            marginBottom: 24,
          }}
        />
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          Limitless Luxury • Handwoven Sarees &amp; Couture
        </div>
      </div>
    ),
    { ...size }
  );
}