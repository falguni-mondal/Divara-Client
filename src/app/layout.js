import { Bodoni_Moda, Lato } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";
import { ShopProvider } from "@/context/ShopContext";
import Navbar from "@/components/layout/Navbar";
import CartDrawer from "@/components/cart/CartDrawer";
import Footer from "@/components/layout/Footer";

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Divara — Limitless Luxury",
    template: "%s | Divara",
  },
  applicationName: "Divara",
  description:
    "Divara — Discover timeless Indian luxury fashion. Handwoven sarees, couture dresses, artisanal denim, and pure silk shirts.",
  openGraph: {
    title: "Divara — Limitless Luxury",
    siteName: "Divara",
    url: "https://divara.byfalguni.com",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodoniModa.variable} ${lato.variable} antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-dvh flex flex-col bg-[#ffffff] text-[#1b1717]"
      >
        <ShopProvider>
          <SmoothScrollProvider>
            <Navbar />
            <CartDrawer />
            <main className="flex-1 w-full">{children}</main>
            <Footer />
          </SmoothScrollProvider>
        </ShopProvider>
      </body>
    </html>
  );
}