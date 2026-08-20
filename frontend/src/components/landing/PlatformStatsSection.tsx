"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { freelancerService } from "@/services/freelancer.service";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function PlatformStatsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    creators: 3, // fallback based on verified count
    cities: 8,
    categories: 10,
    escrowPercent: 100
  });

  // Query real database metrics
  useEffect(() => {
    async function loadStats() {
      try {
        const data = await freelancerService.listFreelancers({ page: 1, page_size: 100 });
        if (data && data.length > 0) {
          setStats(prev => ({
            ...prev,
            creators: data.length
          }));
        }
      } catch {
        // Backend offline, keep default fallback stats
      }
    }
    loadStats();
  }, []);

  // GSAP Count-up animation
  useEffect(() => {
    if (stats.creators === 0) return;
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const counters = gsap.utils.toArray(".stat-counter");
      counters.forEach((counter: any) => {
        const targetVal = parseFloat(counter.getAttribute("data-target") || "0");
        const obj = { val: 0 };
        
        gsap.to(obj, {
          val: targetVal,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: counter,
            start: "top 85%",
            toggleActions: "play none none none"
          },
          onUpdate: () => {
            // Render integer values
            counter.innerText = Math.floor(obj.val).toLocaleString();
          }
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [stats]);

  return (
    <section 
      ref={containerRef}
      className="pt-8 md:pt-12 lg:pt-16 pb-8 md:pb-10 lg:pb-12 bg-[#101114] text-[#F7F3ED] border-y border-white/5 relative z-20 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-24">
        
        {/* Large Typography Header */}
        <div className="max-w-4xl space-y-6">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
            11 / TRUST & METRICS
          </span>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-[0.92]">
            CREATIVITY<br />
            BACKED BY<br />
            A PLATFORM.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
            We built a secure, high-trust environment by replacing agency markup with transparent, direct collaborations.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-8 border-t border-white/5">
          
          {/* Active Creators */}
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none flex items-baseline">
              <span className="stat-counter" data-target={stats.creators}>
                0
              </span>
              <span className="text-primary text-3xl font-bold">+</span>
            </div>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">
              ACTIVE CREATORS
            </span>
            <p className="text-[11px] text-slate-400 font-medium">
              Verified portfolio, kit checklist & verified identity.
            </p>
          </div>

          {/* Creative Cities */}
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none flex items-baseline">
              <span className="stat-counter" data-target={stats.cities}>
                0
              </span>
            </div>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">
              CREATIVE HOTSPOTS
            </span>
            <p className="text-[11px] text-slate-400 font-medium">
              Major Indian visual production centers supported.
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none flex items-baseline">
              <span className="stat-counter" data-target={stats.categories}>
                0
              </span>
            </div>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">
              CREATIVE STYLES
            </span>
            <p className="text-[11px] text-slate-400 font-medium">
              Standardized genres from social reels to cinematic docs.
            </p>
          </div>

          {/* Secure Escrow */}
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none flex items-baseline">
              <span className="stat-counter" data-target={stats.escrowPercent}>
                0
              </span>
              <span className="text-primary text-3xl font-bold">%</span>
            </div>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">
              ESCROW GUARANTEE
            </span>
            <p className="text-[11px] text-slate-400 font-medium">
              Funds held securely until final master cut is approved.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
