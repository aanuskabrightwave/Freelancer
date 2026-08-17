"use client";

import React, { useState } from "react";
import Link from "next/link";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const data = await authService.forgotPassword(email.trim());
      setMessage(data.message || "Password reset instructions have been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-text-main">
      {/* LEFT SIDE: Editorial/Brand Block (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-dark text-text-on-dark flex-col justify-between p-16 relative overflow-hidden">
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
            Password security is our priority.
          </h2>
          <div className="pt-6 border-t border-white/10 space-y-2">
            <p className="text-sm italic text-text-on-dark/65 leading-relaxed">
              "We provide secure digital key management and profile validation for all premium media creators worldwide."
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-text-on-dark/40">
          <p>&copy; {new Date().getFullYear()} CreativeMarket. All rights reserved.</p>
        </div>
      </div>

      {/* RIGHT SIDE: Minimal Form Block */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-16 bg-background">
        <div className="w-full max-w-md space-y-8 cinematic-reveal">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-text-main">
              Forgot Password
            </h2>
            <p className="text-sm text-text-sub">
              Enter email address to receive password reset instructions
            </p>
          </div>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-750 p-4 rounded-xl text-xs font-semibold">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                  placeholder="name@domain.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold transition-all flex items-center justify-center gap-2 mt-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Requesting Reset..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-text-sub pt-6 border-t border-border-custom/50">
            Back to{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
