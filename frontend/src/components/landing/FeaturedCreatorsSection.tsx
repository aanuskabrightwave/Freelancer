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
  const [creators, setCreators] = useState<any[]>(FALLBACK_CREATORS);

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
        }
      } catch {
        // Backend offline or unreachable, retain fallback creators
      }
    }
    loadCreators();
  }, []);

  // Horizontal scroll wheel handler
  useEffect(() => {
    if (creators.length === 0) return;
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".creator-panel");

      // Dynamic function to calculate max horizontal scroll distance
      const getScrollDistance = () => track.scrollWidth - container.clientWidth;

      const handleWheel = (e: WheelEvent) => {
        const maxScroll = getScrollDistance();
        if (maxScroll <= 0) return;

        // Sync targetX with current animated position
        const currentTranslation = gsap.getProperty(track, "x") as number;
        let targetX = -currentTranslation;

        // Normalize deltaX and deltaY to handle Shift + Wheel and horizontal gestures
        const wheelDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

        const isScrollingDown = wheelDelta > 0;
        const isScrollingUp = wheelDelta < 0;

        const canScrollLeft = targetX < maxScroll && isScrollingDown;
        const canScrollRight = targetX > 0 && isScrollingUp;

        if (canScrollLeft || canScrollRight) {
          // Intercept mouse wheel, prevent native page scrolling
          e.preventDefault();

          // Apply sensitivity multiplier (1.35) for faster but controllable premium scrolling
          targetX += wheelDelta * 1.35;
          targetX = Math.max(0, Math.min(targetX, maxScroll));

          // Animate horizontal translation of the track smoothly
          gsap.to(track, {
            x: -targetX,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
            onUpdate: function() {
              const containerRect = container.getBoundingClientRect();
              const containerCenter = containerRect.left + containerRect.width / 2;
              
              cards.forEach((card: any) => {
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.left + rect.width / 2;
                const distance = Math.abs(cardCenter - containerCenter);
                const maxDist = containerRect.width * 0.4;
                
                const progress = Math.max(0, Math.min(1, 1 - distance / maxDist));
                
                const numEl = card.querySelector(".creator-num");
                if (numEl) {
                  gsap.set(numEl, {
                    scale: 0.8 + progress * 0.45,
                    color: gsap.utils.interpolate("#81776F", "#F05A47", progress),
                  });
                }
              });
            }
          });
        }
      };

      // Register non-passive wheel listener directly on the track container
      track.addEventListener("wheel", handleWheel, { passive: false });

      // Run initial highlight after mount
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        
        cards.forEach((card: any) => {
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const distance = Math.abs(cardCenter - containerCenter);
          const maxDist = containerRect.width * 0.4;
          
          const progress = Math.max(0, Math.min(1, 1 - distance / maxDist));
          
          const numEl = card.querySelector(".creator-num");
          if (numEl) {
            gsap.set(numEl, {
              scale: 0.8 + progress * 0.45,
              color: gsap.utils.interpolate("#81776F", "#F05A47", progress),
            });
          }
        });
      }, 100);

      // Clean up event listener
      return () => {
        track.removeEventListener("wheel", handleWheel);
      };

    }, containerRef);

    return () => ctx.revert();
  }, [creators]);

  if (creators.length === 0) return null;

  return (
    <section
      ref={containerRef}
      className="landing-section bg-bg-level-0 text-text-body relative z-20 overflow-hidden"
    >
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-4 mb-16">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-coral block">
          04 / FEATURED TALENT
        </span>
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-text-heading leading-none">
          Meet the people<br />behind the cut.
        </h2>
      </div>

      {/* Horizontal Card Track Wrapper */}
      <div className="w-full overflow-x-auto md:overflow-x-hidden scrollbar-hide select-none">
        <div
          ref={trackRef}
          className="flex gap-20 pl-[20vw] pr-[10vw] items-center h-[55vh] select-none relative z-10 w-fit"
        >
          {creators.map((creator) => (
            <div
              key={creator.id}
              className="creator-panel flex-shrink-0 w-[70vw] md:w-[50vw] lg:w-[42vw] h-[55vh] bg-bg-level-2 border border-border-subtle rounded-2xl p-8 sm:p-10 flex flex-col justify-between relative group hover:bg-bg-level-3 hover:border-border-accent hover:shadow-[0_16px_45px_rgba(0,0,0,0.30)] hover:-translate-y-1 transition-all duration-500 ease-out"
            >
              {/* Index Number */}
              <div className="absolute top-8 left-8 text-lg font-black tracking-widest text-text-muted-meta">
                <span className="creator-num inline-block transform origin-left transition-colors">
                  {creator.num}
                </span>{" "}
                / SPECIALIST
              </div>

              {/* Looping Portfolio Video Viewport */}
              <div className="relative w-full h-[28vh] bg-surface-media rounded-xl overflow-hidden mt-8 border border-border-subtle shadow-inner">
                <video
                  src={creator.video}
                  className="w-full h-full object-cover filter saturate-[0.9] group-hover:scale-105 transition-transform duration-700 ease-out"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-level-0/50 via-transparent to-transparent opacity-60" />
              </div>

              {/* Creator details */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mt-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-text-heading group-hover:text-accent-coral transition-colors duration-300">
                    {creator.name}
                  </h3>
                  <p className="text-[11px] font-black uppercase tracking-wider text-accent-coral">
                    {creator.title}
                  </p>
                  <p className="text-xs text-text-sub font-medium">
                    {creator.skills}
                  </p>
                </div>

                <div className="flex items-center gap-6 sm:text-right flex-shrink-0">
                  <div className="text-xs">
                    <span className="block font-black text-text-heading text-sm">{creator.rating} ★</span>
                    <span className="text-[9px] text-text-muted-meta uppercase tracking-widest block font-bold">RATING</span>
                  </div>
                  <div className="text-xs">
                    <span className="block font-black text-text-heading text-sm">{creator.projects}</span>
                    <span className="text-[9px] text-text-muted-meta uppercase tracking-widest block font-bold">PROJECTS</span>
                  </div>
                </div>
              </div>

              {/* Call to action */}
              <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                <Link
                  href={`/freelancers/${creator.id}`}
                  className="text-xs font-black uppercase tracking-wider text-accent-coral hover:opacity-80 transition-opacity inline-flex items-center gap-1.5"
                >
                  <span>VIEW PORTFOLIO</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </Link>
              </div>

            </div>
          ))}

          {/* End Panel / CTA to browse all */}
          <div className="flex-shrink-0 w-[40vw] sm:w-[30vw] h-[55vh] flex flex-col justify-center items-start px-12 relative">
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-text-heading mb-6">
              Ready to find<br />your editor?
            </h3>
            <Link
              href="/freelancers"
              className="bg-accent-coral hover:opacity-90 text-text-heading font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-accent-coral/20"
            >
              <span>EXPLORE ALL TALENT</span>
              <span>&rarr;</span>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
