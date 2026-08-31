"use client";

import React, { useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function BookServiceRedirectContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pkgType = searchParams.get("package") || "BASIC";

  useEffect(() => {
    if (id) {
      router.replace(`/services/${id}?package=${pkgType}&book=true`);
    }
  }, [id, pkgType, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center text-xs text-text-muted font-sans font-medium">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>Redirecting to booking checkout wizard...</p>
    </div>
  );
}

export default function BookServiceRedirectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading checkout parameters...</div>}>
      <BookServiceRedirectContent />
    </Suspense>
  );
}
