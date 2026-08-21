"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CinematicHero from "@/components/landing/CinematicHero";
import RawToFinalSection from "@/components/landing/RawToFinalSection";
import TrendingSection from "@/components/landing/TrendingSection";
import FeaturedCreatorsSection from "@/components/landing/FeaturedCreatorsSection";
import TrendingCitiesSection from "@/components/landing/TrendingCitiesSection";
import EditingStylesSection from "@/components/landing/EditingStylesSection";
import TrendingTicker from "@/components/landing/TrendingTicker";
import PlatformSidesSection from "@/components/landing/PlatformSidesSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import EditingTimelineSection from "@/components/landing/EditingTimelineSection";
import ShowreelWallSection from "@/components/landing/ShowreelWallSection";
import PlatformStatsSection from "@/components/landing/PlatformStatsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Authenticated user redirect to dashboards
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "CLIENT") {
        router.replace("/client/dashboard");
      } else if (user.role === "FREELANCER") {
        router.replace("/freelancer/dashboard");
      } else if (user.role === "ADMIN") {
        router.replace("/admin/dashboard");
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading || (isAuthenticated && user)) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[70vh] bg-[#080B1D]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow bg-bg-level-0 text-text-body font-sans selection:bg-accent-coral/20">
      
      {/* 1. CINEMATIC 3D CAMERA HERO SECTION (COMPLETED & APPROVED — DO NOT TOUCH) */}
      <CinematicHero />

      {/* 2. RAW → FINAL CUT */}
      <RawToFinalSection />

      {/* 3. TRENDING RIGHT NOW */}
      <TrendingSection />

      {/* 4. MEET THE EDITORS */}
      <FeaturedCreatorsSection />

      {/* 5. TRENDING CITIES */}
      <TrendingCitiesSection />

      {/* 6. FIND YOUR EDITING STYLE */}
      <EditingStylesSection />

      {/* TRENDING TICKER RELOCATION */}
      <TrendingTicker />

      {/* 7. TWO SIDES. ONE PLATFORM. */}
      <PlatformSidesSection />

      {/* 8. FROM BRIEF TO FINAL CUT */}
      <WorkflowSection />

      {/* 9. THE EDITING TIMELINE EXPERIENCE */}
      <EditingTimelineSection />

      {/* 10. CREATOR SHOWREEL WALL */}
      <ShowreelWallSection />

      {/* 11. PLATFORM TRUST / NUMBERS */}
      <PlatformStatsSection />

      {/* 12. TESTIMONIALS */}
      <TestimonialsSection />

      {/* 13. FINAL CTA */}
      <FinalCTASection />

    </div>
  );
}
