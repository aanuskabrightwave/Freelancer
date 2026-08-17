"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "ADMIN") {
        if (user?.role === "CLIENT") {
          router.push("/client/dashboard");
        } else if (user?.role === "FREELANCER") {
          router.push("/freelancer/dashboard");
        } else {
          router.push("/");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-background text-text-main">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null;
  }

  // Determine active item from path
  let activeItem = "Dashboard";
  if (pathname.includes("/admin/users")) activeItem = "Users";
  else if (pathname.includes("/admin/freelancers")) activeItem = "Freelancers";
  else if (pathname.includes("/admin/bookings")) activeItem = "Bookings";
  else if (pathname.includes("/admin/payments")) activeItem = "Payments";
  else if (pathname.includes("/admin/disputes")) activeItem = "Disputes";
  else if (pathname.includes("/admin/settings")) activeItem = "Settings";
  else if (pathname.includes("/admin/verification")) activeItem = "Verification";
  else if (pathname.includes("/admin/audit")) activeItem = "Audit Logs";

  return (
    <div className="flex flex-row flex-grow bg-background text-text-main">
      <Sidebar role="admin" activeItem={activeItem} />
      <div className="flex-grow flex flex-col min-w-0 bg-background">
        {children}
      </div>
    </div>
  );
}
