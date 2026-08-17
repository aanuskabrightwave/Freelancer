import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-dark text-text-on-dark/60 border-t border-white/5 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="font-semibold text-lg uppercase tracking-wider text-text-on-dark flex items-center gap-1.5">
              <span>Creative</span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              <span>Market</span>
            </Link>
            <p className="text-sm max-w-xs text-text-on-dark/40 leading-relaxed">
              Find, book, and collaborate with top-tier creative media professionals worldwide. Built for premium editorial and commercial production.
            </p>
          </div>

          {/* Explore Column */}
          <div>
            <h4 className="font-semibold text-sm text-text-on-dark uppercase tracking-wider mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/freelancers" className="hover:text-text-on-dark transition-colors">Find Creatives</Link></li>
              <li><Link href="/services" className="hover:text-text-on-dark transition-colors">Browse Services</Link></li>
              <li><Link href="/projects" className="hover:text-text-on-dark transition-colors">Open Projects</Link></li>
            </ul>
          </div>

          {/* For Clients */}
          <div>
            <h4 className="font-semibold text-sm text-text-on-dark uppercase tracking-wider mb-4">For Clients</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-text-on-dark transition-colors">Post a Job</Link></li>
              <li><Link href="/login" className="hover:text-text-on-dark transition-colors">Client Log In</Link></li>
              <li><Link href="/about" className="hover:text-text-on-dark transition-colors">How it Works</Link></li>
            </ul>
          </div>

          {/* For Creatives */}
          <div>
            <h4 className="font-semibold text-sm text-text-on-dark uppercase tracking-wider mb-4">For Creatives</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-text-on-dark transition-colors">Join as Freelancer</Link></li>
              <li><Link href="/login" className="hover:text-text-on-dark transition-colors">Freelancer Log In</Link></li>
              <li><Link href="/about" className="hover:text-text-on-dark transition-colors">Success Stories</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-on-dark/35">
          <div>
            <p>&copy; {new Date().getFullYear()} CreativeMarket. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-text-on-dark transition-colors">About</Link>
            <Link href="/contact" className="hover:text-text-on-dark transition-colors">Contact</Link>
            <a href="#" className="hover:text-text-on-dark transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text-on-dark transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
