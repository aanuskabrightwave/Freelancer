"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { paymentService } from "@/services/payment.service";
import { notificationService } from "@/services/notification.service";
import { freelancerService } from "@/services/freelancer.service";
import { workspaceService } from "@/services/workspace.service";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  MessageSquare, 
  Calendar, 
  ChevronRight,
  TrendingUp,
  Star,
  MapPin,
  ShieldCheck,
  Award,
  BookOpen,
  DollarSign,
  Briefcase,
  HelpCircle,
  Inbox
} from "lucide-react";

export default function FreelancerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Dashboard Data States
  const [profile, setProfile] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>({
    total_earned: 0,
    pending: 0,
    available: 0,
    paid_out: 0
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookingRevisions, setBookingRevisions] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch all required dashboard datasets in parallel (Part 33 & 34)
      const [profData, bookingsData, assignmentsData, earningsData, unreadData] = await Promise.all([
        freelancerService.getProfile().catch(() => null),
        bookingService.getFreelancerBookings().catch(() => []),
        bookingService.getFreelancerAssignments().catch(() => []),
        paymentService.getFreelancerEarnings().catch(() => ({ total_earned: 0, pending: 0, available: 0, paid_out: 0 })),
        notificationService.getUnreadCount().catch(() => ({ count: 0 }))
      ]);

      setProfile(profData);
      setBookings(bookingsData);
      setAssignments(assignmentsData);
      setEarnings(earningsData);
      setUnreadCount(unreadData.count);

      // Query revisions for any active booking in parallel (Part 3)
      const inProgressBookings = bookingsData.filter((b) => b.status === "IN_PROGRESS");
      const revsMap: Record<number, any[]> = {};
      await Promise.all(
        inProgressBookings.map(async (b) => {
          try {
            const revList = await workspaceService.getRevisions(b.id);
            revsMap[b.id] = revList;
          } catch (err) {
            revsMap[b.id] = [];
          }
        })
      );
      setBookingRevisions(revsMap);
    } catch (err) {
      setErrorMsg("We couldn't load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Status mapping logic (Part 8 & 27)
  const getFriendlyAssignmentStatus = (status: string, hasCounter: boolean) => {
    switch (status) {
      case "OFFERED":
        return { label: "Awaiting Your Response", style: "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold animate-pulse" };
      case "REJECTED":
        return hasCounter
          ? { label: "Counter Sent", style: "bg-blue-500/10 border-blue-500/30 text-blue-400" }
          : { label: "Declined", style: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
      case "ACCEPTED":
        return { label: "Waiting for Client Approval", style: "bg-purple-500/10 border-purple-500/30 text-purple-400" };
      case "CONFIRMED":
        return { label: "Confirmed", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
      default:
        return { label: status.replace(/_/g, " "), style: "bg-surface-elevated border-border-custom text-text-sub" };
    }
  };

  // Profile completion percentage helpers (Part 18)
  const completion = profile ? profile.profile_completion_percentage : 0;
  const verification = profile ? profile.verification_status : "NOT_SUBMITTED";

  // Build Actionable Needs Your Attention Items (Part 5)
  const attentionItems: { label: string; actionText: string; link: string; type: "assignment" | "work" | "profile" | "message" }[] = [];

  // 1. Pending Offered Assignments
  assignments.forEach((a) => {
    if (a.status === "OFFERED") {
      attentionItems.push({
        label: `New assignment request for ${a.title || "Creative Brief"}. Offered payout: ₹${Number(a.offered_payout_amount).toLocaleString("en-IN")}.`,
        actionText: "Review Offer",
        link: `/freelancer/bookings`, // Detailed accept/reject is located inside bookings/assignments workflow (Part 9)
        type: "assignment"
      });
    }
  });

  // 2. Confirmed bookings ready to start (deposit paid but work not started)
  bookings.forEach((b) => {
    const revs = bookingRevisions[b.id] || [];
    const activeRev = revs.find((r) => r.status === "OPEN" || r.status === "IN_PROGRESS");
    if (b.status === "IN_PROGRESS" && activeRev) {
      attentionItems.push({
        label: `Revision Required: "${activeRev.title}" for booking ${b.booking_number}.`,
        actionText: "View Revision",
        link: `/freelancer/bookings/${b.id}`,
        type: "work"
      });
    }

    if (b.status === "CONFIRMED" && b.payment_completion_state !== "UNPAID") {
      attentionItems.push({
        label: `Client deposit confirmed for ${b.title || "Creative Booking"}. Ready to begin work.`,
        actionText: "View Booking",
        link: `/freelancer/bookings/${b.id}`,
        type: "work"
      });
    }
  });

  // 3. Profile Completion Alert
  if (!profile || completion < 100) {
    attentionItems.push({
      label: `Your professional profile is only ${completion}% complete. Fill out details to rank higher.`,
      actionText: "Complete Profile",
      link: "/freelancer/profile",
      type: "profile"
    });
  }

  // 4. Unread Messages alert
  if (unreadCount > 0) {
    attentionItems.push({
      label: `You have unread system notifications or coordination alerts.`,
      actionText: "View Alerts",
      link: "/notifications", // Point directly to verified notification center route
      type: "message"
    });
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      case "work":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "profile":
        return <AlertCircle className="w-4 h-4 text-primary" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-450" />;
    }
  };

  // Filters active bookings for list summary
  const activeBookings = bookings.filter((b) =>
    ["REQUESTED", "CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING"].includes(b.status)
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 animate-pulse font-sans bg-background min-h-screen">
        <div className="h-8 bg-surface border border-border-custom rounded-lg w-1/3"></div>
        <div className="h-20 bg-surface border border-border-custom rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-surface border border-border-custom rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans space-y-8">
      
      {/* Welcome Block */}
      <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
            Professional Workspace
          </span>
          <h1 className="text-xl md:text-2xl font-black text-text-main">
            Welcome back, {user?.full_name?.split(" ")[0] || "Specialist"}
          </h1>
          <p className="text-text-sub text-xs mt-1">
            Manage your assignments, view schedule balances, and complete coordination deliverables.
          </p>
        </div>
        
        {/* Quick Actions (Part 17) */}
        <div className="flex gap-2">
          <Link
            href="/freelancer/profile"
            className="px-4 py-2 bg-surface-elevated hover:bg-surface border border-border-custom text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Manage Profile
          </Link>
          <Link
            href="/freelancer/services"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Manage Services
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Metrics Widgets Grid (Part 4, 19, 20, 21) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block">Awaiting Response</span>
            <span className="text-2xl font-black mt-1 block">{assignments.filter(a => a.status === "OFFERED").length} Offers</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block">Active Jobs</span>
            <span className="text-2xl font-black mt-1 block">{activeBookings.length} Bookings</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block">Locked Earnings (Escrow)</span>
            <span className="text-2xl font-black mt-1 block text-amber-450">₹{Number(earnings.pending).toLocaleString("en-IN")}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block">Available to Withdraw</span>
            <span className="text-2xl font-black mt-1 block text-emerald-450">₹{Number(earnings.available).toLocaleString("en-IN")}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Needs Your Attention (Part 5) */}
      <section className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Needs Your Attention</h3>
        
        {attentionItems.length > 0 ? (
          <div className="divide-y divide-border-custom/30 text-xs font-semibold text-text-sub">
            {attentionItems.map((item, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {getAlertIcon(item.type)}
                  <span className="leading-relaxed">{item.label}</span>
                </div>
                <Link
                  href={item.link}
                  className="px-3.5 py-1 bg-surface hover:bg-surface-elevated border border-border-custom text-[10px] font-bold rounded-xl transition cursor-pointer text-center shrink-0 self-start sm:self-auto"
                >
                  {item.actionText}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-2 flex items-center gap-2 text-xs text-emerald-450 font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>You're all caught up. Ready for assignments!</span>
          </div>
        )}
      </section>

      {/* Dashboard Lists Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Offered Assignments & Active Bookings (Left Columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Offered Assignments Section (Part 6) */}
          <section className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Admin Booking Assignments</h3>
            
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assign) => {
                  const hasCounter = assign.counter_offer_amount !== null;
                  const status = getFriendlyAssignmentStatus(assign.status, hasCounter);
                  
                  return (
                    <div
                      key={assign.id}
                      className="border border-border-custom/50 rounded-2xl p-4 bg-surface-elevated/20 space-y-3"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <span className="text-[9px] text-text-muted font-mono font-bold">{assign.booking_number}</span>
                          <h4 className="font-extrabold text-sm text-text-main mt-0.5">{assign.title || "Creative Shoot"}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${status.style}`}>
                          {status.label}
                        </span>
                      </div>

                      <p className="text-[10px] text-text-sub font-medium">
                        Venue: <span className="text-text-main font-bold">{assign.venue_name || "Coordinator Assigned"}</span> 
                        {assign.location_city && ` (${assign.location_city}, ${assign.location_state || ""})`}
                      </p>

                      <div className="pt-2 border-t border-border-custom/30 flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <span className="text-[8px] text-text-muted uppercase block">Offered Payout</span>
                          <span className="font-extrabold text-xs text-text-main">
                            ₹{Number(assign.offered_payout_amount).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <Link
                          href="/freelancer/bookings"
                          className="px-3.5 py-1.5 bg-surface hover:bg-surface-elevated border border-border-custom text-[10px] font-bold rounded-xl transition cursor-pointer"
                        >
                          Review Assignment
                        </Link>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-text-muted flex flex-col justify-center items-center space-y-3 bg-surface-elevated/10 border border-dashed border-border-custom/50 rounded-2xl">
                <Inbox className="w-8 h-8 text-text-muted" />
                <div>
                  <h4 className="font-bold text-text-main text-[11px]">No new assignments right now</h4>
                  <p className="text-[9px] text-text-sub mt-1">New booking opportunities assigned by our team will appear here.</p>
                </div>
              </div>
            )}
          </section>

          {/* Active Bookings (Part 10) */}
          <section className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Active Bookings</h3>
              <Link href="/freelancer/bookings" className="text-[10px] font-bold text-primary hover:underline">
                View All
              </Link>
            </div>

            {activeBookings.length > 0 ? (
              <div className="space-y-4">
                {activeBookings.map((b) => {
                  const depPaid = b.payment_completion_state !== "UNPAID";
                  
                  return (
                    <div
                      key={b.id}
                      className="border border-border-custom/50 rounded-2xl p-4 bg-surface-elevated/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] text-text-muted font-mono font-bold">{b.booking_number}</span>
                        <h4 className="font-extrabold text-sm text-text-main">{b.title}</h4>
                        <div className="flex gap-2.5 text-[9px] font-bold uppercase tracking-wider flex-wrap">
                          <span className={`px-1.5 py-0.2 rounded border ${
                            depPaid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          }`}>
                            {depPaid ? "Deposit Paid" : "Waiting for Deposit"}
                          </span>
                          <span className="px-1.5 py-0.2 rounded border bg-blue-500/10 border-blue-500/30 text-blue-400">
                            {b.status}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/freelancer/bookings/${b.id}`}
                        className="px-3.5 py-1.5 bg-surface hover:bg-surface-elevated border border-border-custom text-[10px] font-bold rounded-xl transition cursor-pointer text-center shrink-0 w-full sm:w-auto"
                      >
                        Open Job
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-text-muted bg-surface-elevated/10 border border-border-custom/40 rounded-2xl italic">
                No active bookings.
              </div>
            )}
          </section>

        </div>

        {/* Profile Strength & Business Tools Column */}
        <div className="space-y-8">
          
          <section className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-border-custom/50 pb-3">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Profile Strength</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-text-sub">Completion Progress</span>
                <span className="text-primary">{completion}%</span>
              </div>
              
              <div className="w-full bg-border-custom rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${completion}%` }}
                ></div>
              </div>

              <div className="text-xs text-text-sub leading-relaxed font-medium space-y-2">
                {completion < 100 ? (
                  <>
                    <p>To reach 100% and unlock public listing search:</p>
                    <ul className="list-disc pl-4 space-y-1 text-text-muted">
                      <li>Configure physical gear & equipment listings</li>
                      <li>Upload high-quality portfolio images</li>
                      <li>Add availability exceptions</li>
                    </ul>
                  </>
                ) : (
                  <p className="text-success font-semibold">
                    ✨ Your profile is complete and actively indexing in coordinator recommendations.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Quick Support / Contact Admin Info */}
          <section className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl text-center space-y-4">
            <HelpCircle className="w-8 h-8 text-primary mx-auto" />
            <div>
              <h4 className="font-extrabold text-sm text-text-main">Platform Managed Workflows</h4>
              <p className="text-text-sub text-[11px] leading-relaxed mt-1">
                All client communication and work verification is mediated securely through our coordination team. No direct payments or client links should occur.
              </p>
            </div>
            <Link
              href="/freelancer/messages"
              className="w-full block py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Message Coordinator
            </Link>
          </section>

        </div>

      </div>

    </div>
  );
}
