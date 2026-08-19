"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { freelancerService } from "@/services/freelancer.service";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FALLBACK_CREATORS = [
  {
    id: 1,
    num: "01",
    name: "Aarav Mehta",
    title: "Lead Film Editor",
    skills: "Narrative • Commercials • Music Videos",
    rating: "4.9",
    projects: "127",
    video: "https://assets.mixkit.co/videos/preview/mixkit-videographer-filming-with-a-camera-on-a-stabilizer-34483-large.mp4"
  },
  {
    id: 2,
    num: "02",
    name: "Priya Sharma",
    title: "Senior Colorist",
    skills: "ACES Grade • HDR finishing • DaVinci",
    rating: "5.0",
    projects: "94",
    video: "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-with-a-professional-camera-34487-large.mp4"
  },
  {
    id: 3,
    num: "03",
    name: "Rohan Das",
    title: "3D & Motion Designer",
    skills: "Abstract FX • CG Typo • VFX simulation",
    rating: "4.8",
    projects: "81",
    video: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4"
  },
  {
    id: 4,
    num: "04",
    name: "Sameer Khan",
    title: "FPV Drone Cinematographer",
    skills: "Action sports • Aerial shoot • Narrative",
    rating: "4.9",
    projects: "142",
    video: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4"
  }
];

export default function FeaturedCreatorsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [creators, setCreators] = useState<any[]>([]);

  // Fetch real creators or map fallback
  useEffect(() => {
    async function loadCreators() {
      try {
        const data = await freelancerService.listFreelancers({ page: 1, page_size: 4 });
        if (data && data.length >= 2) {
          const mapped = data.map((item: any, idx: number) => ({
            id: item.id,
            num: String(idx + 1).padStart(2, "0"),
            name: item.full_name,
            title: item.professional_title || "Creative Specialist",
            skills: item.specialty || "Film • Commercials",
            rating: item.average_rating ? item.average_rating.toFixed(1) : "5.0",
            projects: item.completed_jobs_count || "48",
            video: FALLBACK_CREATORS[idx % 4].video // use loops for consistent premium visuals
          }));
          setCreators(mapped);
        } else {
          setCreators(FALLBACK_CREATORS);
        }
      } catch (err) {
        console.error("Failed to load featured creators:", err);
        setCreators(FALLBACK_CREATORS);
      }
    }
    loadCreators();
  }, []);

  // Horizontal scroll trigger
  useEffect(() => {
    if (creators.length === 0) return;
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const ctx = gsap.context(() => {
      // Horizontal translation tween
      const scrollTween = gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        }
      });

      // Animate creator numbers as they enter focus
      const cards = gsap.utils.toArray(".creator-panel");
      cards.forEach((card: any) => {
        const numEl = card.querySelector(".creator-num");
        if (!numEl) return;

        gsap.fromTo(numEl, 
          { scale: 0.8, color: "#64748b" }, 
          { 
            scale: 1.25, 
            color: "#E4523D", 
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              containerAnimation: scrollTween,
              start: "left 65%",
              end: "right 35%",
              scrub: true,
            }
          }
        );
      });

    }, containerRef);

    return () => ctx.revert();
  }, [creators]);

  if (creators.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[300vh] bg-[#101114] text-white overflow-clip m-0 p-0"
    >
      {/* Sticky Fullscreen Container */}
      <div className="sticky top-0 w-full h-screen flex flex-col justify-center overflow-hidden">
        
        {/* Section Header (Moves independently on top) */}
        <div className="absolute top-20 left-16 max-w-2xl space-y-4 z-20">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
            04 / FEATURED TALENT
          </span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Meet the people<br />behind the cut.
          </h2>
        </div>

        {/* Horizontal Card Track */}
        <div
          ref={trackRef}
          className="flex gap-20 px-[20vw] items-center h-[60vh] mt-24 select-none relative z-10 w-fit"
        >
          {creators.map((creator) => (
            <div
              key={creator.id}
              className="creator-panel flex-shrink-0 w-[70vw] md:w-[50vw] lg:w-[42vw] h-[55vh] bg-[#0B0C0E] border border-white/5 rounded-2xl p-8 sm:p-10 flex flex-col justify-between relative group hover:border-white/15 hover:shadow-2xl transition-all duration-500 ease-out"
            >
              {/* Index Number */}
              <div className="absolute top-8 left-8 text-lg font-black tracking-widest text-slate-500">
                <span className="creator-num inline-block transform origin-left transition-colors">
                  {creator.num}
                </span>{" "}
                / SPECIALIST
              </div>

              {/* Looping Portfolio Video Viewport */}
              <div className="relative w-full h-[28vh] bg-slate-900 rounded-xl overflow-hidden mt-8 border border-white/5 shadow-inner">
                <video
                  src={creator.video}
                  className="w-full h-full object-cover filter saturate-[0.9] group-hover:scale-105 transition-transform duration-700 ease-out"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
              </div>

              {/* Creator details */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mt-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors duration-300">
                    {creator.name}
                  </h3>
                  <p className="text-[11px] font-black uppercase tracking-wider text-primary">
                    {creator.title}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {creator.skills}
                  </p>
                </div>

                <div className="flex items-center gap-6 sm:text-right flex-shrink-0">
                  <div className="text-xs">
                    <span className="block font-black text-white text-sm">{creator.rating} ★</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">RATING</span>
                  </div>
                  <div className="text-xs">
                    <span className="block font-black text-white text-sm">{creator.projects}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">PROJECTS</span>
                  </div>
                </div>
              </div>

              {/* Call to action */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <Link
                  href={`/freelancers/${creator.id}`}
                  className="text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-1.5"
                >
                  <span>VIEW PORTFOLIO</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </Link>
              </div>

            </div>
          ))}

          {/* End Panel / CTA to browse all */}
          <div className="flex-shrink-0 w-[40vw] sm:w-[30vw] h-[55vh] flex flex-col justify-center items-start px-12 relative">
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-6">
              Ready to find<br />your editor?
            </h3>
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <span>EXPLORE ALL TALENT</span>
              <span>&rarr;</span>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
