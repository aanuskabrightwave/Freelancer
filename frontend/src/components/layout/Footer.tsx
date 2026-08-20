import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#050507] text-slate-500 border-t border-white/5 pt-12 md:pt-16 lg:pt-20 pb-12 font-sans selection:bg-primary/20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Main Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
          
          {/* Brand Column */}
          <div className="col-span-2 space-y-6">
            <Link href="/" className="font-semibold text-lg uppercase tracking-wider text-white flex items-center gap-1.5 hover:opacity-85 transition-opacity">
              <span>Creative</span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              <span>Market</span>
            </Link>
            <p className="text-xs max-w-sm text-slate-400 leading-relaxed font-medium">
              A premium creative network connecting brands, directors, and agencies with verified photographers, cinematographers, colorists, and post-production specialists.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-black text-[10px] text-white uppercase tracking-[0.25em] mb-6">Platform</h4>
            <ul className="space-y-3.5 text-xs font-semibold">
              <li>
                <Link href="/freelancers" className="hover:text-primary transition-colors">
                  Explore Creators
                </Link>
              </li>
              <li>
                <Link href="/freelancers" className="hover:text-primary transition-colors">
                  Browse Projects
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-primary transition-colors">
                  Production Services
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* For Clients */}
          <div>
            <h4 className="font-black text-[10px] text-white uppercase tracking-[0.25em] mb-6">For Clients</h4>
            <ul className="space-y-3.5 text-xs font-semibold">
              <li>
                <Link href="/register" className="hover:text-primary transition-colors">
                  Post a Project
                </Link>
              </li>
              <li>
                <Link href="/freelancers" className="hover:text-primary transition-colors">
                  Find Talent
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-primary transition-colors">
                  How Hiring Works
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Client Help
                </Link>
              </li>
            </ul>
          </div>

          {/* For Creators */}
          <div>
            <h4 className="font-black text-[10px] text-white uppercase tracking-[0.25em] mb-6">For Creators</h4>
            <ul className="space-y-3.5 text-xs font-semibold">
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Find Work
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Creator Profile
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-primary transition-colors">
                  Creator Resources
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
          <div>
            <p>&copy; {new Date().getFullYear()} CreativeMarket Network. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-500">
            <Link href="/freelancers" className="hover:text-primary transition-colors">
              Talent Directory
            </Link>
            <Link href="/services" className="hover:text-primary transition-colors">
              Services Directory
            </Link>
            <Link href="/#how-it-works" className="hover:text-primary transition-colors">
              Workflow Guide
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
