"use client";

import React, { useEffect, useRef, useState } from "react";
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

const PROJECTS = [
  {
    id: 1,
    title: "VOGUE NOIR",
    type: "Fashion Film / 01:20",
    creator: "Maya Sen",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4",
    colSpan: "lg:col-span-7 aspect-[16/10]"
  },
  {
    id: 2,
    title: "THE ARTISAN'S WORK",
    type: "Brand Documentary / 02:45",
    creator: "Aarav Mehta",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-a-laptop-in-a-cafe-42323-large.mp4",
    colSpan: "lg:col-span-5 aspect-[4/5]"
  },
  {
    id: 3,
    title: "PACIFIC SWELLS",
    type: "Commercial Film / 00:30",
    creator: "Karan Johar",
    image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4",
    colSpan: "lg:col-span-12 aspect-[21/9]"
  }
];

export default function TrendingSection() {
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  
  // Custom cursor state for each card
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Marquee scroll velocity multiplier effect
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <section className="py-32 bg-[#0B0C0E] border-t border-white/5 relative z-20 text-white overflow-hidden">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-4 mb-20">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
          03 / WHAT'S CUTTING THROUGH
        </span>
        <h2 className="text-4xl sm:text-6xl lg:text-[72px] font-black tracking-tight text-white leading-none">
          Trending right now.
        </h2>
      </div>

      {/* Looping Category Ticker */}
      <div className="w-full bg-[#101114] border-y border-white/5 py-6 mb-24 overflow-hidden select-none whitespace-nowrap flex">
        <div ref={marqueeInnerRef} className="flex gap-16 pr-16 text-3xl sm:text-5xl font-black uppercase text-slate-400 tracking-wider">
          {/* Double content for seamless looping */}
          {[...CATEGORIES, ...CATEGORIES].map((cat, idx) => (
            <span key={idx} className="hover:text-primary transition-colors cursor-default">
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Projects Editorial Masonry */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {PROJECTS.map((project) => (
            <div
              key={project.id}
              className={`${project.colSpan} relative bg-[#101114] rounded-2xl overflow-hidden border border-white/5 group cursor-none`}
              onMouseEnter={() => setHoveredCardId(project.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              onMouseMove={handleMouseMove}
            >
              {/* Custom Play Cursor Follower */}
              {hoveredCardId === project.id && (
                <div
                  className="absolute pointer-events-none z-30 w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black uppercase tracking-wider shadow-2xl transition-transform duration-100 ease-out"
                  style={{
                    left: `${mousePos.x - 32}px`,
                    top: `${mousePos.y - 32}px`,
                    transform: "scale(1.1)",
                  }}
                >
                  PLAY
                </div>
              )}

              {/* Media Container */}
              <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
                {/* Fallback Image */}
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover saturate-[0.8] contrast-[1.05] group-hover:scale-105 transition-transform duration-1000 ease-out"
                />
                {/* Video Loop Overlay */}
                <video
                  src={project.video}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
                  autoPlay={hoveredCardId === project.id}
                  loop
                  muted
                  playsInline
                />
                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E]/90 via-[#0B0C0E]/30 to-transparent" />
              </div>

              {/* Project Card Text Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 z-10 flex flex-col justify-end space-y-2 pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {project.type}
                </span>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-none group-hover:translate-x-2 transition-transform duration-500 ease-out">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-400 font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-500 ease-out">
                  Edited by {project.creator}
                </p>
              </div>

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
