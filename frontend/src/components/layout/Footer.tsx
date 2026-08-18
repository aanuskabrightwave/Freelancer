import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-white/5 pt-20 pb-10 mt-auto font-sans">
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
            <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
              A premium marketplace connecting Clients with verified professional creative talent including photographers, videographers, editors, and aerial cinematographers.
            </p>
          </div>

          {/* Explore Column */}
          <div>
            <h4 className="font-extrabold text-[10px] text-white uppercase tracking-widest mb-6">Explore</h4>
            <ul className="space-y-3.5 text-xs">
              <li>
                <Link href="/freelancers" className="hover:text-white transition-colors">
                  Explore Creatives
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* For Clients */}
          <div>
            <h4 className="font-extrabold text-[10px] text-white uppercase tracking-widest mb-6">For Clients</h4>
            <ul className="space-y-3.5 text-xs">
              <li>
                <Link href="/freelancers" className="hover:text-white transition-colors">
                  Find Creatives
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Post a Project
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* For Creators */}
          <div>
            <h4 className="font-extrabold text-[10px] text-white uppercase tracking-widest mb-6">For Creators</h4>
            <ul className="space-y-3.5 text-xs">
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Join as Creator
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-white transition-colors">
                  Browse Projects
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Creator Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div>
            <p>&copy; {new Date().getFullYear()} CreativeMarket. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
