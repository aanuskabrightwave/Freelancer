"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const CATEGORIES = [
  "REELS ↗", "MUSIC VIDEOS ↗", "COMMERCIALS ↗", "WEDDING FILMS ↗", 
  "YOUTUBE ↗", "SHORT FILMS ↗", "VFX ↗", "DOCUMENTARIES ↗", 
  "PRODUCT FILMS ↗", "FASHION SHOOTS ↗"
];

export default function TrendingTicker() {
  const marqueeInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marqueeInner = marqueeInnerRef.current;
    if (!marqueeInner) return;

    // Continuous marquee movement
    const loop = gsap.to(marqueeInner, {
      xPercent: -50,
      ease: "none",
      duration: 22,
      repeat: -1
    });

    // Velocity listener
    const trigger = ScrollTrigger.create({
      trigger: marqueeInner,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        // self.getVelocity() returns pixels/sec. We scale it appropriately.
        const velocity = self.getVelocity();
        const absoluteVelocity = Math.abs(velocity);
        
        // Speed up marquee when user scrolls quickly
        let multiplier = 1 + (absoluteVelocity * 0.001);
        if (velocity < 0) {
          multiplier = -multiplier; // reverse direction when scrolling up
        }

        gsap.to(loop, {
          timeScale: multiplier,
          duration: 0.6,
          overwrite: "auto",
          ease: "power2.out"
        });
      }
    });

    return () => {
      loop.kill();
      trigger.kill();
    };
  }, []);

  return (
    <div className="w-full bg-bg-level-3 border-y border-border-subtle py-6 overflow-hidden select-none whitespace-nowrap flex relative z-20">
      <div ref={marqueeInnerRef} className="flex gap-16 pr-16 text-3xl sm:text-5xl font-black uppercase text-text-sub tracking-wider">
        {/* Double content for seamless looping */}
        {[...CATEGORIES, ...CATEGORIES].map((cat, idx) => (
          <span key={idx} className="hover:text-accent-coral transition-colors cursor-default">
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
