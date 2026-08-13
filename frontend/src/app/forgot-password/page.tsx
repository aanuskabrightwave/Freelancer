"use client";

import React, { useState } from "react";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import Container from "@/components/ui/Container";

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
    <div className="flex flex-col flex-grow justify-center bg-slate-950 py-12 px-4 text-slate-100">
      <Container size="sm">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Forgot Password
            </h2>
            <p className="mt-2 text-slate-400 text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {message && (
            <div className="bg-blue-950/30 border border-blue-900/50 text-blue-400 p-4 rounded-lg text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  placeholder="name@domain.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:bg-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Requesting Reset..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="text-center text-sm text-slate-400 pt-4 border-t border-slate-800">
            Back to{" "}
            <Link href="/login" className="text-blue-400 hover:underline">
              Login
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
