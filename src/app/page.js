import React from "react";
import HeroSection from "@/components/home/HeroSection";
import CategoryShowcase from "@/components/home/CategoryShowcase";
import CollectionBanner from "@/components/home/CollectionBanner";
import PhilosophySection from "@/components/home/PhilosophySection";
import LuxuryPillars from "@/components/home/LuxuryPillars";
import BespokeConcierge from "@/components/home/BespokeConcierge";

export default function HomePage() {
  return (
    <div id="homepage" className="w-full">
      <HeroSection />
      <CategoryShowcase />
      <CollectionBanner />
      <PhilosophySection />
      <LuxuryPillars />
      <BespokeConcierge />
    </div>
  );
}