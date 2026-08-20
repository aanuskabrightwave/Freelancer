"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STEPS = [
  {
    num: "01",
    title: "POST YOUR PROJECT BRIEF",
    desc: "Outline your creative vision, camera specifications (like FX6 or RED), budget range, and timeline deadlines."
  },
  {
    num: "02",
    title: "FIND THE RIGHT CREATOR",
    desc: "Compare verified specialists filtered by geographic location, camera package inclusions, and authentic portfolio work."
  },
  {
    num: "03",
    title: "COLLABORATE & SHARE DAILIES",
    desc: "Use your dedicated workspace to sync files, locate locations, and chat directly in one project hub."
  }
];

export default function WorkflowSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const trackVideoRef = useRef<HTMLDivElement>(null);
  const trackAudioRef = useRef<HTMLDivElement>(null);
  const trackReviewRef = useRef<HTMLDivElement>(null);
  const trackFinalRef = useRef<HTMLDivElement>(null);

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      // Timeline animation matching the scroll progress
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top 20%",
          end: "bottom 80%",
          scrub: 0.5,
          onUpdate: (self) => {
            // Determine active step based on scroll progress (0.0 to 1.0)
            const step = Math.min(
              Math.floor(self.progress * STEPS.length),
              STEPS.length - 1
            );
            setActiveStep(step);
          }
        }
      });

      // Animate progress bars
      tl.fromTo(trackVideoRef.current, { width: "0%" }, { width: "100%", ease: "none" }, 0)
        .fromTo(trackAudioRef.current, { width: "0%" }, { width: "85%", ease: "none" }, 0.1)
        .fromTo(trackReviewRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, ease: "none" }, 0.6)
        .fromTo(trackFinalRef.current, { width: "0%" }, { width: "100%", ease: "none" }, 0.8)
        .fromTo(playheadRef.current, { left: "0%" }, { left: "100%", ease: "none" }, 0);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-32 bg-[#0B0C0E] text-white border-t border-white/5 relative z-20 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-20">

        {/* Header */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
            07 / ONE CONNECTED PIPELINE
          </span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            From brief to final cut.
          </h2>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Step through the unified production process connecting clients and creative professionals.
          </p>
        </div>

        {/* Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* Left Column: Visual Mock Timeline */}
          <div className="lg:col-span-6 sticky top-48 bg-[#101114] border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">

            {/* Header info */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-[9px] font-black tracking-widest uppercase text-slate-500">
                TIMELINE STATUS MONITOR
              </span>
              <span className="text-xs text-primary font-black uppercase tracking-wider">
                STAGE {STEPS[activeStep].num} ACTIVE
              </span>
            </div>

            {/* Editing Track Mock */}
            <div className="space-y-4 relative py-4">

              {/* Playhead */}
              <div
                ref={playheadRef}
                className="absolute top-0 bottom-0 w-[2px] bg-primary z-20 left-0"
              >
                <div className="w-3 h-3 rounded-full bg-primary absolute -top-1 -left-[5px] shadow-lg shadow-primary/50" />
              </div>

              {/* VIDEO Track */}
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">VIDEO</span>
                <div className="w-full h-8 bg-slate-900/50 rounded border border-white/5 overflow-hidden relative">
                  <div
                    ref={trackVideoRef}
                    className="h-full bg-slate-700/80 w-0 border-r border-white/20 transition-all"
                  />
                  <div className="absolute inset-0 flex items-center px-4 text-[9px] font-bold text-slate-400 tracking-wider">
                    RAW FOOTAGE SYNCED
                  </div>
                </div>
              </div>

              {/* B-ROLL Track */}
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">B-ROLL</span>
                <div className="w-full h-8 bg-slate-900/50 rounded border border-white/5 overflow-hidden relative">
                  <div
                    className="h-full bg-slate-600/60 w-[70%] border-r border-white/20 transition-all"
                    style={{ opacity: activeStep >= 2 ? 1 : 0 }}
                  />
                  <div className="absolute inset-0 flex items-center px-4 text-[9px] font-bold text-slate-400 tracking-wider">
                    B-ROLL CUTS APPLIED
                  </div>
                </div>
              </div>

              {/* AUDIO Track */}
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">AUDIO</span>
                <div className="w-full h-8 bg-slate-900/50 rounded border border-white/5 overflow-hidden relative font-bold">
                  <div
                    ref={trackAudioRef}
                    className="h-full bg-[#1e293b] w-0 border-r border-white/20 transition-all"
                  />
                  <div className="absolute inset-0 flex items-center px-4 text-[9px] font-bold text-slate-500 tracking-wider">
                    VOICE & SOUND DESIGN
                  </div>
                </div>
              </div>

              {/* REVIEW Track */}
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">REVISIONS</span>
                <div className="w-full h-8 bg-slate-900/50 rounded border border-white/5 overflow-hidden relative flex items-center px-4">
                  <div
                    ref={trackReviewRef}
                    className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-black text-white shadow-lg"
                  >
                    ●
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 pl-2">CLIENT NOTES CHECKED</span>
                </div>
              </div>

              {/* FINAL MASTER Output */}
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">FINAL EXPORT</span>
                <div className="w-full h-8 bg-slate-900/50 rounded border border-white/5 overflow-hidden relative font-bold">
                  <div
                    ref={trackFinalRef}
                    className="h-full bg-primary/80 w-0 transition-all"
                  />
                  <div className="absolute inset-0 flex items-center px-4 text-[9px] font-bold text-white tracking-wider">
                    PRORES MASTER EXPORTED
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Steps Descriptions */}
          <div className="lg:col-span-6 space-y-8">
            {STEPS.map((step, idx) => (
              <div
                key={step.num}
                className={`p-6 sm:p-8 rounded-2xl border transition-all duration-500 ${activeStep === idx
                    ? "bg-[#101114] border-primary/30 shadow-lg scale-102"
                    : "border-white/5 opacity-40"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black px-2.5 py-1 rounded ${activeStep === idx ? "bg-primary text-white" : "bg-white/10 text-slate-400"
                    }`}>
                    {step.num}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    STAGE {step.num}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-4 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
