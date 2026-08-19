"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function FinalCTASection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timecodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [frames, setFrames] = useState(0);

  // Timecode ticking sequence
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let intervalId: any;

    ScrollTrigger.create({
      trigger: container,
      start: "top 60%",
      onEnter: () => {
        // Tick up to frame 24 (24fps cinema standard)
        let frameCount = 0;
        clearInterval(intervalId);
        intervalId = setInterval(() => {
          if (frameCount < 24) {
            frameCount++;
            setFrames(frameCount);
          } else {
            clearInterval(intervalId);
            
            // Once counting hits final frame, animate contents in
            gsap.to(contentRef.current, {
              opacity: 1,
              y: 0,
              duration: 1.2,
              ease: "power3.out"
            });
            
            // Pulsate timecode subtly
            gsap.to(timecodeRef.current, {
              color: "#E4523D",
              duration: 0.6,
              yoyo: true,
              repeat: 1
            });
          }
        }, 50); // fast tick
      }
    });

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const formatTimecode = (f: number) => {
    const padded = String(f).padStart(2, "0");
    return `00:00:00:${padded}`;
  };

  return (
    <section
      ref={containerRef}
      className="py-36 bg-[#050507] text-white relative z-20 flex flex-col justify-center items-center overflow-hidden border-t border-white/5"
    >
      <div className="max-w-4xl mx-auto px-6 text-center space-y-12 relative z-10">
        
        {/* Ticking timecode timeline indicator */}
        <div 
          ref={timecodeRef}
          className="font-mono text-xl sm:text-2xl font-black text-slate-500 tracking-[0.3em] select-none transition-colors duration-500"
        >
          {formatTimecode(frames)}
        </div>

        {/* Fading Content Wrapper */}
        <div
          ref={contentRef}
          className="space-y-8 opacity-0 translate-y-8 transition-all duration-300"
        >
          <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-[0.92] max-w-3xl mx-auto">
            YOUR NEXT STORY<br />
            STARTS HERE.
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            Find the creative talent to bring your next project to life — or put your own talent in front of the right clients.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs uppercase tracking-wider px-10 py-4 rounded-xl transition shadow-xl shadow-primary/20 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>FIND A CREATOR</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/register"
              className="bg-transparent hover:bg-white/10 text-white border border-white/20 font-extrabold text-xs uppercase tracking-wider px-10 py-4 rounded-xl transition inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>JOIN AS A CREATOR</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="pt-10 text-[9px] font-black tracking-[0.4em] text-slate-600 uppercase select-none">
            READY WHEN YOU ARE.
          </div>
        </div>

      </div>

      {/* Ambient Radial Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(228,82,61,0.03)_0%,transparent_70%)] pointer-events-none" />
    </section>
  );
}
