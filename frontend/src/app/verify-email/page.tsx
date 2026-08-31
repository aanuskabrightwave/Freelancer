"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/ui/Container";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { refreshUser, user } = useAuth();

  const [statusState, setStatusState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function performVerification() {
      if (!token) {
        setStatusState("error");
        setErrorMessage("Verification token is missing. Please request a new link.");
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatusState("success");
        // Re-fetch user profile to sync `is_verified` state in AuthContext
        if (user) {
          await refreshUser();
        }
      } catch (err: any) {
        setStatusState("error");
        setErrorMessage(err.message || "Email verification failed. The link may have expired.");
      }
    }

    performVerification();
  }, [token]);

  return (
    <div className="flex flex-col flex-grow justify-center bg-background py-12 px-4 text-text-main">
      <Container size="sm">
        <div className="bg-surface border border-border-custom rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          {statusState === "loading" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text-main">Verifying Email...</h2>
              <p className="text-text-sub text-sm">Please wait while we confirm your email address.</p>
            </div>
          )}

          {statusState === "success" && (
            <div className="space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-2xl font-bold text-text-main">Email Verified!</h2>
              <p className="text-text-sub text-sm">
                Your email address has been successfully verified. You can now access all platform features.
              </p>
              <div className="pt-4">
                <Link
                  href={user ? (user.role === "CLIENT" ? "/client/dashboard" : "/freelancer/dashboard") : "/login"}
                  className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-text-main font-semibold text-sm transition-colors cursor-pointer inline-block"
                >
                  {user ? "Go to Dashboard" : "Log In"}
                </Link>
              </div>
            </div>
          )}

          {statusState === "error" && (
            <div className="space-y-4">
              <div className="text-5xl">❌</div>
              <h2 className="text-2xl font-bold text-red-400">Verification Failed</h2>
              <p className="text-text-sub text-sm">{errorMessage}</p>
              <div className="pt-4 border-t border-border-custom space-y-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 rounded-lg bg-surface-elevated hover:bg-surface-elevated text-text-main font-semibold text-sm transition-colors cursor-pointer inline-block"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col flex-grow justify-center bg-background py-12 px-4 text-text-main text-center">
        Loading...
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
