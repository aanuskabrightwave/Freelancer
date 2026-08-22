"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import { bookingService } from "@/services/booking.service";
import { marketplaceService } from "@/services/service.service";
import { projectService } from "@/services/project.service";
import { notificationService } from "@/services/notification.service";
import { 
  Plus, 
  Search, 
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
  BookOpen
} from "lucide-react";

export default function FreelancerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Metrics & State
  const [profile, setProfile] = useState<any | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch Profile
        try {
          const prof = await freelancerService.getProfile();
          setProfile(prof);
        } catch (e) {
          // If not onboarded yet, profile might fail
          setProfile(null);
        }

        // Fetch Bookings
        const bookingsList = await bookingService.getFreelancerBookings();
        setBookings(bookingsList);

        let active = 0;
        let upcoming = 0;
        let earnings = 0;

        bookingsList.forEach(b => {
          if (["REQUESTED", "CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING", "RESCHEDULE_REQUESTED"].includes(b.status)) {
            active += 1;
          }
          if (["CONFIRMED", "IN_PROGRESS"].includes(b.status)) {
            upcoming += 1;
          }
          if (b.status === "COMPLETED") {
            earnings += parseFloat(b.agreed_amount || b.price || "0");
          }
        });

        setActiveCount(active);
        setUpcomingCount(upcoming);
        setTotalEarnings(earnings);

        // Fetch real open client projects/jobs for opportunities
        try {
          const params = { status: "OPEN" };
          const ops = await projectService.listProjects(params);
          const sortedOps = (ops || [])
            .filter((p: any) => p.status === "OPEN")
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setOpportunities(sortedOps.slice(0, 3));
        } catch (e) {
          console.error("Failed to load opportunities", e);
        }

        // Fetch notifications
        try {
          const countRes = await notificationService.getUnreadCount();
          setUnreadCount(countRes.count);
        } catch (e) {
          console.error("Failed to load notifications count", e);
        }

      } catch (err) {
        setErrorMsg("Failed to load freelancer dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 animate-pulse font-sans">
        <div className="h-8 bg-surface-elevated rounded-lg w-1/3"></div>
        <div className="h-20 bg-surface-elevated rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-surface-elevated rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface-elevated rounded-2xl"></div>
          <div className="h-64 bg-surface-elevated rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const completion = profile ? profile.profile_completion_percentage : 0;
  const verification = profile ? profile.verification_status : "NOT_SUBMITTED";
  const portfolioCount = profile?.portfolio?.length || 0;

  const getVerificationLabel = (status: string) => {
    switch (status) {
      case "VERIFIED": return "Verified";
      case "PENDING": return "Pending";
      case "REJECTED": return "Rejected";
      default: return "Not Submitted";
    }
  };

  // Needs Attention items
  const attentionItems: { label: string; actionText: string; link: string; type: "booking" | "profile" | "message" }[] = [];

  // 1. Pending Booking Requests awaiting response
  bookings.forEach(b => {
    if (b.status === "REQUESTED") {
      attentionItems.push({
        label: `New booking request #${b.booking_number} from client. Action required.`,
        actionText: "Accept / Reject →",
        link: "/freelancer/bookings",
        type: "booking"
      });
    }
  });

  // 2. Profile completion alert
  if (!profile || completion < 100) {
    attentionItems.push({
      label: `Your freelancer profile is only ${completion}% complete. Complete it to unlock search.`,
      actionText: "Complete Profile →",
      link: "/freelancer/onboarding",
      type: "profile"
    });
  }

  // 3. Unread Notifications / Messages alert
  if (unreadCount > 0) {
    attentionItems.push({
      label: `You have ${unreadCount} unread system notifications.`,
      actionText: "View Alerts →",
      link: "/notifications",
      type: "message"
    });
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "booking": return <Calendar className="w-4 h-4 text-primary" />;
      case "profile": return <AlertCircle className="w-4 h-4 text-primary" />;
      default: return <MessageSquare className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-main py-8 px-6 font-sans space-y-8 animate-in fade-in duration-300">
      
      {/* Top Welcome Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
            Freelancer Workspace
          </span>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-main tracking-tight">
            Welcome, {user?.full_name?.split(" ")[0] || "Freelancer"}
          </h1>
          <p className="text-text-sub text-xs mt-1">
            Here's what's happening with your creative business.
          </p>
        </div>
        
        {/* QUICK ACTIONS */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/freelancer/jobs")}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Browse Projects</span>
          </button>
          <button
            onClick={() => router.push("/freelancer/services/new")}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Service</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* NEEDS YOUR ATTENTION */}
      <section className="bg-surface border border-border-custom rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border-custom/50 pb-3">
          <AlertCircle className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-main">
            Needs Your Attention
          </h2>
        </div>
        
        {attentionItems.length > 0 ? (
          <div className="divide-y divide-border-custom/30">
            {attentionItems.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1">
                <div className="flex items-center gap-3 text-xs text-text-sub font-medium">
                  {getAlertIcon(item.type)}
                  <span>{item.label}</span>
                </div>
                <Link
                  href={item.link}
                  className="text-xs text-primary font-bold hover:underline self-start sm:self-auto"
                >
                  {item.actionText}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-success font-medium py-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span>You're all caught up. Business operational.</span>
          </div>
        )}
      </section>

      {/* FREELANCER SUMMARY CARDS (4-Column Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Link href="/freelancer/earnings" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Earnings</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-primary">₹{totalEarnings.toLocaleString()}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Ledger <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/freelancer/bookings" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Active Shoots</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">{activeCount}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Bookings <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/freelancer/bookings" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Upcoming Work</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">{upcomingCount}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Schedule <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <div className="bg-surface border border-border-custom/70 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Verification</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-xs font-bold ${verification === "VERIFIED" ? "text-success" : "text-primary"}`}>
              {getVerificationLabel(verification)}
            </span>
            <span className="text-[10px] text-text-muted">
              {portfolioCount} Media Uploads
            </span>
          </div>
        </div>

      </section>

      {/* DASHBOARD CONTENT ROWS (Bookings & Opportunities) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Center Columns: Upcoming Work */}
        <section className="lg:col-span-2 bg-surface border border-border-custom rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Upcoming & Active Work</span>
            </h3>
            <Link href="/freelancer/bookings" className="text-xs text-primary font-bold hover:underline">
              View All Work →
            </Link>
          </div>

          <div className="space-y-4">
            {bookings.length > 0 ? (
              bookings.slice(0, 3).map((b) => (
                <div key={b.id} className="p-4 border border-border-custom/60 rounded-2xl hover:border-border-custom transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-primary">{b.booking_number}</span>
                      <span className="text-[8px] px-2 py-0.5 border border-primary/20 bg-primary/5 rounded-full text-primary font-extrabold uppercase">
                        {b.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-text-main leading-snug">{b.title || "Creative Shoot"}</h4>
                    <p className="text-[10px] text-text-sub font-medium">
                      Date: {b.scheduled_date ? `${b.scheduled_date} (${String(b.start_time).substring(0, 5)})` : "Not scheduled"}
                    </p>
                  </div>
                  
                  <Link
                    href={`/freelancer/bookings/${b.id}`}
                    className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-[10px] font-bold rounded-full transition text-center"
                  >
                    View Details
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-text-muted border border-dashed border-border-custom/50 rounded-2xl bg-surface-elevated">
                <p className="text-xs">No booking inquiries received yet.</p>
                <Link
                  href="/freelancer/services/new"
                  className="mt-4 inline-block px-4 py-2 bg-primary text-text-on-dark text-[10px] font-bold rounded-full hover:bg-primary-hover transition"
                >
                  Create Service Package
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Right column: Profile strength indicator */}
        <section className="bg-surface border border-border-custom rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border-custom/50 pb-3">
            <Award className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-main">Profile Strength</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-text-sub">Completion Progress</span>
              <span className="text-primary">{completion}%</span>
            </div>
            
            {/* Visual Progress Bar */}
            <div className="w-full bg-border-custom rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500" 
                style={{ width: `${completion}%` }}
              ></div>
            </div>

            <div className="space-y-3 pt-2 text-xs text-text-sub">
              {completion < 100 ? (
                <>
                  <p className="leading-relaxed font-normal">To reach 100% and rank higher:</p>
                  <ul className="list-disc pl-4 space-y-1.5 text-text-muted leading-relaxed font-normal">
                    <li>Add physical gear & equipment</li>
                    <li>Upload sample portfolio images/videos</li>
                    <li>Configure calendar override availability</li>
                  </ul>
                </>
              ) : (
                <p className="text-success font-semibold leading-relaxed">
                  ✨ Excellent! Your profile is 100% complete and fully visible in the public directory search index.
                </p>
              )}
            </div>

            <Link
              href="/freelancer/profile"
              className="w-full mt-4 block py-2.5 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-full text-center transition"
            >
              Complete Profile
            </Link>
          </div>
        </section>

      </div>

      {/* NEW PROJECT OPPORTUNITIES (Horizontal Project Briefs Grid) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
          <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>New Project Opportunities</span>
          </h3>
          <Link href="/freelancer/jobs" className="text-xs text-primary font-bold hover:underline">
            Browse Jobs →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {opportunities.length > 0 ? (
            opportunities.slice(0, 3).map((job) => {
              return (
                <div 
                  key={job.id}
                  className="bg-surface border border-border-custom/60 rounded-2xl overflow-hidden hover:border-primary/20 transition flex flex-col justify-between shadow-xs group"
                >
                  <div className="aspect-[4/3] bg-surface-elevated relative overflow-hidden flex flex-col items-center justify-center border-b border-border-custom/50 px-4 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-500/10 opacity-70"></div>
                    <BookOpen className="w-10 h-10 text-primary/40 relative z-10 mb-2" />
                    <span className="text-[10px] text-text-sub font-bold uppercase tracking-widest relative z-10">
                      Project Brief
                    </span>
                    <span className="absolute top-3 left-3 bg-dark/80 backdrop-blur-xs px-2.5 py-0.5 rounded text-[8px] font-black uppercase text-primary tracking-wider z-10">
                      {job.project_type || "REMOTE"}
                    </span>
                  </div>

                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-text-main group-hover:text-primary transition line-clamp-2 leading-relaxed">{job.title}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-text-sub mt-1">
                        <MapPin className="w-3 h-3 text-text-muted" />
                        <span>{job.city || "Remote"}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border-custom/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-text-muted block">Budget Range</span>
                        <span className="font-extrabold text-text-main text-[11px]">
                          ₹{Number(job.budget_min).toLocaleString()} - ₹{Number(job.budget_max).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => router.push(`/freelancer/jobs/${job.id}`)}
                        className="px-3.5 py-1.5 bg-surface-elevated hover:bg-surface border border-border-custom text-[10px] font-bold rounded-full transition cursor-pointer"
                      >
                        View Project
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-text-muted border border-dashed border-border-custom/50 rounded-2xl bg-surface-elevated">
              <p className="text-xs">No open projects available right now.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
