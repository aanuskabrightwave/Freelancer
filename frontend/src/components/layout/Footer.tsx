import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#101114] text-slate-400 border-t border-white/10 pt-20 pb-12 font-sans selection:bg-primary/20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Main Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="col-span-2 space-y-6">
            <Link href="/" className="font-semibold text-lg uppercase tracking-wider text-white flex items-center gap-1.5 hover:opacity-85 transition-opacity">
              <span>Creative</span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              <span>Market</span>
            </Link>
            <p className="text-xs max-w-sm text-slate-400 leading-relaxed font-normal">
              A premium creative network connecting brands, directors, and agencies with verified photographers, cinematographers, colorists, and post-production specialists.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-black text-[10px] text-white uppercase tracking-[0.2em] mb-6">Explore</h4>
            <ul className="space-y-3.5 text-xs">
              <li>
                <Link href="/freelancers" className="hover:text-white transition-colors">
                  Creatives
                </Link>
              </li>
              <li>
                <Link href="/freelancers?profession=PHOTOGRAPHER" className="hover:text-white transition-colors">
                  Photography
                </Link>
              </li>
              <li>
                <Link href="/freelancers?profession=VIDEOGRAPHER" className="hover:text-white transition-colors">
                  Videography
                </Link>
              </li>
              <li>
                <Link href="/freelancers?profession=VIDEO_EDITOR" className="hover:text-white transition-colors">
                  Post-Production
                </Link>
              </li>
              <li>
                <Link href="/freelancers?profession=DRONE_OPERATOR" className="hover:text-white transition-colors">
                  Production Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Clients */}
          <div>
            <h4 className="font-black text-[10px] text-white uppercase tracking-[0.2em] mb-6">Clients</h4>
            <ul className="space-y-3.5 text-xs">
              <li>
                <Link href="/freelancers" className="hover:text-white transition-colors">
                  Find Talent
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Post a Project
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* Creatives */}
          <div>
            <h4 className="font-black text-[10px] text-white uppercase tracking-[0.2em] mb-6">Creatives</h4>
            <ul className="space-y-3.5 text-xs">
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Join Marketplace
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Projects & Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Earnings
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div>
            <p>&copy; {new Date().getFullYear()} CreativeMarket Network Inc. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-400">
            <Link href="/freelancers" className="hover:text-white transition-colors">
              Talent Directory
            </Link>
            <Link href="/services" className="hover:text-white transition-colors">
              Production Services
            </Link>
            <Link href="/#how-it-works" className="hover:text-white transition-colors">
              Workflow Guide
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
