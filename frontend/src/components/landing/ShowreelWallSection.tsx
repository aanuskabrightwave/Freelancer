"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const ROW_1 = [
  { id: 11, title: "Midnight Car Wash", cat: "Automotive Film", creator: "Maya Sen", aspect: "w-[320px] aspect-[16/9]", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4" },
  { id: 12, title: "Neon Reflections", cat: "Cyber Fashion", creator: "Aarav Mehta", aspect: "w-[240px] aspect-[4/5]", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4" },
  { id: 13, title: "Street Dancers", cat: "Music Video", creator: "Rohan Das", aspect: "w-[260px] aspect-[1/1]", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4" },
  { id: 14, title: "Himalayan Ride", cat: "Documentary", creator: "Sameer Khan", aspect: "w-[200px] aspect-[9/16]", image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" },
  { id: 15, title: "The Coffee Roast", cat: "SaaS Commercial", creator: "Priya Sharma", aspect: "w-[300px] aspect-[16/9]", image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-a-laptop-in-a-cafe-42323-large.mp4" }
];

const ROW_2 = [
  { id: 21, title: "Waves & Grain", cat: "ACES Emulation", creator: "Priya Sharma", aspect: "w-[200px] aspect-[9/16]", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4" },
  { id: 22, title: "Bandra Sunsets", cat: "Wedding Cinema", creator: "Maya Sen", aspect: "w-[320px] aspect-[16/9]", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4" },
  { id: 23, title: "The Craft Shop", cat: "Brand Campaign", creator: "Aarav Mehta", aspect: "w-[240px] aspect-[4/5]", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-a-laptop-in-a-cafe-42323-large.mp4" },
  { id: 24, title: "Mountain FPV Flyby", cat: "FPV Cinema", creator: "Sameer Khan", aspect: "w-[260px] aspect-[1/1]", image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" },
  { id: 25, title: "Street Rhythms", cat: "Fashion Editorial", creator: "Rohan Das", aspect: "w-[200px] aspect-[9/16]", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4" }
];

const ROW_3 = [
  { id: 31, title: "Architectural Lines", cat: "Commercial Stills", creator: "Rohan Das", aspect: "w-[260px] aspect-[1/1]", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4" },
  { id: 32, title: "Forest Streams", cat: "Documentary Short", creator: "Sameer Khan", aspect: "w-[200px] aspect-[9/16]", image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" },
  { id: 33, title: "The Office Flow", cat: "Corporate Reel", creator: "Priya Sharma", aspect: "w-[320px] aspect-[16/9]", image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-a-laptop-in-a-cafe-42323-large.mp4" },
  { id: 34, title: "Bells & Stills", cat: "Luxury Wedding", creator: "Maya Sen", aspect: "w-[240px] aspect-[4/5]", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4" },
  { id: 35, title: "The Street Edit", cat: "Reels / Social", creator: "Aarav Mehta", aspect: "w-[260px] aspect-[1/1]", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80", video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4" }
];

export default function ShowreelWallSection() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const row3Ref = useRef<HTMLDivElement>(null);

  // Keep track of tween animation control
  const tween1 = useRef<gsap.core.Tween | null>(null);
  const tween2 = useRef<gsap.core.Tween | null>(null);
  const tween3 = useRef<gsap.core.Tween | null>(null);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (row1Ref.current && row2Ref.current && row3Ref.current) {
      // Initialize marquees
      tween1.current = gsap.to(row1Ref.current, {
        xPercent: -50,
        ease: "none",
        duration: 25,
        repeat: -1
      });

      tween2.current = gsap.to(row2Ref.current, {
        xPercent: 50,
        ease: "none",
        duration: 25,
        repeat: -1
      });
      // Start row2 shifted so it matches correctly
      gsap.set(row2Ref.current, { xPercent: -50 });

      tween3.current = gsap.to(row3Ref.current, {
        xPercent: -50,
        ease: "none",
        duration: 25,
        repeat: -1
      });
    }

    return () => {
      tween1.current?.kill();
      tween2.current?.kill();
      tween3.current?.kill();
    };
  }, []);

  const handleMouseEnter = (id: number, rowIdx: number) => {
    setHoveredId(id);
    
    // Slow down the corresponding row marquee loop on hover
    if (rowIdx === 1) {
      gsap.to(tween1.current, { timeScale: 0.1, duration: 0.6 });
    } else if (rowIdx === 2) {
      gsap.to(tween2.current, { timeScale: 0.1, duration: 0.6 });
    } else if (rowIdx === 3) {
      gsap.to(tween3.current, { timeScale: 0.1, duration: 0.6 });
    }
  };

  const handleMouseLeave = (rowIdx: number) => {
    setHoveredId(null);

    // Resume the marquee speed
    if (rowIdx === 1) {
      gsap.to(tween1.current, { timeScale: 1, duration: 0.6 });
    } else if (rowIdx === 2) {
      gsap.to(tween2.current, { timeScale: 1, duration: 0.6 });
    } else if (rowIdx === 3) {
      gsap.to(tween3.current, { timeScale: 1, duration: 0.6 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <section className="pt-32 pb-8 md:pb-10 lg:pb-12 bg-bg-level-0 border-t border-border-subtle relative z-20 text-text-body overflow-hidden">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-4 mb-20 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-coral block">
          10 / MADE ON THE PLATFORM
        </span>
        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-text-heading leading-none">
          Showreel Wall
        </h2>
      </div>

      {/* Rows Container */}
      <div className="space-y-6 select-none relative z-10 w-full overflow-hidden">
        
        {/* ROW 1: Moves Leftwards */}
        <div className="w-full flex">
          <div 
            ref={row1Ref}
            className="flex gap-6 whitespace-nowrap pr-6 w-fit"
          >
            {[...ROW_1, ...ROW_1].map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onMouseEnter={() => handleMouseEnter(item.id, 1)}
                onMouseLeave={() => handleMouseLeave(1)}
                onMouseMove={handleMouseMove}
                className={`${item.aspect} relative bg-bg-level-3 border border-border-subtle rounded-xl overflow-hidden group cursor-none flex-shrink-0 transition-transform duration-500 ease-out`}
              >
                {/* Custom pointer cursor inside card */}
                {hoveredId === item.id && (
                  <div
                    className="absolute pointer-events-none z-30 w-16 h-16 rounded-full bg-accent-coral text-text-heading flex items-center justify-center text-[8px] font-black uppercase tracking-widest shadow-2xl transition-transform duration-100 ease-out"
                    style={{
                      left: `${mousePos.x - 32}px`,
                      top: `${mousePos.y - 32}px`,
                      transform: "scale(1.1)"
                    }}
                  >
                    VIEW
                  </div>
                )}

                {/* Media frame */}
                <div className="absolute inset-0 w-full h-full z-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover filter brightness-[0.75] saturate-[0.8] transition-transform duration-700 ease-out-quint group-hover:scale-103"
                  />
                  {hoveredId === item.id && (
                    <video
                      src={item.video}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-level-0/80 via-bg-level-0/10 to-transparent" />
                </div>

                {/* Overlaid details */}
                <div className="absolute bottom-4 left-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="text-[8px] font-black uppercase tracking-widest text-accent-coral block">{item.cat}</span>
                  <h4 className="text-sm font-black tracking-tight text-text-heading leading-tight">{item.title}</h4>
                  <p className="text-[9px] text-text-sub font-bold">By {item.creator}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 2: Moves Rightwards */}
        <div className="w-full flex">
          <div 
            ref={row2Ref}
            className="flex gap-6 whitespace-nowrap pr-6 w-fit"
          >
            {[...ROW_2, ...ROW_2].map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onMouseEnter={() => handleMouseEnter(item.id, 2)}
                onMouseLeave={() => handleMouseLeave(2)}
                onMouseMove={handleMouseMove}
                className={`${item.aspect} relative bg-bg-level-3 border border-border-subtle rounded-xl overflow-hidden group cursor-none flex-shrink-0 transition-transform duration-500 ease-out`}
              >
                {/* Custom pointer cursor inside card */}
                {hoveredId === item.id && (
                  <div
                    className="absolute pointer-events-none z-30 w-16 h-16 rounded-full bg-accent-coral text-text-heading flex items-center justify-center text-[8px] font-black uppercase tracking-widest shadow-2xl transition-transform duration-100 ease-out"
                    style={{
                      left: `${mousePos.x - 32}px`,
                      top: `${mousePos.y - 32}px`,
                      transform: "scale(1.1)"
                    }}
                  >
                    VIEW
                  </div>
                )}

                {/* Media frame */}
                <div className="absolute inset-0 w-full h-full z-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover filter brightness-[0.75] saturate-[0.8] transition-transform duration-700 ease-out-quint group-hover:scale-103"
                  />
                  {hoveredId === item.id && (
                    <video
                      src={item.video}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-level-0/80 via-bg-level-0/10 to-transparent" />
                </div>

                {/* Overlaid details */}
                <div className="absolute bottom-4 left-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="text-[8px] font-black uppercase tracking-widest text-accent-coral block">{item.cat}</span>
                  <h4 className="text-sm font-black tracking-tight text-text-heading leading-tight">{item.title}</h4>
                  <p className="text-[9px] text-text-sub font-bold">By {item.creator}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 3: Moves Leftwards */}
        <div className="w-full flex">
          <div 
            ref={row3Ref}
            className="flex gap-6 whitespace-nowrap pr-6 w-fit"
          >
            {[...ROW_3, ...ROW_3].map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onMouseEnter={() => handleMouseEnter(item.id, 3)}
                onMouseLeave={() => handleMouseLeave(3)}
                onMouseMove={handleMouseMove}
                className={`${item.aspect} relative bg-bg-level-3 border border-border-subtle rounded-xl overflow-hidden group cursor-none flex-shrink-0 transition-transform duration-500 ease-out`}
              >
                {/* Custom pointer cursor inside card */}
                {hoveredId === item.id && (
                  <div
                    className="absolute pointer-events-none z-30 w-16 h-16 rounded-full bg-accent-coral text-text-heading flex items-center justify-center text-[8px] font-black uppercase tracking-widest shadow-2xl transition-transform duration-100 ease-out"
                    style={{
                      left: `${mousePos.x - 32}px`,
                      top: `${mousePos.y - 32}px`,
                      transform: "scale(1.1)"
                    }}
                  >
                    VIEW
                  </div>
                )}

                {/* Media frame */}
                <div className="absolute inset-0 w-full h-full z-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover filter brightness-[0.75] saturate-[0.8] transition-transform duration-700 ease-out-quint group-hover:scale-103"
                  />
                  {hoveredId === item.id && (
                    <video
                      src={item.video}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-level-0/80 via-bg-level-0/10 to-transparent" />
                </div>

                {/* Overlaid details */}
                <div className="absolute bottom-4 left-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="text-[8px] font-black uppercase tracking-widest text-accent-coral block">{item.cat}</span>
                  <h4 className="text-sm font-black tracking-tight text-text-heading leading-tight">{item.title}</h4>
                  <p className="text-[9px] text-text-sub font-bold">By {item.creator}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
