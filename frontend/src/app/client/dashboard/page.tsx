"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { freelancerService } from "@/services/freelancer.service";
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
  Sparkles,
  TrendingUp,
  Star,
  MapPin,
  HelpCircle
} from "lucide-react";

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Metrics
  const [bookings, setBookings] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Coming Soon Modal State
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch bookings
        const bookingsList = await bookingService.getClientBookings();
        setBookings(bookingsList);

        // Fetch unread notifications
        try {
          const countRes = await notificationService.getUnreadCount();
          setUnreadCount(countRes.count);
        } catch (e) {
          console.error("Failed to load notifications count", e);
        }

        // Fetch recommended creatives
        try {
          const creativesList = await freelancerService.listFreelancers({ page_size: 4 });
          setCreatives(creativesList);
        } catch (e) {
          console.error("Failed to load recommended creatives", e);
        }

      } catch (err) {
        setErrorMsg("Failed to retrieve dashboard workspace data.");
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

  const getFriendlyStatusLabel = (status: string, payState?: string) => {
    switch (status) {
      case "REQUESTED": return "Request Sent";
      case "PENDING_CONFIRMATION": return "Quote Received";
      case "CONFIRMED": return payState === "DEPOSIT_PAID" ? "Confirmed" : "Deposit Required";
      case "IN_PROGRESS": return "In Progress";
      case "DELIVERY_PENDING": return "Pending Review";
      case "COMPLETED": return "Completed";
      case "CANCELLED": return "Cancelled";
      case "REJECTED": return "Rejected";
      default: return status;
    }
  };

  // Calculations
  const activeBookings = bookings.filter(b => 
    ["REQUESTED", "CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING", "RESCHEDULE_REQUESTED"].includes(b.status)
  );

  const upcomingBookings = bookings.filter(b => 
    ["CONFIRMED", "IN_PROGRESS"].includes(b.status)
  );

  const pendingDeliveries = bookings.filter(b => b.status === "DELIVERY_PENDING");

  // Needs Attention items
  const attentionItems: { label: string; actionText: string; link: string; type: "payment" | "delivery" | "message" }[] = [];

  bookings.forEach(b => {
    // 1. Quote Received / Pending Confirmation
    if (b.status === "PENDING_CONFIRMATION") {
      attentionItems.push({
        label: `Booking #${b.booking_number} has a pending quotation from the freelancer.`,
        actionText: "Review Quote →",
        link: `/client/bookings/${b.id}`,
        type: "message"
      });
    }

    // 2. Deposit Required
    if (b.status === "CONFIRMED" && b.payment_completion_state === "UNPAID") {
      attentionItems.push({
        label: `Deposit payment of ₹${Number(b.deposit_amount).toLocaleString("en-IN")} is required for booking #${b.booking_number}.`,
        actionText: "Pay Deposit →",
        link: `/client/bookings/${b.id}/payment`,
        type: "payment"
      });
    }

    // 3. Final Balance Required
    if (b.payment_completion_state === "DEPOSIT_PAID" && Number(b.remaining_balance) > 0) {
      attentionItems.push({
        label: `Remaining balance of ₹${Number(b.remaining_balance).toLocaleString("en-IN")} is required for booking #${b.booking_number}.`,
        actionText: "Pay Remaining Balance →",
        link: `/client/bookings/${b.id}/payment`,
        type: "payment"
      });
    }

    // 4. Delivery pending review
    if (b.status === "DELIVERY_PENDING") {
      attentionItems.push({
        label: `Milestone deliverables have been uploaded for "${b.title || "Booking"}".`,
        actionText: "Review Deliverables →",
        link: `/client/bookings/${b.id}/workspace`,
        type: "delivery"
      });
    }
  });

  // 5. Unread notifications
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
      case "payment": return <Clock className="w-4 h-4 text-primary" />;
      case "delivery": return <CheckCircle className="w-4 h-4 text-success" />;
      default: return <MessageSquare className="w-4 h-4 text-indigo-500" />;
    }
  };

  const PROFESSION_LABELS: Record<string, string> = {
    PHOTOGRAPHER: "Photographer",
    VIDEOGRAPHER: "Videographer",
    VIDEO_EDITOR: "Video Editor",
    PHOTO_EDITOR: "Photo Editor",
    CINEMATOGRAPHER: "Cinematographer",
    DRONE_OPERATOR: "Drone Operator",
    REEL_EDITOR: "Reel Editor",
    MOTION_GRAPHICS_ARTIST: "Motion Graphics Artist",
    COLOR_GRADER: "Color Grader",
    OTHER: "Other",
  };

  const getProfessionLabel = (profession: string) => {
    return PROFESSION_LABELS[profession] || profession;
  };

  return (
    <div className="min-h-screen bg-background text-text-main py-8 px-6 font-sans space-y-8 animate-in fade-in duration-300">
      
      {/* Top Welcome Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
            Client Workspace
          </span>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-main tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0] || "Client"}
          </h1>
          <p className="text-text-sub text-xs mt-1">
            Here's what's happening with your projects.
          </p>
        </div>
        
        {/* QUICK ACTIONS */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/freelancers")}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find a Creative</span>
          </button>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Project</span>
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
            <span>You're all caught up. No pending actions.</span>
          </div>
        )}
      </section>

      {/* DASHBOARD SUMMARY CARDS (4-Column Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Link href="/client/bookings" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Active Hirings</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">{activeBookings.length}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/client/bookings" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Upcoming Bookings</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">{upcomingBookings.length}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              View Schedules <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/client/bookings" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Pending Deliveries</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">{pendingDeliveries.length}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Review Work <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/notifications" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Unread Messages</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-extrabold transition ${unreadCount > 0 ? "text-primary" : "text-text-main group-hover:text-primary"}`}>
              {unreadCount}
            </span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Read Alerts <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

      </section>

      {/* DASHBOARD CONTENT ROWS (Bookings & recommended talent) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Center columns: Bookings List */}
        <section className="lg:col-span-2 bg-surface border border-border-custom rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Upcoming & Active Bookings</span>
            </h3>
            <Link href="/client/bookings" className="text-xs text-primary font-bold hover:underline">
              View All Bookings →
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
                        {getFriendlyStatusLabel(b.status, b.payment_completion_state)}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-text-main leading-snug">{b.title || "Creative Shoot"}</h4>
                    <p className="text-[10px] text-text-sub font-medium">
                      Date: {b.scheduled_date ? `${b.scheduled_date} (${String(b.start_time).substring(0, 5)})` : "Not scheduled"}
                    </p>
                  </div>
                  
                  <Link
                    href={`/client/bookings/${b.id}`}
                    className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-[10px] font-bold rounded-full transition text-center"
                  >
                    View Booking
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-text-muted border border-dashed border-border-custom/50 rounded-2xl bg-surface-elevated">
                <p className="text-xs">No bookings requests submitted yet.</p>
                <Link
                  href="/services"
                  className="mt-4 inline-block px-4 py-2 bg-primary text-text-on-dark text-[10px] font-bold rounded-full hover:bg-primary-hover transition"
                >
                  Browse Marketplace Services
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Right column: Recent Activity */}
        <section className="bg-surface border border-border-custom rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border-custom/50 pb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-main">Recent Activity</h3>
          </div>

          <div className="relative pl-4 border-l border-border-custom/60 space-y-6 py-2 text-xs">
            {bookings.slice(0, 3).map((b, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface"></span>
                <span className="text-[10px] text-text-muted font-bold block mb-1">
                  {new Date(b.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
                <p className="text-text-sub leading-relaxed font-medium">
                  Created booking <span className="font-bold text-text-main">{b.booking_number}</span> for {b.title || "service"}.
                </p>
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="text-text-muted py-6">
                No recent activity recorded.
              </div>
            )}
          </div>
        </section>

      </div>

      {/* RECOMMENDED CREATIVES (Horizontal Cards Grid) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border-custom/50 pb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-text-main">Recommended Creatives</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {creatives.map((c) => (
            <div 
              key={c.id}
              className="bg-surface border border-border-custom/60 rounded-2xl overflow-hidden hover:border-primary/20 transition flex flex-col justify-between shadow-xs group"
            >
              <div className="aspect-[4/3] bg-surface-elevated relative overflow-hidden flex items-center justify-center border-b border-border-custom/50">
                {c.profile_photo_url ? (
                  <img
                    src={c.profile_photo_url}
                    alt={c.full_name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                ) : (
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">No Photo</span>
                )}
                
                <span className="absolute top-3 left-3 bg-dark/80 backdrop-blur-xs px-2.5 py-0.5 rounded text-[8px] font-black uppercase text-primary tracking-wider">
                  {getProfessionLabel(c.primary_profession)}
                </span>
              </div>

              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-main group-hover:text-primary transition">{c.full_name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-sub mt-1">
                    <MapPin className="w-3 h-3 text-text-muted" />
                    <span className="truncate">{c.city}, {c.state}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-custom/50 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                      <span className="font-extrabold text-text-main text-[11px]">{c.average_rating ? c.average_rating.toFixed(1) : "5.0"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/freelancers/${c.id}`)}
                    className="px-3.5 py-1.5 bg-surface-elevated hover:bg-surface border border-border-custom text-[10px] font-bold rounded-full transition"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coming Soon Modal */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border-custom rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-sm">Post a Project Brief</h3>
            </div>
            <p className="text-xs text-text-sub leading-relaxed font-normal">
              Redirection: Project briefs allow you to post your job requirements and collect proposals from talent. This module is currently under active development.
            </p>
            <p className="text-xs text-text-muted leading-relaxed font-normal">
              In the meantime, you can easily discover creatives directly from the explore page and book their predefined services immediately!
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setProjectModalOpen(false)}
                className="px-4 py-2 border border-border-custom rounded-xl hover:bg-surface-elevated text-xs font-bold text-text-sub transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => { setProjectModalOpen(false); router.push("/freelancers"); }}
                className="px-4 py-2 bg-primary text-text-on-dark rounded-xl hover:bg-primary-hover text-xs font-bold transition cursor-pointer"
              >
                Explore Talent
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
