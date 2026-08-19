"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function PlatformSidesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerLineRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const clientContentRef = useRef<HTMLDivElement>(null);
  const creatorContentRef = useRef<HTMLDivElement>(null);

  const [hoveredSide, setHoveredSide] = useState<"client" | "creator" | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      // Line draws vertically
      gsap.fromTo(centerLineRef.current, 
        { scaleY: 0 }, 
        { 
          scaleY: 1, 
          duration: 1.2, 
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: container,
            start: "top 75%",
          }
        }
      );

      // Connect title reveals
      gsap.fromTo(titleRef.current, 
        { opacity: 0, y: -20 }, 
        { 
          opacity: 1, 
          y: 0, 
          duration: 1, 
          ease: "power2.out",
          scrollTrigger: {
            trigger: container,
            start: "top 60%",
          }
        }
      );

      // Slide client content from left
      gsap.fromTo(clientContentRef.current, 
        { x: -50, opacity: 0 }, 
        { 
          x: 0, 
          opacity: 1, 
          duration: 1, 
          ease: "power2.out",
          scrollTrigger: {
            trigger: container,
            start: "top 60%",
          }
        }
      );

      // Slide creator content from right
      gsap.fromTo(creatorContentRef.current, 
        { x: 50, opacity: 0 }, 
        { 
          x: 0, 
          opacity: 1, 
          duration: 1, 
          ease: "power2.out",
          scrollTrigger: {
            trigger: container,
            start: "top 60%",
          }
        }
      );

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Determine widths dynamically
  const clientWidth = hoveredSide === "client" ? "w-[68%]" : hoveredSide === "creator" ? "w-[32%]" : "w-[50%]";
  const creatorWidth = hoveredSide === "creator" ? "w-[68%]" : hoveredSide === "client" ? "w-[32%]" : "w-[50%]";
  const centerLineLeft = hoveredSide === "client" ? "left-[68%]" : hoveredSide === "creator" ? "left-[32%]" : "left-[50%]";

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen bg-[#0B0C0E] text-white flex overflow-hidden z-20"
    >
      {/* Central Connect Title */}
      <div 
        ref={titleRef}
        className="absolute top-12 left-1/2 -translate-x-1/2 text-center z-30 pointer-events-none w-full max-w-lg px-6"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block mb-2">
          TWO SIDES. ONE PLATFORM.
        </span>
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
          Built for both sides of the lens.
        </h2>
      </div>

      {/* Center Line Split */}
      <div
        ref={centerLineRef}
        className={`absolute top-0 bottom-0 w-[1px] bg-white/20 ${centerLineLeft} -translate-x-1/2 z-20 pointer-events-none origin-top transition-all duration-700 ease-out-quint`}
      />

      {/* LEFT: CLIENTS */}
      <div
        onMouseEnter={() => setHoveredSide("client")}
        onMouseLeave={() => setHoveredSide(null)}
        className={`${clientWidth} h-full relative transition-all duration-700 ease-out-quint flex items-center justify-center p-8 sm:p-16`}
      >
        {/* Underlay video */}
        <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none">
          <video
            src="https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-a-laptop-in-a-cafe-42323-large.mp4"
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.4] saturate-[0.7]"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-[#0B0C0E]/70" />
        </div>

        {/* Content wrapper */}
        <div 
          ref={clientContentRef}
          className="relative z-10 max-w-md space-y-6 text-left pointer-events-auto"
        >
          <span className="text-[10px] font-black tracking-widest text-primary uppercase">
            FOR CLIENTS & PRODUCTION
          </span>
          <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-none">
            Find the creative mind your project deserves.
          </h3>
          <ul className="text-xs sm:text-sm text-slate-300 space-y-2 list-disc pl-4 leading-relaxed font-medium">
            <li>Post your project with reference imagery</li>
            <li>Explore verified kit specifications & portfolios</li>
            <li>Collaborate directly via custom project workspace</li>
            <li>Approve watermarked cuts and release payments securely</li>
          </ul>
          <div className="pt-2">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <span>FIND A CREATOR</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT: CREATORS */}
      <div
        onMouseEnter={() => setHoveredSide("creator")}
        onMouseLeave={() => setHoveredSide(null)}
        className={`${creatorWidth} h-full relative transition-all duration-700 ease-out-quint flex items-center justify-center p-8 sm:p-16`}
      >
        {/* Underlay video */}
        <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none">
          <video
            src="https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4"
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.4] saturate-[0.7]"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-[#0B0C0E]/70" />
        </div>

        {/* Content wrapper */}
        <div 
          ref={creatorContentRef}
          className="relative z-10 max-w-md space-y-6 text-left pointer-events-auto"
        >
          <span className="text-[10px] font-black tracking-widest text-primary uppercase">
            FOR CREATORS & EDITORS
          </span>
          <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-none">
            Your talent deserves the right audience.
          </h3>
          <ul className="text-xs sm:text-sm text-slate-300 space-y-2 list-disc pl-4 leading-relaxed font-medium">
            <li>Showcase your gear packages (RED, Sony Cine, ARRI)</li>
            <li>Discover curated creative requests & bids</li>
            <li>Collaborate with elite brands and directors</li>
            <li>Get paid reliably through platform escrow</li>
          </ul>
          <div className="pt-2">
            <Link
              href="/register"
              className="bg-white hover:bg-slate-200 text-black font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-flex items-center gap-2"
            >
              <span>START CREATING</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
