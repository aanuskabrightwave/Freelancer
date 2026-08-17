"use client";

import React, { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or an analytics service
    console.error("Application error boundary triggered:", error);
  }, [error]);

  const handleGoHome = () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === "CLIENT") {
          window.location.href = "/client/dashboard";
          return;
        } else if (user.role === "FREELANCER") {
          window.location.href = "/freelancer/dashboard";
          return;
        } else if (user.role === "ADMIN") {
          window.location.href = "/admin/dashboard";
          return;
        }
      } catch (_) {}
    }
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center bg-background text-text-main font-sans">
      <h1 className="text-9xl font-extrabold text-primary tracking-widest">500</h1>
      <div className="bg-primary text-white px-2 text-sm font-bold rounded rotate-12 absolute mb-16 font-mono">
        System Error
      </div>
      <h2 className="text-2xl font-bold mt-6 text-text-main">Something went wrong on our end.</h2>
      <p className="text-text-sub mt-2 max-w-md">
        An unexpected error occurred. We have logged the issue and are working to resolve it.
      </p>
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-text-on-dark font-semibold rounded-xl shadow transition-colors cursor-pointer"
        >
          Try Again
        </button>
        <button
          onClick={handleGoHome}
          className="px-6 py-3 bg-surface border border-border-custom hover:bg-surface-elevated text-text-sub font-semibold rounded-xl shadow transition-colors cursor-pointer"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}
