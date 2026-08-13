"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth.service";
import Container from "@/components/ui/Container";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // Form Fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validatePassword = () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter.");
      return false;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError("Password must contain at least one lowercase letter.");
      return false;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError("Password must contain at least one number.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Invalid reset token. Please request a new link.");
      return;
    }

    if (!validatePassword()) return;

    setIsLoading(true);

    try {
      await authService.resetPassword({
        token: token,
        new_password: newPassword,
      });
      setMessage("Your password has been successfully reset. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
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
              Reset Password
            </h2>
            <p className="mt-2 text-slate-400 text-sm">
              Please enter your new password below.
            </p>
          </div>

          {!token && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-4 rounded-lg text-sm text-center">
              Missing token. Please request a new password reset link from the{" "}
              <Link href="/forgot-password" className="underline font-bold text-white">
                Forgot Password page
              </Link>
              .
            </div>
          )}

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

          {token && !message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:bg-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Resetting Password..." : "Update Password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col flex-grow justify-center bg-slate-950 py-12 px-4 text-slate-100 text-center">
        Loading...
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
