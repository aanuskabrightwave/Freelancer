"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FreelancerReviewsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/freelancer/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-muted text-xs font-sans">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
