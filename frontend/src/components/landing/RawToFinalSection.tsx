"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function RawToFinalSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const imageRawRef = useRef<HTMLImageElement>(null);
  const imageFinalRef = useRef<HTMLImageElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !stickyRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=200%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // Phase 1: Header slides out & comparison starts
      tl.to(headerRef.current, {
        opacity: 0,
        y: -50,
        duration: 0.5,
        ease: "power2.inOut",
      })

        // Phase 2 & 3: Divider sweeps across from 0% to 100%
        .to(dividerRef.current, {
          left: "100%",
          duration: 1.5,
          ease: "none",
        }, 0.3)
        .to(imageFinalRef.current, {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.5,
          ease: "none",
        }, 0.3)

        // Phase 4: Text reveal "FROM FOOTAGE TO FEELING."
        .fromTo(
          textRevealRef.current,
          { opacity: 0, scale: 0.95, y: 30 },
          { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" },
          1.6
        )
        // Dwell state
        .to({}, { duration: 0.5 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[300vh] bg-[#080B1D] text-white overflow-clip m-0 p-0 z-20 border-t border-white/5"
    >
      <div
        ref={stickyRef}
        className="sticky top-0 w-full h-screen flex flex-col justify-center items-center overflow-hidden"
      >
        {/* Cinematic Image Layer Container */}
        <div className="absolute inset-0 w-full h-full select-none pointer-events-none z-0">

          {/* RAW Underlay */}
          <img
            ref={imageRawRef}
            src="/raw_image.png"
            alt="Raw Image"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Label Right: RAW (since the right side of the divider starts as RAW) */}
          <div className="absolute top-24 right-8 z-20 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded text-[10px] tracking-widest uppercase font-black text-slate-300">
            RAW
          </div>

          {/* FINAL CUT Overlay (Clipped above RAW) */}
          <img
            ref={imageFinalRef}
            src="/final_image.png"
            alt="Final Cut Image"
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{
              clipPath: "inset(0 100% 0 0)"
            }}
          />

          {/* Label Left: FINAL CUT (since the left side of the divider reveals FINAL CUT) */}
          <div className="absolute top-24 left-8 z-20 px-3 py-1 bg-primary/80 backdrop-blur-md border border-primary/20 rounded text-[10px] tracking-widest uppercase font-black text-white">
            FINAL CUT
          </div>

          {/* Sweeping Vertical Divider Line */}
          <div
            ref={dividerRef}
            className="absolute top-0 bottom-0 w-[2px] bg-primary z-20 left-[0%] pointer-events-none flex items-center justify-center"
          >
            <div className="w-10 h-10 rounded-full bg-primary text-white border border-white/20 flex items-center justify-center text-xs shadow-2xl font-bold select-none">
              &larr;&rarr;
            </div>
          </div>
        </div>

        {/* Dynamic Dark Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080B1D] via-transparent to-[#080B1D] opacity-90 z-10 pointer-events-none" />

        {/* Phase 1 Overlay Header */}
        <div
          ref={headerRef}
          className="relative z-20 text-center max-w-4xl px-6 space-y-5 pointer-events-none mt-12"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
            02 / THE TRANSFORMATION
          </span>
          <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.88] text-white">
            RAW FOOTAGE.<br />
            REAL CRAFT.<br />
            FINAL STORY.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
            See how skilled editors transform ordinary footage into polished, cinematic experiences.
          </p>
        </div>

        {/* Phase 4 Overlay Text "FROM FOOTAGE TO FEELING." */}
        <div
          ref={textRevealRef}
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none opacity-0"
        >
          <h3 className="text-5xl sm:text-8xl lg:text-9xl font-black tracking-tight text-center text-white leading-none px-4 drop-shadow-2xl">
            FROM FOOTAGE<br />
            <span className="text-primary">TO FEELING.</span>
          </h3>
        </div>
      </div>
    </div>
  );
}
