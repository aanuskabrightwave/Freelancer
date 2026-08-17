"use client";

import React, { useEffect, useState } from "react";
import { User, Mail, Phone, Calendar, ShieldCheck, Briefcase, Award, CreditCard } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import LoadingState from "@/components/common/LoadingState";

export default function ClientProfilePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoadingStats(true);
        const data = await bookingService.getClientBookings();
        setBookings(data);
      } catch (err) {
        console.error("Failed to load client bookings for profile stats", err);
      } finally {
        setLoadingStats(false);
      }
    }
    if (user) {
      loadStats();
    }
  }, [user]);

  if (!user) {
    return <LoadingState message="Resolving user account details..." />;
  }

  // Calculate Client Stats
  const totalBookings = bookings.length;
  const completedProjects = bookings.filter(b => b.status === "COMPLETED").length;
  const totalSpent = bookings
    .filter(b => ["CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING", "COMPLETED"].includes(b.status))
    .reduce((sum, b) => sum + parseFloat(b.total_paid || b.deposit_paid_amount || "0"), 0);

  const initials = user.full_name 
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() 
    : "US";

  const friendlyJoinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "Member since 2026";

  return (
    <Container className="py-8">
      <div className="space-y-8 max-w-4xl">
        <PageHeader
          title="Account Profile"
          description="View your user details, account roles, and marketplace engagement metrics."
        />

        {/* Profile Card Header */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-xs">
          {/* Avatar initials badge */}
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-black flex-shrink-0">
            {initials}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-xl font-extrabold text-text-main leading-tight">
                {user.full_name || "Aarav Sharma"}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-wider rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Verified Client
              </span>
            </div>
            
            <p className="text-xs text-text-sub font-semibold">{user.email}</p>
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-[11px] text-text-muted">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {friendlyJoinedDate}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center gap-4 hover:bg-surface-elevated transition duration-200">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
                Total Bookings
              </span>
              <span className="text-xl font-black text-text-main mt-0.5 block">
                {loadingStats ? "..." : totalBookings}
              </span>
            </div>
          </div>

          <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center gap-4 hover:bg-surface-elevated transition duration-200">
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
                Completed Jobs
              </span>
              <span className="text-xl font-black text-text-main mt-0.5 block">
                {loadingStats ? "..." : completedProjects}
              </span>
            </div>
          </div>

          <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center gap-4 hover:bg-surface-elevated transition duration-200">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
                Total Invested
              </span>
              <span className="text-xl font-black text-text-main mt-0.5 block">
                {loadingStats ? "..." : `₹${totalSpent.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Details Section */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-6">
          <div>
            <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider">
              Profile Metadata
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Your credentials and localization settings are securely stored for marketplace transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-sub font-medium border-t border-border-custom pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface border border-border-custom rounded-xl">
                <span className="text-text-muted">Account ID / Login ID</span>
                <span className="font-bold text-text-main">{user.login_id || "Not configured"}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface border border-border-custom rounded-xl">
                <span className="text-text-muted">Email Address</span>
                <span className="font-bold text-text-main flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-text-muted" />
                  {user.email}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface border border-border-custom rounded-xl">
                <span className="text-text-muted">Phone Number</span>
                <span className="font-bold text-text-main flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-text-muted" />
                  {user.phone || "Not configured"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface border border-border-custom rounded-xl">
                <span className="text-text-muted">Time Zone</span>
                <span className="font-bold text-text-main">{user.timezone || "Asia/Kolkata"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
