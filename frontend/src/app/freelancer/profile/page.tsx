"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import FreelancerDetailClient from "@/app/freelancers/[id]/FreelancerDetailClient";

export default function MyProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      if (authLoading) return;
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const prof = await freelancerService.getProfile();
        if (prof) {
          setProfileId(prof.id);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          router.push("/freelancer/onboarding");
        }
      } finally {
        setLoading(false);
      }
    }
    checkProfile();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profileId) {
    return null; // Redirecting
  }

  return <FreelancerDetailClient id={String(profileId)} />;
}
