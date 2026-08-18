"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import Container from "@/components/ui/Container";
import CinematicHero from "@/components/landing/CinematicHero";

const categories = [
  {
    name: "Photography",
    sub: "Portraits, weddings, brands & events",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80",
    href: "/freelancers?profession=PHOTOGRAPHER"
  },
  {
    name: "Videography",
    sub: "Events, commercials & cinematic films",
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
    href: "/freelancers?profession=VIDEOGRAPHER"
  },
  {
    name: "Editing",
    sub: "Video post-production, reels & color grading",
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
    href: "/freelancers?profession=VIDEO_EDITOR"
  },
  {
    name: "Aerial Production",
    sub: "Drones, FPV cinematography & mapping",
    image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=800&q=80",
    href: "/freelancers?profession=DRONE_OPERATOR"
  }
];

const featuredPortfolios = [
  {
    title: "Luxury Wedding Film",
    creator: "Rahul Sharma",
    profession: "Videographer",
    city: "Mumbai",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    ratio: "aspect-[16/10] md:col-span-2"
  },
  {
    title: "Editorial Fashion Portrait",
    creator: "Aditi Sen",
    profession: "Photographer",
    city: "Delhi",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    ratio: "aspect-[3/4]"
  },
  {
    title: "Commercial Campaign",
    creator: "Vikram Malhotra",
    profession: "Director of Photography",
    city: "Bangalore",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
    ratio: "aspect-[4/3]"
  },
  {
    title: "Aerial Mountain Shoot",
    creator: "Karan Johar",
    profession: "Drone Operator",
    city: "Manali",
    image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80",
    ratio: "aspect-[16/10] md:col-span-2"
  }
];

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);

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

  useEffect(() => {
    async function fetchCreators() {
      try {
        const data = await freelancerService.listFreelancers({ page: 1, page_size: 3 });
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
      <div className="flex-grow flex items-center justify-center min-h-[70vh] bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow bg-[#FAF9F6] text-slate-900 font-sans selection:bg-primary/20">
      
      {/* 1. CINEMATIC 3D HERO SECTION */}
      <CinematicHero />

      {/* 2. BROWSE BY CREATIVE DISCIPLINE */}
      <section className="py-24 bg-white border-y border-slate-200">
        <Container>
          <div className="max-w-7xl mx-auto space-y-12">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Browse Expertise</span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 mt-2">
                  Browse by Creative Discipline
                </h2>
              </div>
              <Link 
                href="/freelancers" 
                className="inline-flex text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover gap-1.5 transition-colors items-center"
              >
                <span>View all talent</span>
                <span>&rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((cat) => (
                <Link
                  href={cat.href}
                  key={cat.name}
                  className="bg-[#FAF9F6] border border-slate-200 rounded-3xl overflow-hidden group hover:border-primary/40 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-950/10 group-hover:bg-transparent transition duration-300"></div>
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-lg text-slate-950 group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {cat.sub}
                      </p>
                    </div>
                    <div className="pt-6 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary group-hover:translate-x-1 transition-transform">
                      <span>Explore</span>
                      <span>&rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        </Container>
      </section>

      {/* 3. CINEMATIC PORTFOLIO SHOWCASE */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <Container>
          <div className="max-w-7xl mx-auto space-y-16 relative z-10">
            
            <div className="text-center space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Cinematic Feed</span>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-none">
                Portfolio Showcases
              </h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                Explore a selected feed of premium commercial work from our certified creators.
              </p>
            </div>

            {/* Masonry-Style Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredPortfolios.map((portfolio, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-3xl overflow-hidden group border border-white/5 bg-slate-900/40 shadow-2xl cursor-pointer ${portfolio.ratio}`}
                >
                  <img
                    src={portfolio.image}
                    alt={portfolio.title}
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-8">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                      {portfolio.profession} • {portfolio.city}
                    </span>
                    <h4 className="text-xl font-bold mt-1 text-white leading-tight">
                      {portfolio.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">By {portfolio.creator}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View Project</span>
                      <span>&rarr;</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </Container>
      </section>

      {/* 4. FEATURED CREATORS SECTION */}
      <section className="py-24 bg-[#FAF9F6]">
        <Container>
          <div className="max-w-7xl mx-auto space-y-12">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Certified Creators</span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 mt-2">
                  Meet creatives worth working with.
                </h2>
              </div>
              <Link 
                href="/freelancers" 
                className="inline-flex text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover gap-1.5 transition-colors items-center"
              >
                <span>Browse All Creatives</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {loadingCreators ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : featuredCreators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Creator Header */}
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-400 font-bold text-sm">
                          {creator.profile_photo_url ? (
                            <img
                              src={creator.profile_photo_url}
                              alt={creator.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            creator.full_name.split(" ").map((n: string) => n[0]).join("")
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-950 text-base">{creator.full_name}</h3>
                          <p className="text-xs text-primary font-bold">{creator.professional_title || "Creative Professional"}</p>
                          <p className="text-[10px] text-slate-400">{creator.city}, {creator.state}</p>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-slate-650 line-clamp-2 mt-4 leading-relaxed">
                        {creator.bio || "No professional bio provided yet."}
                      </p>

                      {/* Info stats */}
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-450 block">Experience</span>
                          <span className="font-bold text-slate-800">{creator.experience_years} Years</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-450 block">Starting Price</span>
                          <span className="font-bold text-slate-800">
                            {creator.starting_price ? `₹${parseInt(creator.starting_price).toLocaleString()}` : "On Quote"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <Link
                        href={`/freelancers/${creator.id}`}
                        className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition text-center block"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs max-w-md mx-auto">
                No verified freelancer profiles are published yet. Check back soon!
              </div>
            )}

          </div>
        </Container>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="py-24 bg-white border-t border-slate-200">
        <Container>
          <div className="max-w-7xl mx-auto space-y-16">
            
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Workflow</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950">How It Works</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* Clients Section */}
              <div className="space-y-8 bg-[#FAF9F6] border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                <h3 className="font-black text-xs uppercase tracking-widest text-primary border-b border-slate-200 pb-4">
                  For Clients
                </h3>
                <ol className="space-y-6">
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">01</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Tell us what you need</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Browse creative portfolios or check customized service packages directly.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">02</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Find the right creative</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Compare profiles, portfolios, list of gear/skills, and genuine client ratings.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">03</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Request & collaborate</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Submit date & time coordinates to book. Secure project workspaces are created automatically.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">04</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Secure project completion</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Follow platform booking, secure payouts, and approve drafts before receiving final deliverables.</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Creators Section */}
              <div className="space-y-8 bg-[#FAF9F6] border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                <h3 className="font-black text-xs uppercase tracking-widest text-primary border-b border-slate-200 pb-4">
                  For Creators
                </h3>
                <ol className="space-y-6">
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">01</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Create your profile</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Sign up, configure professional details, and set up your camera setups or equipment.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">02</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Showcase your work</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">List category skills, service deliverables, hourly prices, and feature beautiful works.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">03</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Find opportunities</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Receive booking requests directly from clients looking for your specific category.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="font-black text-xl text-primary leading-none">04</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950">Work & get paid</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Deliver project assets, manage revisions, and receive bank payouts securely through the platform.</p>
                    </div>
                  </li>
                </ol>
              </div>

            </div>

          </div>
        </Container>
      </section>

      {/* 6. TRUST / PLATFORM PROTECTION */}
      <section className="py-24 bg-[#FAF9F6] border-t border-slate-200">
        <Container>
          <div className="max-w-7xl mx-auto space-y-16">
            
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Confidentiality & Safety</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950">Built for confident collaboration.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <span className="text-xl">🛡️</span>
                <h4 className="font-extrabold text-sm text-slate-950">Verified Creators</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real professional portfolios, equipment lists, and identity verification checks.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <span className="text-xl">💳</span>
                <h4 className="font-extrabold text-sm text-slate-950">Secure Payment Flow</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deposits are held safely and payouts are only disbursed upon successful client approval.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <span className="text-xl">👁️</span>
                <h4 className="font-extrabold text-sm text-slate-950">Preview Before Final</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Clients review watermarked drafts before receiving final high-resolution files.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <span className="text-xl">⏱️</span>
                <h4 className="font-extrabold text-sm text-slate-950">Dispute Protection</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dedicated 24-hour review window after delivery to address any discrepancies before final payout.
                </p>
              </div>

            </div>

          </div>
        </Container>
      </section>

      {/* 7. FINAL CTA */}
      <section className="py-28 bg-slate-950 text-white relative overflow-hidden">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white">
              Great work starts with <br />
              <span className="text-primary">the right creative.</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              From photography to post-production, find the professional your project deserves.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/freelancers"
                className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition shadow-lg shadow-primary/25 inline-block text-center w-full sm:w-auto"
              >
                Explore Creatives
              </Link>
              <Link
                href="/register"
                className="bg-transparent hover:bg-white/5 text-white border border-white/20 font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition inline-block text-center w-full sm:w-auto"
              >
                Join Marketplace
              </Link>
            </div>

            <div className="pt-6 text-xs text-slate-400">
              Are you a creative professional?{" "}
              <Link href="/register" className="text-primary hover:underline font-bold inline-flex items-center gap-0.5">
                <span>Join the marketplace</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
          
          {/* Accent glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        </Container>
      </section>

    </div>
  );
}
