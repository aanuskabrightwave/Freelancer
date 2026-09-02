"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthenticatedFluidBackground from "@/components/backgrounds/AuthenticatedFluidBackground";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Form Fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Errors & States
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Login ID, Email or Phone Number is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsLoading(true);

    try {
      await login({
        identifier: identifier.trim(),
        password: password,
      });
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent text-text-main relative">
      <AuthenticatedFluidBackground />
      {/* LEFT SIDE: Editorial/Brand Block (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface/80 backdrop-blur-xl border-r border-white/10 text-text-on-dark flex-col justify-between p-16 relative overflow-hidden z-10">
        {/* Abstract background accent */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Brand/Logo header */}
        <div className="relative z-10">
          <Link href="/" className="font-semibold text-lg uppercase tracking-wider text-text-on-dark flex items-center gap-1.5">
            <span>Creative</span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            <span>Market</span>
          </Link>
        </div>

        {/* Big Typographic message & quote */}
        <div className="space-y-6 relative z-10 max-w-md my-auto">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05] text-text-on-dark">
            Find the right creative for every story.
          </h2>
          <div className="pt-6 border-t border-white/10 space-y-2">
            <p className="text-sm italic text-text-on-dark/65 leading-relaxed">
              &ldquo;Through CreativeMarket, we sourced the entire camera team and post-production suite for our commercial campaign in Mumbai. Seamless and secure.&rdquo;
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              — Luminous Labs Production
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-text-on-dark/40">
          <p>&copy; {new Date().getFullYear()} CreativeMarket. All rights reserved.</p>
        </div>
      </div>

      {/* RIGHT SIDE: Minimal Form Block */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-16 bg-transparent relative z-10">
        <div className="w-full max-w-md space-y-8 cinematic-reveal bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Welcome Back
            </h2>
            <p className="text-sm text-text-sub">
              Access your workspace and bookings
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">
                Login ID, Email or Phone Number
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                placeholder="username, email@example.com, or 9876543210"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold transition-all flex items-center justify-center gap-2 mt-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-text-on-dark" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>


          <div className="text-center text-xs text-text-sub pt-6 border-t border-border-custom/50">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
