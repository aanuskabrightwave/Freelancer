"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "CLIENT") {
        if (user?.role === "FREELANCER") {
          router.push("/freelancer/dashboard");
        } else if (user?.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-text-main">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "CLIENT") {
    return null;
  }

  return <>{children}</>;
}
