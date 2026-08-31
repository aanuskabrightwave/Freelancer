"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const TOTAL_FRAMES = 182;

// Generate zero-padded frame URL: /camera-frames/frame-0001.webp -> frame-0182.webp
function getFrameUrl(index: number): string {
  const paddedIndex = String(index + 1).padStart(4, "0");
  return `/camera-frames/frame-${paddedIndex}.webp`;
}

export default function CinematicHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 6 Storytelling Stage Refs
  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);
  const stage4Ref = useRef<HTMLDivElement>(null);
  const stage5Ref = useRef<HTMLDivElement>(null);
  const stage6Ref = useRef<HTMLDivElement>(null);

  // State
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Animation and frame storage refs
  const framesRef = useRef<HTMLImageElement[]>([]);
  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const lastRenderedFrameRef = useRef(-1);
  const animFrameIdRef = useRef<number | null>(null);

  // Draw frame onto full-screen High-DPI canvas with guaranteed full-bleed edge coverage
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clampedIndex = Math.min(Math.max(frameIndex, 0), TOTAL_FRAMES - 1);
    const img = framesRef.current[clampedIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.innerHeight;

    // Reset transform to 1:1 and clear the full hardware buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply DPR scaling for ultra-sharp canvas rendering
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const isMobile = width < 768;

    // Strict Full-Bleed `cover` scaling: guarantees drawW >= width AND drawH >= height
    const coverScale = Math.max(
      width / img.naturalWidth,
      height / img.naturalHeight
    );

    const drawW = img.naturalWidth * coverScale;
    const drawH = img.naturalHeight * coverScale;

    // Optical centering: shift camera slightly right while guaranteeing zero gap on edges
    const maxShiftX = Math.max(0, (drawW - width) / 2);
    const shiftX = isMobile ? 0 : Math.min(width * 0.08, maxShiftX);

    const posX = (width - drawW) / 2 + shiftX;
    const posY = (height - drawH) / 2;

    ctx.drawImage(img, posX, posY, drawW, drawH);
    lastRenderedFrameRef.current = clampedIndex;
  }, []);

  // Resize handler configuring full-screen High-DPI canvas buffer
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    drawFrame(Math.round(currentFrameRef.current));
  }, [drawFrame]);

  // Main setup effect
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !canvasRef.current) return;

    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      setIsReducedMotion(true);
      return;
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    // Preload All Frames
    const frames: HTMLImageElement[] = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);
      if (i === 0) {
        img.onload = () => {
          drawFrame(0);
          ScrollTrigger.refresh();
        };
      }
      frames.push(img);
    }
    framesRef.current = frames;

    // Master GSAP ScrollTrigger timeline for 6 Synchronized Storytelling Stages
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.85, // Responsive, smooth scroll scrub
        onUpdate: (self) => {
          const progress = self.progress;

          // Non-linear camera progress mapping: gives extra dwell time to inspect the full exploded view
          let mappedProgress = 0;
          if (progress < 0.30) {
            // Stage 1 & 2: Assembled to initial rotation (0% - 30% scroll -> frames 0% - 38%)
            mappedProgress = (progress / 0.30) * 0.38;
          } else if (progress < 0.45) {
            // Stage 3: Initial disassembly (30% - 45% scroll -> frames 38% - 48%)
            const subP = (progress - 0.30) / (0.45 - 0.30);
            mappedProgress = 0.38 + subP * 0.10;
          } else if (progress < 0.65) {
            // Stage 4: Full exploded view hold (45% - 65% scroll -> frames 48% - 56%)
            const subP = (progress - 0.45) / (0.65 - 0.45);
            mappedProgress = 0.48 + subP * 0.08;
          } else if (progress < 0.85) {
            // Stage 5: Reassembly (65% - 85% scroll -> frames 56% - 80%)
            const subP = (progress - 0.65) / (0.85 - 0.65);
            mappedProgress = 0.56 + subP * 0.24;
          } else {
            // Stage 6: Final assembled showcase (85% - 100% scroll -> frames 80% - 100%)
            const subP = (progress - 0.85) / (1 - 0.85);
            mappedProgress = 0.80 + subP * 0.20;
          }

          targetFrameRef.current = mappedProgress * (TOTAL_FRAMES - 1);
        },
      },
    });

    // Synchronize 6 Storytelling Stages precisely across the timeline:
    // Timeline duration scale: 0 to 10
    timeline
      // STAGE 01: 0% to 15% scroll (Timeline 0.0 to 1.5)
      // Visible at start (opacity 1, y 0), fades out at end of stage 1
      .to(stage1Ref.current, { opacity: 0, y: -15, duration: 0.5, ease: "power1.in" }, 1.0)

      // STAGE 02: 15% to 30% scroll (Timeline 1.5 to 3.0)
      .fromTo(stage2Ref.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: "power1.out" }, 1.5)
      .to(stage2Ref.current, { opacity: 0, y: -15, duration: 0.5, ease: "power1.in" }, 2.5)

      // STAGE 03: 30% to 45% scroll (Timeline 3.0 to 4.5)
      .fromTo(stage3Ref.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: "power1.out" }, 3.0)
      .to(stage3Ref.current, { opacity: 0, y: -15, duration: 0.5, ease: "power1.in" }, 4.0)

      // STAGE 04: 45% to 65% scroll (Timeline 4.5 to 6.5) — Centerpiece Exploded View
      .fromTo(stage4Ref.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: "power1.out" }, 4.5)
      .to(stage4Ref.current, { opacity: 0, y: -15, duration: 0.5, ease: "power1.in" }, 6.0)

      // STAGE 05: 65% to 85% scroll (Timeline 6.5 to 8.5) — Reassembly
      .fromTo(stage5Ref.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: "power1.out" }, 6.5)
      .to(stage5Ref.current, { opacity: 0, y: -15, duration: 0.5, ease: "power1.in" }, 8.0)

      // STAGE 06: 85% to 100% scroll (Timeline 8.5 to 10.0) — Final Assembled Showcase
      .fromTo(stage6Ref.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: "power1.out" }, 8.5);

    // Continuous 60fps render loop with smooth frame interpolation
    const renderLoop = () => {
      const diff = targetFrameRef.current - currentFrameRef.current;

      // Smooth interpolation constant (0.22 gives instant response with cinematic smoothness)
      if (Math.abs(diff) > 0.005) {
        currentFrameRef.current += diff * 0.22;
        const targetInt = Math.round(currentFrameRef.current);

        if (targetInt !== lastRenderedFrameRef.current) {
          drawFrame(targetInt);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      timeline.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [handleResize, drawFrame]);

  if (isReducedMotion) {
    return (
      <section className="relative w-full py-20 bg-bg-level-0 text-text-heading border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <span className="text-[10px] font-black uppercase tracking-widest">
                01 — THE CREATIVE NETWORK
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-text-heading leading-[0.95]">
              Every story starts with the right creative.
            </h1>
            <p className="text-sm md:text-base text-text-body max-w-md leading-relaxed">
              Find photographers, videographers, and editors who understand your vision and know how to bring it to life.
            </p>
            <div className="pt-2">
              <Link
                href="/freelancers"
                className="bg-primary hover:bg-primary-hover text-text-main font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
              >
                <span>Explore Creatives</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl bg-transparent">
            <img
              src="/camera-frames/frame-0001.webp"
              alt="Camera commercial hero"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500vh] bg-bg-level-0 m-0 p-0 overflow-clip"
    >
      {/* Full-Bleed Pinned Viewport Container (Edge-to-Edge, 100% width, 100vh) */}
      <div
        ref={stickyRef}
        className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-bg-level-0 m-0 p-0"
      >
        {/* Layer 0: Full-Bleed High-Resolution Canvas (z-0, 100% edge-to-edge coverage across all frames) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none z-0 m-0 p-0"
          style={{ opacity: 1, filter: "none" }}
        />

        {/* Layer 1: Ultra-Subtle Left Text Gradient Only (z-10, max 38% width, never washes out camera) */}
        <div
          className="absolute inset-0 pointer-events-none z-10 m-0 p-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(18,16,15,0.48) 0%, rgba(18,16,15,0.18) 18%, rgba(18,16,15,0.02) 28%, transparent 38%)",
          }}
        />

        {/* Layer 2: Synchronized Storytelling Stages Overlaid in Consistent Anchor Position (z-20) */}

        {/* STAGE 01: 0% TO 15% (Active on initial load) */}
        <div
          ref={stage1Ref}
          className="absolute left-[6%] lg:left-[10%] max-w-lg px-6 text-left space-y-6 z-20 pointer-events-auto opacity-100 translate-y-0"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[10px] font-black uppercase tracking-widest">
              01 — THE CREATIVE NETWORK
            </span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-[68px] font-black tracking-tight text-text-heading leading-[0.92] max-w-xl"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)" }}
          >
            Every story starts with the right creative.
          </h1>
          <p
            className="text-xs sm:text-sm lg:text-base text-text-body font-medium max-w-md leading-relaxed"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
          >
            Find photographers, videographers, and editors who understand your vision and know how to bring it to life.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-text-main font-extrabold text-[10px] sm:text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>Explore Creatives</span>
              <span>&rarr;</span>
            </Link>
          </div>
          <div className="pt-6 animate-bounce">
            <span className="text-[9px] font-black uppercase tracking-widest text-text-sub block mb-1">
              Scroll to explore
            </span>
            <span className="text-text-sub">&darr;</span>
          </div>
        </div>

        {/* STAGE 02: 15% TO 30% */}
        <div
          ref={stage2Ref}
          className="absolute left-[6%] lg:left-[10%] max-w-lg px-6 text-left space-y-6 z-20 pointer-events-auto opacity-0 translate-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[10px] font-black uppercase tracking-widest">
              02 — FIND YOUR MATCH
            </span>
          </div>
          <h2
            className="text-4xl sm:text-5xl lg:text-[68px] font-black tracking-tight text-text-heading leading-[0.92] max-w-xl"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)" }}
          >
            Talent built around your vision.
          </h2>
          <p
            className="text-xs sm:text-sm lg:text-base text-text-body font-medium max-w-md leading-relaxed"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
          >
            Browse specialists by craft, style, experience, and project needs.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-text-main font-extrabold text-[10px] sm:text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>Discover Talent</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* STAGE 03: 30% TO 45% */}
        <div
          ref={stage3Ref}
          className="absolute left-[6%] lg:left-[10%] max-w-lg px-6 text-left space-y-6 z-20 pointer-events-auto opacity-0 translate-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[10px] font-black uppercase tracking-widest">
              03 — EVERY DETAIL MATTERS
            </span>
          </div>
          <h2
            className="text-4xl sm:text-5xl lg:text-[68px] font-black tracking-tight text-text-heading leading-[0.92] max-w-xl"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)" }}
          >
            The right specialist changes everything.
          </h2>
          <p
            className="text-xs sm:text-sm lg:text-base text-text-body font-medium max-w-md leading-relaxed"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
          >
            From the first frame to the final cut, work with creatives who understand every detail of the process.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/#how-it-works"
              className="bg-primary hover:bg-primary-hover text-text-main font-extrabold text-[10px] sm:text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>How It Works</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* STAGE 04: 45% TO 65% (Centerpiece Exploded View Hold) */}
        <div
          ref={stage4Ref}
          className="absolute left-[6%] lg:left-[10%] max-w-lg px-6 text-left space-y-6 z-20 pointer-events-auto opacity-0 translate-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[10px] font-black uppercase tracking-widest">
              04 — ONE CREATIVE ECOSYSTEM
            </span>
          </div>
          <h2
            className="text-4xl sm:text-5xl lg:text-[68px] font-black tracking-tight text-text-heading leading-[0.92] max-w-xl"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)" }}
          >
            Different skills. <br className="hidden sm:inline" />
            One complete story.
          </h2>
          <p
            className="text-xs sm:text-sm lg:text-base text-text-body font-medium max-w-md leading-relaxed"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
          >
            Photography, videography, editing, color, and post-production — find the expertise your project needs.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-text-main font-extrabold text-[10px] sm:text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>Explore Services</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* STAGE 05: 65% TO 85% (Reassembly) */}
        <div
          ref={stage5Ref}
          className="absolute left-[6%] lg:left-[10%] max-w-lg px-6 text-left space-y-6 z-20 pointer-events-auto opacity-0 translate-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[10px] font-black uppercase tracking-widest">
              05 — BUILT TOGETHER
            </span>
          </div>
          <h2
            className="text-4xl sm:text-5xl lg:text-[68px] font-black tracking-tight text-text-heading leading-[0.92] max-w-xl"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)" }}
          >
            From idea to final delivery.
          </h2>
          <p
            className="text-xs sm:text-sm lg:text-base text-text-body font-medium max-w-md leading-relaxed"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
          >
            Find your creative, collaborate with confidence, review the work, and bring the entire project together.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-text-main font-extrabold text-[10px] sm:text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>Start a Project</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* STAGE 06: 85% TO 100% (Final Assembled Showcase) */}
        <div
          ref={stage6Ref}
          className="absolute left-[6%] lg:left-[10%] max-w-lg px-6 text-left space-y-6 z-20 pointer-events-auto opacity-0 translate-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[10px] font-black uppercase tracking-widest">
              06 — YOUR STORY STARTS HERE
            </span>
          </div>
          <h2
            className="text-4xl sm:text-5xl lg:text-[68px] font-black tracking-tight text-text-heading leading-[0.92] max-w-xl"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)" }}
          >
            Find the creative who gets it.
          </h2>
          <p
            className="text-xs sm:text-sm lg:text-base text-text-body font-medium max-w-md leading-relaxed"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
          >
            Connect with the right talent and turn your next idea into something worth remembering.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/register"
              className="bg-primary hover:bg-primary-hover text-text-main font-extrabold text-[10px] sm:text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>Join Marketplace</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
