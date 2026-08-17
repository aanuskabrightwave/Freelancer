"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function NotFound() {
  const { user, isAuthenticated } = useAuth();

  let homeUrl = "/";
  if (isAuthenticated && user) {
    if (user.role === "CLIENT") {
      homeUrl = "/client/dashboard";
    } else if (user.role === "FREELANCER") {
      homeUrl = "/freelancer/dashboard";
    } else if (user.role === "ADMIN") {
      homeUrl = "/admin/dashboard";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center bg-background text-text-main font-sans">
      <h1 className="text-9xl font-extrabold text-primary tracking-widest">404</h1>
      <div className="bg-primary text-white px-2 text-sm rounded rotate-12 absolute mb-16 font-mono font-bold">
        Page Not Found
      </div>
      <h2 className="text-2xl font-bold mt-6 text-text-main">Oops! You seem to be lost.</h2>
      <p className="text-text-sub mt-2 max-w-md">
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <Link
        href={homeUrl}
        className="mt-6 px-6 py-3 bg-primary hover:bg-primary-hover text-text-on-dark font-semibold rounded-xl shadow transition-colors"
      >
        Go Back Home
      </Link>
    </div>
  );
}
