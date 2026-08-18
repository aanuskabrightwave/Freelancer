"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import CinematicHero from "@/components/landing/CinematicHero";

// ============================================================================
// DATA SETS (Curated for Editorial Creative Marketplace)
// ============================================================================

const disciplines = [
  {
    num: "01",
    name: "Photography",
    sub: "Weddings, fashion, editorial portraits, commercial products, food, architecture & corporate photography.",
    tags: ["Weddings", "Fashion", "Editorial", "Commercial", "Architecture"],
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    href: "/freelancers?profession=PHOTOGRAPHER",
    aspect: "aspect-[16/11]",
    colSpan: "lg:col-span-7",
  },
  {
    num: "02",
    name: "Videography",
    sub: "Commercial films, luxury wedding cinema, music videos, documentaries, property tours & narrative productions.",
    tags: ["Commercials", "Documentary", "Wedding Cinema", "Music Video"],
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85",
    href: "/freelancers?profession=VIDEOGRAPHER",
    aspect: "aspect-[16/11]",
    colSpan: "lg:col-span-5",
  },
  {
    num: "03",
    name: "Post-Production",
    sub: "Narrative video editing, high-end beauty retouching, ACES color grading, motion graphics & sound mixing.",
    tags: ["Color Grading", "Video Editing", "Retouching", "Motion Graphics"],
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
    href: "/freelancers?profession=VIDEO_EDITOR",
    aspect: "aspect-[16/10]",
    colSpan: "lg:col-span-6",
  },
  {
    num: "04",
    name: "Production Support",
    sub: "Camera operators, gaffers, sound recordists, certified drone pilots, wardrobe stylists & studio spaces.",
    tags: ["FPV Cinematography", "Lighting / Gaffer", "Audio", "Equipment Rigs"],
    image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=85",
    href: "/freelancers?profession=DRONE_OPERATOR",
    aspect: "aspect-[16/10]",
    colSpan: "lg:col-span-6",
  },
];

const hiringSteps = [
  {
    step: "01",
    title: "Discover",
    desc: "Search verified professionals by exact service, camera package, visual portfolio, location, and verified availability.",
  },
  {
    step: "02",
    title: "Request",
    desc: "Choose a curated package or send a bespoke project brief with moodboards, shoot dates, and delivery deadlines.",
  },
  {
    step: "03",
    title: "Compare",
    desc: "Review transparent quotations, detailed kit lists, past verified client ratings, and production timeline milestones.",
  },
  {
    step: "04",
    title: "Book",
    desc: "Accept the proposal and fund the protected platform escrow so your production date is locked with guaranteed confidence.",
  },
  {
    step: "05",
    title: "Collaborate",
    desc: "Communicate directly in your dedicated project hub with shoot logs, location coordinates, and real-time chat.",
  },
  {
    step: "06",
    title: "Receive",
    desc: "Inspect watermarked video previews, high-res contact sheets, and color grade passes with timestamped revision tracking.",
  },
  {
    step: "07",
    title: "Approve",
    desc: "Sign off on final master exports, release creator payout from escrow, and leave a verified project review.",
  },
];

const selectedProjects = [
  {
    title: "Vogue Noir — Monochromatic Fashion Editorial",
    creator: "Maya Sen",
    category: "Fashion Photography",
    location: "Mumbai, MH",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
    aspect: "aspect-[4/5]",
    colSpan: "col-span-12 md:col-span-7",
  },
  {
    title: "Alpine Horizons — 8K Aerial Cinema",
    creator: "Karan Johar",
    category: "FPV & Heavy-Lift Cinematography",
    location: "Manali, HP",
    image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1000&q=85",
    aspect: "aspect-[4/5]",
    colSpan: "col-span-12 md:col-span-5",
  },
  {
    title: "The Artisan's Atelier — Commercial 4K Film",
    creator: "Aarav Kapoor",
    category: "Brand Campaign",
    location: "Delhi, NCR",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=85",
    aspect: "aspect-[21/9]",
    colSpan: "col-span-12",
  },
  {
    title: "Prism & Grain — DaVinci ACES Film Emulation",
    creator: "Vikram Malhotra",
    category: "Color Grading & Finishing",
    location: "Bangalore, KA",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85",
    aspect: "aspect-[4/3]",
    colSpan: "col-span-12 md:col-span-6",
  },
  {
    title: "Sanctuary of Light — Minimalist Architecture",
    creator: "Elena Rostova",
    category: "Architectural Photography",
    location: "Goa, GA",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=85",
    aspect: "aspect-[4/3]",
    colSpan: "col-span-12 md:col-span-6",
  },
];

const journeyStages = [
  {
    num: "01",
    label: "PROJECT BRIEF",
    title: "Define the Creative Direction",
    description: "Submit visual moodboards, shot lists, production dates, and delivery formats directly into the marketplace.",
    deliverable: "Creative Brief Document • Reference Imagery • Budget Range",
  },
  {
    num: "02",
    label: "PROFESSIONAL DISCOVERY",
    title: "Curate Matched Specialists",
    description: "Browse verified camera operators, DPs, and editors filtered by camera bodies (FX6, RED, ARRI), optics, and location.",
    deliverable: "Verified Profiles • Kit Specs • Direct Inquiries",
  },
  {
    num: "03",
    label: "CUSTOM PROPOSAL & QUOTATION",
    title: "Agree on Transparent Terms",
    description: "Receive itemized production bids including day rates, equipment rentals, licensing, and delivery milestones.",
    deliverable: "Milestone Contract • Payment Schedule • Schedule Lock",
  },
  {
    num: "04",
    label: "SECURE ESCROW & PRODUCTION",
    title: "Shoot with Protected Confidence",
    description: "Project funds are held in secure escrow while your creative team executes on-location filming and photography.",
    deliverable: "Secured Escrow Deposit • Production Logs • Direct Messaging",
  },
  {
    num: "05",
    label: "PREVIEW, REVISE & MASTER RELEASE",
    title: "Review Drafts & Receive Masters",
    description: "Inspect watermarked drafts and timestamped edits. Client approves final master files before funds release.",
    deliverable: "High-Res ProRes Masters • RAW Stills • Client Sign-off",
  },
];

const testimonials = [
  {
    quote:
      "Finding the right filmmaker used to take days of searching through disconnected portfolios. Now the entire process — from checking cinema camera gear to inspecting draft color grades — feels like one seamless editorial studio.",
    author: "Arjun Mehta",
    title: "Executive Creative Director",
    company: "Aura Studios London",
    project: "Global Luxury Brand Campaign",
  },
  {
    quote:
      "The protected escrow workflow and watermarked draft reviews give our brand complete peace of mind. We locked our lead fashion photographer and colorist in 48 hours and delivered under deadline.",
    author: "Sophia Chen",
    title: "Head of Brand Production",
    company: "Verve Media Collective",
    project: "12-Episode Editorial Docuseries",
  },
];

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [activeJourney, setActiveJourney] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Authenticated user redirect
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "CLIENT") {
        router.replace("/client/dashboard");
      } else if (user.role === "FREELANCER") {
        router.replace("/freelancer/dashboard");
      } else if (user.role === "ADMIN") {
        router.replace("/admin/dashboard");
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Load verified creator talent
  useEffect(() => {
    async function fetchCreators() {
      try {
        const data = await freelancerService.listFreelancers({ page: 1, page_size: 6 });
        setFeaturedCreators(data || []);
      } catch (err) {
        console.error("Failed to load featured creators:", err);
      } finally {
        setLoadingCreators(false);
      }
    }
    fetchCreators();
  }, []);

  if (isLoading || (isAuthenticated && user)) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[70vh] bg-[#080B1D]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Curated fallback profiles if database contains limited records
  const displayCreators =
    featuredCreators.length >= 3
      ? featuredCreators
      : [
          {
            id: "1",
            full_name: "Aarav Kapoor",
            professional_title: "Commercial DP & Filmmaker",
            city: "Mumbai",
            state: "MH",
            experience_years: 9,
            starting_price: "45000",
            bio: "Sony CineAlta FX6 & Venice 2 cinematographer crafting high-contrast narrative commercials, fashion films, and automotive campaigns.",
            profile_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85",
            specialty: "High-Speed Cinema",
          },
          {
            id: "2",
            full_name: "Maya Sen",
            professional_title: "Editorial Fashion Photographer",
            city: "Delhi",
            state: "DL",
            experience_years: 7,
            starting_price: "35000",
            bio: "Medium-format Hasselblad & Sony A7R V photographer capturing luxury jewelry campaigns, Vogue editorials, and celebrity portraits.",
            profile_photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
            specialty: "Medium-Format Editorial",
          },
          {
            id: "3",
            full_name: "Vikram Malhotra",
            professional_title: "Senior Colorist & Finishing Artist",
            city: "Bangalore",
            state: "KA",
            experience_years: 11,
            starting_price: "28000",
            bio: "DaVinci Resolve certified colorist with ACES pipeline expertise for feature films, music videos, and high-end streaming television.",
            profile_photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85",
            specialty: "ACES Film Emulation",
          },
        ];

  return (
    <div className="flex flex-col flex-grow bg-[#FAF9F6] text-[#080B1D] font-sans selection:bg-primary/20">
      
      {/* 1. CINEMATIC 3D CAMERA HERO SECTION (COMPLETED & APPROVED — DO NOT TOUCH) */}
      <CinematicHero />

      {/* ========================================================================= */}
      {/* SECTION 01 — EXPLORE THE CRAFT (LARGE ASYMMETRIC EDITORIAL GRID) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#FAF9F6] border-t border-[rgba(8,11,29,0.08)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
          
          {/* Header */}
          <div className="space-y-4 max-w-3xl">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
              01 — EXPLORE THE CRAFT
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-[#080B1D] leading-[0.96]">
              Every project needs <br className="hidden sm:inline" />
              a different eye.
            </h2>
            <p className="text-sm md:text-base text-[#596273] font-normal leading-relaxed">
              From the first frame to the final grade, find verified specialists for every stage of your visual project.
            </p>
          </div>

          {/* Asymmetric Editorial Category Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {disciplines.map((item) => (
              <Link
                key={item.num}
                href={item.href}
                className={`${item.colSpan} bg-[#EEEAE4] rounded-2xl overflow-hidden border border-[rgba(8,11,29,0.08)] group flex flex-col justify-between hover:shadow-xl transition-all duration-500`}
              >
                <div className={`relative ${item.aspect} w-full overflow-hidden bg-slate-200`}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover filter saturate-[0.95] contrast-[1.03] group-hover:scale-[1.03] group-hover:contrast-[1.08] transition-all duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-[#080B1D]/80 backdrop-blur-md text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full">
                    {item.num}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080B1D]/60 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                </div>
                <div className="p-8 sm:p-10 flex flex-col justify-between flex-grow space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl sm:text-3xl font-black text-[#080B1D] tracking-tight group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      <span className="text-primary font-black text-lg group-hover:translate-x-1.5 transition-transform">
                        &rarr;
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#596273] leading-relaxed">
                      {item.sub}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[rgba(8,11,29,0.08)] flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-black uppercase tracking-wider text-[#596273] bg-[#FAF9F6] px-2.5 py-1 rounded-md border border-[rgba(8,11,29,0.06)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 02 — FEATURED CREATIVES (ASYMMETRIC EDITORIAL PORTFOLIO SHOWCASE) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#EEEAE4] border-t border-[rgba(8,11,29,0.08)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
                02 — FEATURED CREATIVES
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-[#080B1D] leading-[0.96]">
                Meet the people <br className="hidden sm:inline" />
                behind the work.
              </h2>
              <p className="text-sm md:text-base text-[#596273] font-normal leading-relaxed">
                Discover professionals selected for their craft, experience, and distinctive visual point of view.
              </p>
            </div>
            <Link
              href="/freelancers"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover group transition-colors self-start md:self-auto"
            >
              <span>Explore All Creatives</span>
              <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Asymmetric Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            
            {/* Primary Large Portrait (7 Columns) */}
            <div className="md:col-span-7 bg-[#FAF9F6] rounded-2xl overflow-hidden border border-[rgba(8,11,29,0.08)] group flex flex-col justify-between hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-[16/11] sm:aspect-[16/10] overflow-hidden bg-slate-200">
                <img
                  src={displayCreators[0].profile_photo_url}
                  alt={displayCreators[0].full_name}
                  className="w-full h-full object-cover object-top filter saturate-[0.95] contrast-[1.03] group-hover:scale-[1.03] group-hover:contrast-[1.08] transition-all duration-700"
                />
                <div className="absolute top-4 left-4 bg-[#080B1D]/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  VERIFIED SPECIALIST
                </div>
              </div>
              <div className="p-8 sm:p-10 flex flex-col justify-between flex-grow space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">
                    {displayCreators[0].professional_title}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#080B1D] tracking-tight group-hover:text-primary transition-colors">
                    {displayCreators[0].full_name}
                  </h3>
                  <p className="text-xs text-[#596273] mt-1 font-medium">
                    {displayCreators[0].city}, {displayCreators[0].state || "India"} • {displayCreators[0].experience_years} Years Experience
                  </p>
                  <p className="text-xs text-[#596273] mt-3 leading-relaxed max-w-lg line-clamp-2">
                    {displayCreators[0].bio}
                  </p>
                </div>
                <div className="pt-4 border-t border-[rgba(8,11,29,0.08)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#080B1D]">
                    Starting at ₹{parseInt(displayCreators[0].starting_price || "30000").toLocaleString()}
                  </span>
                  <Link
                    href={`/freelancers/${displayCreators[0].id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary group-hover:translate-x-1 transition-transform"
                  >
                    <span>View Profile</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side Stacked Editorial Cards (5 Columns) */}
            <div className="md:col-span-5 flex flex-col gap-8 justify-between">
              {displayCreators.slice(1, 3).map((creator, idx) => (
                <div
                  key={creator.id || idx}
                  className="bg-[#FAF9F6] rounded-2xl overflow-hidden border border-[rgba(8,11,29,0.08)] group flex flex-col justify-between hover:shadow-xl transition-all duration-500 flex-1"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
                    <img
                      src={creator.profile_photo_url}
                      alt={creator.full_name}
                      className="w-full h-full object-cover object-top filter saturate-[0.95] group-hover:scale-[1.03] group-hover:contrast-[1.08] transition-all duration-700"
                    />
                  </div>
                  <div className="p-6 sm:p-7 flex flex-col justify-between flex-grow space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">
                        {creator.professional_title}
                      </span>
                      <h4 className="text-xl font-black text-[#080B1D] tracking-tight group-hover:text-primary transition-colors">
                        {creator.full_name}
                      </h4>
                      <p className="text-xs text-[#596273] mt-0.5 font-medium">
                        {creator.city} • Starting at ₹{parseInt(creator.starting_price || "25000").toLocaleString()}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[rgba(8,11,29,0.08)] flex items-center justify-between">
                      <span className="text-[11px] text-[#596273]">
                        {creator.specialty || `${creator.experience_years} Years Master`}
                      </span>
                      <Link
                        href={`/freelancers/${creator.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-primary group-hover:translate-x-1 transition-transform"
                      >
                        <span>Profile</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 03 — HOW HIRING WORKS (7-STAGE HORIZONTAL EDITORIAL TIMELINE) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-28 sm:py-32 bg-[#FAF9F6] border-t border-[rgba(8,11,29,0.08)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-20">
          
          {/* Header */}
          <div className="space-y-4 max-w-2xl">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
              03 — FROM BRIEF TO BOOKING
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-[#080B1D] leading-[0.96]">
              Hiring creative talent <br className="hidden sm:inline" />
              should feel simple.
            </h2>
            <p className="text-sm md:text-base text-[#596273] font-normal leading-relaxed">
              A transparent, end-to-end production workflow designed specifically for professional media campaigns.
            </p>
          </div>

          {/* 7-Step Editorial Horizontal Sequence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hiringSteps.map((s, idx) => (
              <div
                key={s.step}
                className={`bg-[#EEEAE4] border border-[rgba(8,11,29,0.08)] rounded-2xl p-7 space-y-4 shadow-sm hover:shadow-md transition-all ${
                  idx === 6 ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-[#080B1D] text-white flex items-center justify-center font-black text-xs tracking-widest shadow-sm">
                    {s.step}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    STAGE {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#080B1D] tracking-tight">
                  {s.title}
                </h3>
                <p className="text-xs text-[#596273] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 04 — SELECTED WORK (ASYMMETRIC MASONRY EDITORIAL GALLERY) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#EEEAE4] border-t border-[rgba(8,11,29,0.08)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
                04 — SELECTED WORK
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-[#080B1D] leading-[0.96]">
                The work speaks first.
              </h2>
              <p className="text-sm md:text-base text-[#596273] font-normal leading-relaxed">
                Explore projects created by photographers, filmmakers, and post-production specialists across the network.
              </p>
            </div>
            <Link
              href="/freelancers"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover group transition-colors self-start md:self-auto"
            >
              <span>Explore All Projects</span>
              <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Asymmetric Gallery Grid */}
          <div className="grid grid-cols-12 gap-8">
            {selectedProjects.map((work, idx) => (
              <div
                key={idx}
                className={`${work.colSpan} bg-[#FAF9F6] rounded-2xl overflow-hidden border border-[rgba(8,11,29,0.08)] group relative shadow-sm hover:shadow-2xl transition-all duration-500`}
              >
                <div className={`relative ${work.aspect} w-full overflow-hidden bg-slate-200`}>
                  <img
                    src={work.image}
                    alt={work.title}
                    className="w-full h-full object-cover filter saturate-[0.95] contrast-[1.04] group-hover:scale-[1.03] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080B1D]/85 via-[#080B1D]/25 to-transparent flex flex-col justify-end p-8 sm:p-10 transition-opacity">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary block">
                        {work.category} • {work.location}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                        {work.title}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium pt-1">
                        By {work.creator}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 05 — CREATIVE SPOTLIGHT (MAGAZINE EDITORIAL FEATURE) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#FAF9F6] border-t border-[rgba(8,11,29,0.08)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
          
          <div className="space-y-4 max-w-2xl">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
              05 — CREATIVE SPOTLIGHT
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-[#080B1D] leading-[0.96]">
              More than a profile. <br className="hidden sm:inline" />
              A point of view.
            </h2>
          </div>

          {/* Magazine 60/40 Spotlight Layout */}
          <div className="bg-[#EEEAE4] border border-[rgba(8,11,29,0.08)] rounded-3xl p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center shadow-lg">
            
            {/* 60% Visual Hero Portrait */}
            <div className="lg:col-span-7 relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-200 border border-[rgba(8,11,29,0.08)] shadow-md">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1400&q=85"
                alt="Aarav Kapoor — Commercial Cinematographer"
                className="w-full h-full object-cover object-center filter contrast-[1.05]"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-[#080B1D]/85 backdrop-blur-md text-white p-4 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold block">Sony CineAlta FX6 & Venice 2</span>
                  <span className="text-[10px] text-slate-400">Cooke Optics Prime Lenses • ARRI Master Grip</span>
                </div>
                <span className="text-primary font-black uppercase text-[10px] tracking-widest">
                  VERIFIED DP
                </span>
              </div>
            </div>

            {/* 40% Editorial Content */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-primary">
                  COMMERCIAL CINEMATOGRAPHER
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-[#080B1D] tracking-tight">
                  Aarav Kapoor
                </h3>
                <p className="text-xs text-[#596273] font-medium">
                  Mumbai, Maharashtra • 9 Years Feature & Commercial Experience
                </p>
              </div>

              <blockquote className="text-sm md:text-base text-[#080B1D] font-medium leading-relaxed italic border-l-2 border-primary pl-4">
                “Every script has an organic optical texture. Choosing the right focal length, lighting ratio, and grain structure is what transforms footage into cinema.”
              </blockquote>

              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#596273] block">
                  SPECIALIZES IN
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-[#080B1D] bg-[#FAF9F6] px-3 py-1 rounded-md border border-[rgba(8,11,29,0.08)]">
                    Wedding Cinema
                  </span>
                  <span className="text-xs font-bold text-[#080B1D] bg-[#FAF9F6] px-3 py-1 rounded-md border border-[rgba(8,11,29,0.08)]">
                    Commercial Video
                  </span>
                  <span className="text-xs font-bold text-[#080B1D] bg-[#FAF9F6] px-3 py-1 rounded-md border border-[rgba(8,11,29,0.08)]">
                    Color Direction
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/freelancers"
                  className="bg-[#080B1D] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-flex items-center gap-2 shadow-lg"
                >
                  <span>View Profile</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 06 — TRUST & WHY USE THE PLATFORM (DARK CINEMATIC EDITORIAL) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#101114] text-[#F7F3ED] border-y border-white/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-20 relative z-10">
          
          {/* Header */}
          <div className="space-y-4 max-w-2xl">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
              06 — CREATED FOR CONFIDENCE
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-white leading-[0.96]">
              Great work needs <br className="hidden sm:inline" />
              a trusted process.
            </h2>
            <p className="text-sm md:text-base text-slate-400 font-normal leading-relaxed">
              We eliminated generic bidding friction to build a secure, high-trust environment for serious visual creators and clients.
            </p>
          </div>

          {/* Numbered Editorial List */}
          <div className="divide-y divide-white/10 border-y border-white/10">
            
            {/* Item 01 */}
            <div className="py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start group hover:bg-white/[0.02] px-4 -mx-4 transition-colors">
              <div className="md:col-span-2 text-2xl font-black text-primary">
                01
              </div>
              <div className="md:col-span-4">
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors">
                  Verified Professionals
                </h3>
              </div>
              <div className="md:col-span-6 text-xs md:text-sm text-slate-400 leading-relaxed">
                Work with creatives whose identities, camera packages, lighting gear, and past client projects are verified by the platform.
              </div>
            </div>

            {/* Item 02 */}
            <div className="py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start group hover:bg-white/[0.02] px-4 -mx-4 transition-colors">
              <div className="md:col-span-2 text-2xl font-black text-primary">
                02
              </div>
              <div className="md:col-span-4">
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors">
                  Transparent Services & Packages
                </h3>
              </div>
              <div className="md:col-span-6 text-xs md:text-sm text-slate-400 leading-relaxed">
                Compare standardized packages, day rates, equipment inclusions, and delivery formats without hidden agency markups.
              </div>
            </div>

            {/* Item 03 */}
            <div className="py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start group hover:bg-white/[0.02] px-4 -mx-4 transition-colors">
              <div className="md:col-span-2 text-2xl font-black text-primary">
                03
              </div>
              <div className="md:col-span-4">
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors">
                  Secure Escrow Payments
                </h3>
              </div>
              <div className="md:col-span-6 text-xs md:text-sm text-slate-400 leading-relaxed">
                Project funds are locked safely in escrow when booking starts, and are only disbursed to the creator upon final client approval.
              </div>
            </div>

            {/* Item 04 */}
            <div className="py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start group hover:bg-white/[0.02] px-4 -mx-4 transition-colors">
              <div className="md:col-span-2 text-2xl font-black text-primary">
                04
              </div>
              <div className="md:col-span-4">
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors">
                  Review Before Final Delivery
                </h3>
              </div>
              <div className="md:col-span-6 text-xs md:text-sm text-slate-400 leading-relaxed">
                Clients receive watermarked video drafts and contact sheets to submit timestamped revision notes before master exports are unlocked.
              </div>
            </div>

            {/* Item 05 */}
            <div className="py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start group hover:bg-white/[0.02] px-4 -mx-4 transition-colors">
              <div className="md:col-span-2 text-2xl font-black text-primary">
                05
              </div>
              <div className="md:col-span-4">
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors">
                  Completed-Booking Reviews
                </h3>
              </div>
              <div className="md:col-span-6 text-xs md:text-sm text-slate-400 leading-relaxed">
                Every rating and review is permanently linked to an authentic completed project on the platform, preventing artificial reputation claims.
              </div>
            </div>

            {/* Item 06 */}
            <div className="py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start group hover:bg-white/[0.02] px-4 -mx-4 transition-colors">
              <div className="md:col-span-2 text-2xl font-black text-primary">
                06
              </div>
              <div className="md:col-span-4">
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors">
                  Structured Dispute Protection
                </h3>
              </div>
              <div className="md:col-span-6 text-xs md:text-sm text-slate-400 leading-relaxed">
                Dedicated 24-hour review windows and resolution support ensure both creators and clients are treated fairly if unexpected adjustments arise.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 07 — THE PROJECT JOURNEY (EDITORIAL SCROLLING WORKFLOW) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#FAF9F6] border-b border-[rgba(8,11,29,0.08)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-20">
          
          <div className="space-y-4 max-w-2xl">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
              07 — ONE CONNECTED WORKFLOW
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-[#080B1D] leading-[0.96]">
              From idea to final delivery.
            </h2>
            <p className="text-sm md:text-base text-[#596273] font-normal leading-relaxed">
              Step through the unified production pipeline connecting clients and creative directors in one hub.
            </p>
          </div>

          {/* Interactive Editorial Journey Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Progress Step Nav */}
            <div className="lg:col-span-5 space-y-4">
              {journeyStages.map((stage, idx) => (
                <div
                  key={stage.num}
                  onClick={() => setActiveJourney(idx)}
                  className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                    activeJourney === idx
                      ? "bg-[#EEEAE4] border-primary/30 shadow-sm"
                      : "bg-[#FAF9F6] border-[rgba(8,11,29,0.08)] hover:bg-[#EEEAE4]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-md ${
                        activeJourney === idx
                          ? "bg-primary text-white"
                          : "bg-[rgba(8,11,29,0.08)] text-[#080B1D]"
                      }`}
                    >
                      {stage.num}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#596273]">
                      {stage.label}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-[#080B1D] mt-3">
                    {stage.title}
                  </h4>
                </div>
              ))}
            </div>

            {/* Right Column: Active Stage Detail Presentation */}
            <div className="lg:col-span-7 bg-[#EEEAE4] rounded-3xl p-8 sm:p-12 border border-[rgba(8,11,29,0.08)] space-y-8 sticky top-28 shadow-md">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  STAGE {journeyStages[activeJourney].num} • {journeyStages[activeJourney].label}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#080B1D] tracking-tight">
                  {journeyStages[activeJourney].title}
                </h3>
              </div>

              <p className="text-sm md:text-base text-[#596273] leading-relaxed">
                {journeyStages[activeJourney].description}
              </p>

              <div className="p-6 bg-[#FAF9F6] rounded-2xl border border-[rgba(8,11,29,0.08)] space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#596273] block">
                  KEY DELIVERABLE & ARTIFACTS
                </span>
                <p className="text-xs font-bold text-[#080B1D]">
                  {journeyStages[activeJourney].deliverable}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/freelancers"
                  className="bg-[#080B1D] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition inline-flex items-center gap-2"
                >
                  <span>Explore Production Network</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 08 — FOR CLIENTS / FOR CREATIVES (EDITORIAL SPLIT-SCREEN) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#EEEAE4] border-b border-[rgba(8,11,29,0.08)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
              TWO SIDES OF THE PLATFORM
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight text-[#080B1D] leading-[0.96]">
              Built for both sides of the lens.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: For Clients */}
            <div className="bg-[#FAF9F6] border border-[rgba(8,11,29,0.08)] rounded-3xl overflow-hidden group flex flex-col justify-between hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1000&q=85"
                  alt="Client production finished film"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-[#080B1D]/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  FOR CLIENTS & BRANDS
                </div>
              </div>
              <div className="p-8 sm:p-12 space-y-6 flex flex-col justify-between flex-grow">
                <div className="space-y-3">
                  <h3 className="text-3xl sm:text-4xl font-black text-[#080B1D] tracking-tight">
                    I need creative talent.
                  </h3>
                  <p className="text-sm text-[#596273] leading-relaxed">
                    Find verified cinematographers, fashion photographers, editors, and colorists for your next shoot, film, commercial, or post-production project.
                  </p>
                </div>
                <div className="pt-4 border-t border-[rgba(8,11,29,0.08)]">
                  <Link
                    href="/freelancers"
                    className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-flex items-center gap-2 shadow-md shadow-primary/20"
                  >
                    <span>Find Talent</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: For Creatives */}
            <div className="bg-[#FAF9F6] border border-[rgba(8,11,29,0.08)] rounded-3xl overflow-hidden group flex flex-col justify-between hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=85"
                  alt="Creative professional on set"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-[#080B1D]/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  FOR CREATIVE PROFESSIONALS
                </div>
              </div>
              <div className="p-8 sm:p-12 space-y-6 flex flex-col justify-between flex-grow">
                <div className="space-y-3">
                  <h3 className="text-3xl sm:text-4xl font-black text-[#080B1D] tracking-tight">
                    I create for a living.
                  </h3>
                  <p className="text-sm text-[#596273] leading-relaxed">
                    Build your professional profile, showcase your equipment packages, receive qualified commercial opportunities, and grow your creative business.
                  </p>
                </div>
                <div className="pt-4 border-t border-[rgba(8,11,29,0.08)]">
                  <Link
                    href="/register"
                    className="bg-[#080B1D] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-flex items-center gap-2 shadow-md"
                  >
                    <span>Join as a Creative</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 09 — TESTIMONIAL / TRUST STORY (LARGE EDITORIAL QUOTATION) */}
      {/* ========================================================================= */}
      <section className="py-28 sm:py-32 bg-[#FAF9F6] border-b border-[rgba(8,11,29,0.08)]">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 space-y-16">
          
          <div className="text-center space-y-4">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary block">
              08 — BUILT THROUGH GREAT WORK
            </span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-[#080B1D]">
              Trusted by agencies, brands, and directors.
            </h2>
          </div>

          {/* Large Editorial Quotation */}
          <div className="bg-[#EEEAE4] rounded-3xl p-10 sm:p-16 border border-[rgba(8,11,29,0.08)] relative shadow-md">
            <div className="text-primary text-6xl font-serif leading-none select-none mb-6">
              “
            </div>
            <blockquote className="text-xl sm:text-2xl lg:text-3xl font-medium text-[#080B1D] leading-snug tracking-tight">
              {testimonials[activeTestimonial].quote}
            </blockquote>

            <div className="mt-12 pt-8 border-t border-[rgba(8,11,29,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h4 className="font-black text-base text-[#080B1D]">
                  {testimonials[activeTestimonial].author}
                </h4>
                <p className="text-xs text-[#596273] mt-0.5">
                  {testimonials[activeTestimonial].title} • <strong>{testimonials[activeTestimonial].company}</strong>
                </p>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary mt-1 block">
                  Project: {testimonials[activeTestimonial].project}
                </span>
              </div>

              {/* Manual Switcher Buttons */}
              <div className="flex gap-3">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTestimonial(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      activeTestimonial === idx
                        ? "bg-primary w-8"
                        : "bg-[rgba(8,11,29,0.2)] hover:bg-[rgba(8,11,29,0.4)]"
                    }`}
                    aria-label={`Show testimonial ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 10 — FINAL EMOTIONAL CTA (CINEMATIC CLOSING MOMENT) */}
      {/* ========================================================================= */}
      <section className="py-32 sm:py-36 bg-[#101114] text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-10 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white">
            <span className="text-[10px] font-black uppercase tracking-widest">
              THE PREMIUM CREATIVE NETWORK
            </span>
          </div>

          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[0.95] max-w-3xl mx-auto">
            Your next great project starts with the right creative.
          </h2>

          <p className="text-sm md:text-base text-slate-300 font-normal max-w-xl mx-auto leading-relaxed">
            Discover photographers, filmmakers, editors, and specialists ready to help bring your next idea to life.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs uppercase tracking-wider px-9 py-4 rounded-xl transition shadow-xl shadow-primary/25 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>Find Talent</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/register"
              className="bg-transparent hover:bg-white/10 text-white border border-white/25 font-extrabold text-xs uppercase tracking-wider px-9 py-4 rounded-xl transition inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>Join as a Creative</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="pt-6 text-xs text-slate-400">
            Looking for enterprise bespoke production teams?{" "}
            <Link href="/freelancers" className="text-primary hover:underline font-bold inline-flex items-center gap-0.5">
              <span>Browse certified agencies</span>
              <span>&rarr;</span>
            </Link>
          </div>

        </div>

        {/* Ambient Warm Coral Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-0" />
      </section>

    </div>
  );
}
