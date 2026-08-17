"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getLogoHref = () => {
    if (!isAuthenticated || !user) return "/";
    if (user.role === "CLIENT") return "/client/dashboard";
    if (user.role === "FREELANCER") return "/freelancer/dashboard";
    if (user.role === "ADMIN") return "/admin/dashboard";
    return "/";
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? "bg-surface/85 border-b border-border-custom/50 backdrop-blur-md shadow-sm" 
        : "bg-transparent border-b border-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href={getLogoHref()} className="font-semibold text-lg uppercase tracking-wider text-text-main hover:opacity-85 transition-opacity flex items-center gap-1.5">
            <span>Creative</span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            <span>Market</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-sub">
            <Link href="/freelancers" className="hover:text-text-main transition-colors">Explore Talent</Link>
            <Link href="/services" className="hover:text-text-main transition-colors">Services</Link>
            {isAuthenticated && user && (
              <>
                {user.role === "CLIENT" && (
                  <Link href="/client/dashboard" className="hover:text-text-main transition-colors">Dashboard</Link>
                )}
                {user.role === "FREELANCER" && (
                  <Link href="/freelancer/dashboard" className="hover:text-text-main transition-colors">Dashboard</Link>
                )}
                {user.role === "ADMIN" && (
                  <Link href="/admin/dashboard" className="hover:text-text-main transition-colors">Dashboard</Link>
                )}
              </>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-6">
          {isAuthenticated && user ? (
            <>
              <NotificationBell />
              <span className="text-sm font-medium text-text-sub">
                Hi, {user.full_name.split(" ")[0]}
              </span>
              <button
                onClick={logout}
                className="text-sm font-medium text-text-muted hover:text-primary transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-text-sub hover:text-text-main transition-colors">
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-primary hover:bg-primary-hover text-text-on-dark px-5 py-2.5 rounded-full transition-all shadow-sm"
              >
                Join Marketplace
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
