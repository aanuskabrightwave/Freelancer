"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl text-blue-500">
            CreativeMarket
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <Link href="/freelancers" className="hover:text-[var(--foreground)]">Explore Freelancers</Link>
            <Link href="/services" className="hover:text-[var(--foreground)]">Explore Services</Link>
            {isAuthenticated && user && (
              <>
                {user.role === "CLIENT" && (
                  <Link href="/client/dashboard" className="hover:text-[var(--foreground)]">Dashboard</Link>
                )}
                {user.role === "FREELANCER" && (
                  <Link href="/freelancer/dashboard" className="hover:text-[var(--foreground)]">Dashboard</Link>
                )}
                {user.role === "ADMIN" && (
                  <Link href="/admin/dashboard" className="hover:text-[var(--foreground)]">Dashboard</Link>
                )}
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Hi, {user.full_name.split(" ")[0]}
              </span>
              <button
                onClick={logout}
                className="text-sm font-medium text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:text-blue-500">
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
