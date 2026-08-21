"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function EditingTimelineSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  
  // Track Elements
  const trackVideoBlock = useRef<HTMLDivElement>(null);
  const trackBRollBlock = useRef<HTMLDivElement>(null);
  const trackMusicWave = useRef<HTMLDivElement>(null);
  const trackTextLayer = useRef<HTMLDivElement>(null);
  const trackSFXLayer = useRef<HTMLDivElement>(null);
  const trackColorLayer = useRef<HTMLDivElement>(null);
  
  // Monitor & Layout
  const previewMonitor = useRef<HTMLDivElement>(null);
  const timelineWorkspace = useRef<HTMLDivElement>(null);
  const previewVideo = useRef<HTMLVideoElement>(null);
  const fullScreenText = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        }
      });

      // Sequence of timeline building:
      
      // 1. Video track loaded
      tl.fromTo(trackVideoBlock.current, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1, ease: "power2.out" })
      
      // 2. B-roll track loaded
      .fromTo(trackBRollBlock.current, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1, ease: "power2.out" }, "+=0.2")
      
      // 3. Music waveforms loaded
      .fromTo(trackMusicWave.current, { width: "0%", opacity: 0 }, { width: "100%", opacity: 1, duration: 1, ease: "power2.out" }, "+=0.2")
      
      // 4. Text track titles appear
      .fromTo(trackTextLayer.current, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1, ease: "power2.out" }, "+=0.2")
      
      // 5. SFX volume peaks appear
      .fromTo(trackSFXLayer.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: "power2.out" }, "+=0.2")
      
      // 6. Color Grade adjustment layer applies to timeline and changes preview video colors
      .fromTo(trackColorLayer.current, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1, ease: "power2.out" }, "+=0.2")
      // Animate video filter: Flat raw to color graded
      .to(previewVideo.current, {
        filter: "saturate(1.2) contrast(1.1) brightness(0.95)",
        duration: 1,
        ease: "power2.inOut"
      }, "-=1")

      // 7. Timeline scales down and fades out
      .to(timelineWorkspace.current, {
        opacity: 0,
        y: 100,
        scale: 0.9,
        duration: 1.5,
        ease: "power2.inOut"
      }, "+=0.4")

      // 8. Preview monitor scales to fullscreen cover
      .to(previewMonitor.current, {
        width: "100vw",
        height: "100vh",
        borderRadius: "0px",
        duration: 2,
        ease: "power3.inOut"
      }, "-=1.5")

      // 9. Every layer. One story. text appears
      .fromTo(fullScreenText.current, 
        { opacity: 0, y: 50 }, 
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
      )
      // Hold at final frame
      .to({}, { duration: 0.5 });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-bg-level-1 text-text-body overflow-clip m-0 p-0 z-20"
    >
      {/* Viewport container */}
      <div
        ref={stickyRef}
        className="relative w-full h-full flex flex-col justify-between items-center overflow-hidden py-12 px-6 sm:px-16"
      >
        
        {/* Title */}
        <div className="text-center space-y-2 max-w-lg z-20">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-coral block">
            09 / TIMELINE CHOREOGRAPHY
          </span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-text-heading leading-none">
            Every frame has a purpose.
          </h2>
        </div>

        {/* Dynamic Preview Monitor Panel */}
        <div
          ref={previewMonitor}
          className="relative w-[85vw] md:w-[60vw] lg:w-[48vw] aspect-video bg-[#000] border border-border-subtle rounded-2xl overflow-hidden z-10 flex items-center justify-center shadow-2xl transition-all duration-300"
        >
          {/* Looping Cinematic Footage */}
          <video
            ref={previewVideo}
            src="https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4"
            className="w-full h-full object-cover filter saturate-[0.3] contrast-[0.8] brightness-[1.1] transition-all"
            autoPlay
            loop
            muted
            playsInline
          />

          {/* Timecode counter overlay */}
          <div className="absolute bottom-4 right-4 bg-bg-level-0/80 px-3 py-1 border border-border-subtle text-[9px] tracking-widest uppercase font-mono text-accent-cool rounded font-black">
            LOCKED / REC.709
          </div>

          {/* Fullscreen title overlay */}
          <div
            ref={fullScreenText}
            className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-0 z-20 bg-black/40 px-6 pointer-events-none"
          >
            <h3 className="text-5xl sm:text-8xl font-black tracking-tighter uppercase text-text-heading leading-none">
              EVERY LAYER.<br />
              <span className="text-accent-coral">ONE STORY.</span>
            </h3>
          </div>
        </div>

        {/* Professional Editing Timeline Interface */}
        <div
          ref={timelineWorkspace}
          className="w-full max-w-5xl bg-bg-level-2 border border-border-subtle rounded-2xl p-6 space-y-4 shadow-2xl z-20"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted-meta">MOCK TIMELINE WORKSPACE</span>
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
          </div>

          {/* Timeline Tracks */}
          <div className="space-y-2 font-mono text-[9px] font-black tracking-widest text-text-muted-meta">
            
            {/* Color LUT Track */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <span className="col-span-2 text-right">LUT COLOR</span>
              <div className="col-span-10 h-4 bg-bg-level-0/40 rounded overflow-hidden relative">
                <div 
                  ref={trackColorLayer}
                  className="h-full bg-accent-coral/20 border border-border-accent w-[80%] rounded origin-left"
                />
              </div>
            </div>

            {/* Video track */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <span className="col-span-2 text-right">VIDEO A</span>
              <div className="col-span-10 h-6 bg-bg-level-0/40 rounded overflow-hidden relative">
                <div 
                  ref={trackVideoBlock}
                  className="h-full bg-bg-level-3 border border-border-subtle w-[70%] rounded origin-left flex items-center px-4 text-text-heading"
                >
                  MASTER_A001.MOV
                </div>
              </div>
            </div>

            {/* B-Roll Track */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <span className="col-span-2 text-right">B-ROLL</span>
              <div className="col-span-10 h-6 bg-bg-level-0/40 rounded overflow-hidden relative">
                <div 
                  ref={trackBRollBlock}
                  className="h-full bg-accent-cool/20 border border-border-subtle w-[45%] ml-[30%] rounded origin-left flex items-center px-4 text-text-heading"
                >
                  B_ROLL_DETAIL_2.MXF
                </div>
              </div>
            </div>

            {/* Music Track */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <span className="col-span-2 text-right">MUSIC</span>
              <div className="col-span-10 h-6 bg-bg-level-0/40 rounded overflow-hidden relative flex items-center">
                <div 
                  ref={trackMusicWave}
                  className="h-3/4 bg-accent-coral/20 border border-border-accent rounded origin-left overflow-hidden flex items-center justify-around px-2"
                >
                  {/* Waveform lines */}
                  {[...Array(24)].map((_, i) => (
                    <span 
                      key={i} 
                      className="w-[2px] bg-accent-coral/80 rounded" 
                      style={{ height: `${20 + Math.random() * 70}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Text layers */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <span className="col-span-2 text-right">TITLES</span>
              <div className="col-span-10 h-5 bg-bg-level-0/40 rounded overflow-hidden relative">
                <div 
                  ref={trackTextLayer}
                  className="h-full bg-surface-media border border-border-subtle w-[35%] ml-[10%] rounded origin-left flex items-center px-4 text-accent-coral"
                >
                  VOGUE_TITLE_INTRO
                </div>
              </div>
            </div>

            {/* SFX Track */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <span className="col-span-2 text-right">SFX</span>
              <div className="col-span-10 h-5 bg-bg-level-0/40 rounded overflow-hidden relative flex items-center px-4">
                <div 
                  ref={trackSFXLayer}
                  className="h-3 w-6 bg-[#1e293b] rounded border border-border-subtle flex items-center justify-center text-[7px]"
                >
                  WOOSH
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
