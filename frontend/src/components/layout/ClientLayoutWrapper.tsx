"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Routes where we never want to show the app shell or public nav/footer
  const isAuthPage = 
    pathname === "/login" || 
    pathname === "/register" || 
    pathname.startsWith("/forgot-password") || 
    pathname.startsWith("/reset-password") || 
    pathname.startsWith("/verify-email");

  // Admin routes have their own layout
  const isAdmin = pathname.startsWith("/admin");

  if (isLoading) {
    return <main className="flex-grow flex flex-col">{children}</main>;
  }

  // If user is authenticated and not on root or auth flow page, show workspace layout shell
  if (isAuthenticated && user && pathname !== "/" && !isAuthPage && !isAdmin) {
    return (
      <WorkspaceLayout role={user.role.toLowerCase() as "client" | "freelancer"}>
        {children}
      </WorkspaceLayout>
    );
  }

  // Otherwise show public layout structure (for guests or auth pages or admin)
  // Admin pages will handle their own layout/sidebar, so we don't render public Navbar/Footer for admin.
  const showPublicHeaderFooter = !isAuthPage && !isAdmin && !pathname.startsWith("/client") && !pathname.startsWith("/freelancer");

  return (
    <>
      {showPublicHeaderFooter && <Navbar />}
      <main className="flex-grow flex flex-col">{children}</main>
      {showPublicHeaderFooter && <Footer />}
    </>
  );
}
