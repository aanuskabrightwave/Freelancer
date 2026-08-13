"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import { bookingService } from "@/services/booking.service";
import Container from "@/components/ui/Container";

export default function FreelancerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<any | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardMetrics() {
      try {
        setLoading(true);
        // Load Profile
        const prof = await freelancerService.getProfile();
        setProfile(prof);

        // Load Bookings
        const bookings = await bookingService.getFreelancerBookings();
        let active = 0;
        let completed = 0;
        let earnings = 0;

        bookings.forEach(b => {
          if (["REQUESTED", "CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING", "RESCHEDULE_REQUESTED"].includes(b.status)) {
            active += 1;
          } else if (b.status === "COMPLETED") {
            completed += 1;
            earnings += parseFloat(b.agreed_amount || b.price || "0");
          }
        });

        setActiveCount(active);
        setCompletedCount(completed);
        setTotalEarnings(earnings);
      } catch (err: any) {
        // Not onboarded yet
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadDashboardMetrics();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completion = profile ? profile.profile_completion_percentage : 0;
  const isPublic = profile ? profile.is_profile_public : false;
  const verification = profile ? profile.verification_status : "NOT_SUBMITTED";
  const portfolioCount = profile?.portfolio?.length || 0;

  const getVerificationLabel = (status: string) => {
    switch (status) {
      case "VERIFIED": return "Verified";
      case "PENDING": return "Pending Verification";
      case "REJECTED": return "Verification Rejected";
      default: return "Not Submitted";
    }
  };

  return (
    <div className="flex flex-col flex-grow bg-slate-950 py-12 px-4 text-slate-100 font-sans">
      <Container size="md">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 backdrop-blur-xl">
          
          <div className="border-b border-slate-850 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                Welcome, {user?.full_name || "Freelancer"}
              </h1>
              <p className="text-slate-400 text-xs mt-1">Freelancer Professional Portal</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/freelancer/availability"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Schedule & Overrides
              </Link>
              <Link 
                href="/freelancer/services"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Manage Services
              </Link>
              <Link 
                href="/freelancer/profile"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Edit Profile
              </Link>
              {profile && (
                <Link 
                  href={`/freelancers/${profile.id}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
                >
                  View Public Profile
                </Link>
              )}
            </div>
          </div>

          {/* Quick Metrics Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Active Bookings card */}
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Active Shoots / Gigs</span>
              <div>
                <span className="text-3xl font-black text-white">{activeCount}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Pending execution jobs
                </span>
                <Link href="/freelancer/bookings" className="text-[10px] text-indigo-400 font-bold block mt-2 hover:underline">
                  View Bookings List →
                </Link>
              </div>
            </div>

            {/* Total Earnings card */}
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Clearing Earnings</span>
              <div>
                <span className="text-2xl font-black text-indigo-400">₹{totalEarnings.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Cleared from completed gigs</span>
              </div>
            </div>

            {/* Verification status card */}
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Verification</span>
              <div>
                <span className={`text-xs font-black block ${verification === "VERIFIED" ? "text-emerald-400" : "text-amber-400"}`}>
                  {getVerificationLabel(verification)}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Identity / Professional status</span>
              </div>
            </div>

            {/* Portfolio items count card */}
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Portfolio items</span>
              <div>
                <span className="text-3xl font-black text-white">{portfolioCount}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Uploads showcase count</span>
              </div>
            </div>

          </div>

          {/* Setup Callout Notice */}
          {(!profile || completion < 100) && (
            <div className="bg-gradient-to-r from-indigo-950/20 via-purple-950/20 to-pink-950/20 border border-indigo-500/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-white text-sm">Complete Your Onboarding Profile</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-lg leading-relaxed">
                  Provide your pricing structure, list your equipment gear, and select your specialization skills to unlock client search visibility.
                </p>
              </div>
              <Link 
                href="/freelancer/onboarding"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 transition whitespace-nowrap"
              >
                {profile ? "Resume Onboarding" : "Start Onboarding"}
              </Link>
            </div>
          )}

        </div>
      </Container>
    </div>
  );
}
