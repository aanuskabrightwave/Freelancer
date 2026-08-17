"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/ui/Container";

const categories = [
  {
    name: "Photography",
    sub: "Wedding • Fashion • Product",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=600&q=80",
    href: "/freelancers?profession=PHOTOGRAPHER"
  },
  {
    name: "Videography",
    sub: "Events • Commercial • Cinematic",
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80",
    href: "/freelancers?profession=VIDEOGRAPHER"
  },
  {
    name: "Editing",
    sub: "Video • Reels • Color Grading",
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
    href: "/freelancers?profession=VIDEO_EDITOR"
  },
  {
    name: "Aerial Production",
    sub: "Drones • FPV • Mapping",
    image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80",
    href: "/freelancers?profession=DRONE_OPERATOR"
  }
];

const featuredPortfolios = [
  {
    title: "Editorial Fashion Shoot",
    category: "Photography",
    ratio: "aspect-[3/4]",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Cinematic Wedding Film",
    category: "Videography",
    ratio: "aspect-[16/9] md:col-span-2",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Commercial Film Reel",
    category: "Color Grading",
    ratio: "aspect-[4/3]",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80"
  }
];

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

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

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[70vh] bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[70vh] bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow bg-background text-text-main">
      {/* 1. LIGHT HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-24 md:py-32">
        <Container>
          <div className="max-w-4xl mx-auto text-center space-y-8 cinematic-reveal">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">
              The Premium Creative Network
            </span>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-text-main leading-[0.95] max-w-3xl mx-auto">
              Find the right creative for every story.
            </h1>
            <p className="text-lg md:text-xl text-text-sub font-normal max-w-2xl mx-auto leading-relaxed">
              Discover and collaborate with verified photographers, videographers, and editors tailored for high-end digital media production.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link
                href="/freelancers"
                className="bg-primary hover:bg-primary-hover text-text-on-dark font-medium px-8 py-4 rounded-full transition-all shadow-md inline-flex items-center gap-2"
              >
                <span>Explore Talent</span>
                <span>&rarr;</span>
              </Link>
              <Link
                href="/register"
                className="bg-transparent hover:bg-surface-elevated text-text-main border border-border-custom font-medium px-8 py-4 rounded-full transition-all inline-flex items-center"
              >
                Join as Creator
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. IMAGE-LED CATEGORIES SECTION */}
      <section className="py-20 bg-surface border-y border-border-custom">
        <Container>
          <div className="space-y-12">
            <div className="text-center md:text-left md:flex md:items-end md:justify-between max-w-5xl mx-auto">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Browse Expertise</span>
                <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mt-2">Browse by Creative Discipline</h2>
              </div>
              <Link href="/freelancers" className="hidden md:inline-flex text-sm font-semibold text-primary hover:text-primary-hover gap-1 transition-colors">
                View all talent &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {categories.map((cat) => (
                <Link
                  href={cat.href}
                  key={cat.name}
                  className="bg-surface-elevated border border-border-custom/60 rounded-2xl overflow-hidden group hover:border-primary/35 hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-background">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-lg text-text-main group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      {cat.sub}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 3. DARK CINEMATIC FEATURED PORTFOLIO */}
      <section className="py-24 bg-dark text-text-on-dark">
        <Container>
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Cinematic Showcase</span>
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-text-on-dark leading-none">
                Portfolio Showcases
              </h2>
              <p className="text-text-on-dark/50 text-sm max-w-md mx-auto">
                Explore a selected feed of premium commercial work from our certified creators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredPortfolios.map((portfolio, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-2xl overflow-hidden group border border-white/5 bg-dark-soft ${portfolio.ratio}`}
                >
                  <img
                    src={portfolio.image}
                    alt={portfolio.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-95 group-hover:scale-[1.02] transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-transparent to-transparent flex flex-col justify-end p-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      {portfolio.category}
                    </span>
                    <h4 className="text-lg font-semibold mt-1 text-text-on-dark">
                      {portfolio.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section className="py-24 bg-background">
        <Container>
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Workflow</span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">How It Works</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8 bg-surface border border-border-custom/50 rounded-2xl p-8 shadow-sm">
                <h3 className="font-semibold text-xl border-b border-border-custom/50 pb-4 text-primary">For Clients</h3>
                <ol className="space-y-6">
                  <li className="flex gap-4">
                    <span className="font-bold text-lg text-text-muted">01</span>
                    <div>
                      <h4 className="font-medium text-text-main">Tell us what you need</h4>
                      <p className="text-sm text-text-sub mt-1">Post a detailed creative brief or explore pre-packaged services.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="font-bold text-lg text-text-muted">02</span>
                    <div>
                      <h4 className="font-medium text-text-main">Find the right creative</h4>
                      <p className="text-sm text-text-sub mt-1">Review portfolios, verified equipment lists, and client ratings.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="font-bold text-lg text-text-muted">03</span>
                    <div>
                      <h4 className="font-medium text-text-main">Book and collaborate</h4>
                      <p className="text-sm text-text-sub mt-1">Execute secure payments and collaborate inside project workspaces.</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="space-y-8 bg-surface border border-border-custom/50 rounded-2xl p-8 shadow-sm">
                <h3 className="font-semibold text-xl border-b border-border-custom/50 pb-4 text-primary">For Creators</h3>
                <ol className="space-y-6">
                  <li className="flex gap-4">
                    <span className="font-bold text-lg text-text-muted">01</span>
                    <div>
                      <h4 className="font-medium text-text-main">Create your profile</h4>
                      <p className="text-sm text-text-sub mt-1">Sign up, verify your professional identity, and list your camera setup.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="font-bold text-lg text-text-muted">02</span>
                    <div>
                      <h4 className="font-medium text-text-main">Showcase your portfolio</h4>
                      <p className="text-sm text-text-sub mt-1">Build an elegant editorial gallery of your photography and film projects.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="font-bold text-lg text-text-muted">03</span>
                    <div>
                      <h4 className="font-medium text-text-main">Get booked & earn</h4>
                      <p className="text-sm text-text-sub mt-1">Receive direct bookings or propose budgets for project briefs.</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. DARK FINAL CTA */}
      <section className="py-28 bg-dark text-text-on-dark border-t border-white/5 relative overflow-hidden">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-none text-text-on-dark">
              Great work starts with the right creative.
            </h2>
            <p className="text-text-on-dark/50 text-base md:text-lg max-w-xl mx-auto">
              Ready to execute your vision? Post a project brief or hire top creative talent directly.
            </p>
            <div className="pt-4">
              <Link
                href="/freelancers"
                className="bg-primary hover:bg-primary-hover text-text-on-dark font-medium px-8 py-4 rounded-full transition-all shadow-md inline-block"
              >
                Hire Creative Talent
              </Link>
            </div>
          </div>
          {/* Subtle abstract background accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        </Container>
      </section>
    </div>
  );
}
