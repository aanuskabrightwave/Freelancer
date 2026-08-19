"use client";

import React, { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  {
    name: "CINEMATIC",
    filter: "cinematic",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4",
    gridClass: "col-span-12 md:col-span-8 aspect-[16/10]"
  },
  {
    name: "SOCIAL / REELS",
    filter: "social_reels",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4",
    gridClass: "col-span-12 md:col-span-4 aspect-[3/4]"
  },
  {
    name: "COMMERCIAL",
    filter: "commercial",
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-a-laptop-in-a-cafe-42323-large.mp4",
    gridClass: "col-span-12 md:col-span-6 aspect-[16/9]"
  },
  {
    name: "MUSIC VIDEO",
    filter: "music_video",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4",
    gridClass: "col-span-12 md:col-span-6 aspect-[16/9]"
  },
  {
    name: "YOUTUBE",
    filter: "youtube",
    image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
    gridClass: "col-span-12 md:col-span-4 aspect-[1/1]"
  },
  {
    name: "WEDDING",
    filter: "wedding",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4",
    gridClass: "col-span-12 md:col-span-4 aspect-[1/1]"
  },
  {
    name: "DOCUMENTARY",
    filter: "documentary",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4",
    gridClass: "col-span-12 md:col-span-4 aspect-[1/1]"
  },
  {
    name: "SHORT FILM",
    filter: "short_film",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4",
    gridClass: "col-span-12 md:col-span-8 aspect-[21/9]"
  },
  {
    name: "MOTION GRAPHICS",
    filter: "motion_graphics",
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4",
    gridClass: "col-span-12 md:col-span-6 aspect-[16/10]"
  },
  {
    name: "3D / VFX",
    filter: "vfx",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85",
    video: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
    gridClass: "col-span-12 md:col-span-6 aspect-[16/10]"
  }
];

export default function EditingStylesSection() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section className="py-32 bg-[#0B0C0E] text-white border-t border-white/5 relative z-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        
        {/* Header */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
            06 / EXPLORE BY STYLE
          </span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Every story needs<br />a different cut.
          </h2>
        </div>

        {/* Asymmetric Editorial Grid */}
        <div className="grid grid-cols-12 gap-8 pt-8">
          {CATEGORIES.map((cat, idx) => (
            <Link
              key={cat.name}
              href={`/freelancers?profession=VIDEO_EDITOR&style=${cat.filter}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`${cat.gridClass} relative bg-[#101114] border border-white/5 rounded-2xl overflow-hidden group shadow-md hover:shadow-2xl transition-all duration-500`}
            >
              
              {/* Media viewport */}
              <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover filter brightness-[0.75] saturate-[0.8] transition-transform duration-700 ease-out-quint group-hover:scale-102"
                />
                <video
                  src={cat.video}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out-quint"
                  autoPlay={hoveredIdx === idx}
                  loop
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              </div>

              {/* Text overlays */}
              <div className="absolute bottom-8 left-8 right-8 z-10 flex items-center justify-between pointer-events-none">
                <h3 className="text-lg sm:text-2xl font-black tracking-tight uppercase group-hover:translate-x-1 transition-transform duration-300">
                  {cat.name}
                </h3>
                <span className="text-primary text-xl opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                  &rarr;
                </span>
              </div>

            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
