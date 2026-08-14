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

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center bg-slate-950 text-slate-100">
      <h1 className="text-9xl font-extrabold text-red-600 tracking-widest">500</h1>
      <div className="bg-amber-500 text-slate-950 px-2 text-sm font-bold rounded rotate-12 absolute mb-16">
        System Error
      </div>
      <h2 className="text-2xl font-bold mt-6 text-white">Something went wrong on our end.</h2>
      <p className="text-slate-400 mt-2 max-w-md">
        An unexpected error occurred. We have logged the issue and are working to resolve it.
      </p>
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 font-semibold rounded-lg shadow transition-colors"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}
