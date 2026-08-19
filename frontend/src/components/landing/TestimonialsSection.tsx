"use client";

import React, { useState, useEffect } from "react";

const TESTIMONIALS = [
  {
    quote: "WE DIDN'T JUST FIND AN EDITOR. WE FOUND THE CREATIVE PARTNER WHO UNDERSTOOD THE SOUL OF THE STORY.",
    author: "Arjun Mehta",
    role: "Executive Creative Director",
    company: "Aura Studios",
    project: "Global Luxury Campaign",
    video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4"
  },
  {
    quote: "THE ESCROW SAFETY WORKFLOW AND SECURE WATERMARKED PREVIEWS ELIMINATED ALL BIDS FRICTION.",
    author: "Sophia Chen",
    role: "Head of Brand Production",
    company: "Verve Media",
    project: "12-Episode Editorial Docuseries",
    video: "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4"
  }
];

export default function TestimonialsSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fade, setFade] = useState(true);

  // Auto transition scenes
  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 7000);
    return () => clearInterval(timer);
  }, [activeIdx]);

  const handleNext = () => {
    setFade(false);
    setTimeout(() => {
      setActiveIdx((prev) => (prev + 1) % TESTIMONIALS.length);
      setFade(true);
    }, 400);
  };

  const handlePrev = () => {
    setFade(false);
    setTimeout(() => {
      setActiveIdx((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
      setFade(true);
    }, 400);
  };

  const current = TESTIMONIALS[activeIdx];

  return (
    <section className="py-32 bg-[#0B0C0E] text-white border-t border-white/5 relative z-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        
        {/* Header */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
            12 / DIRECTORS REVIEW
          </span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Trusted by visual creators.
          </h2>
        </div>

        {/* Cinematic Review Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center pt-8">
          
          {/* Left Column: Widescreen Video Frame */}
          <div className="lg:col-span-5 aspect-[4/5] bg-black rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
            <video
              key={current.video} // Forces video reload/fade transition on source change
              src={current.video}
              className={`w-full h-full object-cover filter brightness-[0.7] saturate-[0.8] transition-opacity duration-500 ${
                fade ? "opacity-100" : "opacity-0"
              }`}
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-transparent to-transparent opacity-85" />
            <div className="absolute bottom-6 left-6 space-y-1">
              <span className="text-[9px] font-black tracking-widest text-primary uppercase block">TESTIMONIAL SCENE</span>
              <h4 className="text-sm font-black uppercase text-white font-mono">{current.project}</h4>
            </div>
          </div>

          {/* Right Column: Documentary Quote */}
          <div className="lg:col-span-7 space-y-12">
            
            <div 
              className={`space-y-6 transition-all duration-500 ${
                fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {/* Quote Mark */}
              <span className="text-primary text-6xl font-serif leading-none select-none block">&ldquo;</span>
              
              <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
                {current.quote}
              </blockquote>

              <div className="pt-6 border-t border-white/5 space-y-1">
                <h4 className="text-lg font-black text-white">{current.author}</h4>
                <p className="text-xs text-slate-400 font-medium">
                  {current.role} / <strong className="text-white font-bold">{current.company}</strong>
                </p>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary block pt-2">
                  PROJECT CATEGORY: {current.project}
                </span>
              </div>
            </div>

            {/* Cinematic scene navigators */}
            <div className="flex gap-4 items-center">
              <button 
                onClick={handlePrev}
                className="px-4 py-2 bg-[#101114] hover:bg-slate-800 border border-white/5 text-[9px] font-black uppercase tracking-widest rounded transition-all cursor-pointer"
              >
                &larr; SCENE {activeIdx === 0 ? "02" : "01"}
              </button>
              
              <span className="text-xs text-slate-500 font-mono font-bold tracking-widest">
                0{activeIdx + 1} / 0{TESTIMONIALS.length}
              </span>

              <button 
                onClick={handleNext}
                className="px-4 py-2 bg-[#101114] hover:bg-slate-800 border border-white/5 text-[9px] font-black uppercase tracking-widest rounded transition-all cursor-pointer"
              >
                SCENE {activeIdx === 0 ? "02" : "01"} &rarr;
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
