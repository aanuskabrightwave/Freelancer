"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { projectService } from "@/services/project.service";
import { messageService } from "@/services/message.service";
import { notificationService } from "@/services/notification.service";
import { getMediaUrl } from "@/lib/api";
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
  CreditCard,
  Bell,
  Star,
  MapPin,
  HelpCircle
} from "lucide-react";

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Metrics
  const [bookings, setBookings] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Fetch bookings
        const bookingsList = await bookingService.getClientBookings();
        setBookings(bookingsList);

        // 2. Fetch projects
        try {
          const projectsList = await projectService.getClientProjects();
          // Filter to admin-managed only for this dashboard context
          setProjects(projectsList.filter((p: any) => p.is_admin_managed));
        } catch (e) {
          console.error("Failed to load client projects list:", e);
        }

        // 3. Fetch conversations
        try {
          const convList = await messageService.getConversations();
          setConversations(convList.filter((c: any) => c.conversation_type === "CLIENT_ADMIN"));
        } catch (e) {
          console.error("Failed to load client messages list:", e);
        }

        // 4. Fetch unread notifications
        try {
          const countRes = await notificationService.getUnreadCount();
          setUnreadNotifications(countRes.count);
        } catch (e) {
          console.error("Failed to load notifications count", e);
        }

      } catch (err) {
        setErrorMsg("We couldn't retrieve dashboard workspace data. Please reload page.");
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
          {[1, 2, 3, 4].map((n) => (
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

  // Map backend statuses to friendly client labels (Part 6)
  const getFriendlyStatusLabel = (booking: any) => {
    const a = booking.active_assignment;
    if (booking.status === "REQUESTED") {
      return "Awaiting Admin Review";
    }
    if (booking.status === "MATCHING_IN_PROGRESS") {
      if (a && a.status === "OFFERED") {
        return "Professional Contacted";
      }
      if (a && a.status === "ACCEPTED" && a.client_approval_status === "PENDING") {
        return "Your Approval Required";
      }
      return "Matching a Professional";
    }
    if (booking.status === "CONFIRMED") {
      const depositPaid = booking.payment_summary
        ? parseFloat(booking.payment_summary.deposit_paid_amount) > 0
        : false;
      return depositPaid ? "Ready to Start" : "Deposit Due";
    }
    if (booking.status === "IN_PROGRESS") {
      return "Work in Progress";
    }
    if (booking.status === "DELIVERY_PENDING") {
      return "Admin Reviewing Work";
    }
    return booking.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(typeof val === "string" ? parseFloat(val || "0") : val);
  };

  // Calculations
  const activeBookings = bookings.filter((b) =>
    ["REQUESTED", "MATCHING_IN_PROGRESS", "CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING"].includes(b.status)
  );

  const projectsUnderReviewCount = projects.filter((p) =>
    ["SUBMITTED", "UNDER_ADMIN_REVIEW", "MATCHING"].includes(p.status)
  ).length;

  const paymentsDueCount = bookings.filter((b) => {
    const isUnpaidDeposit = b.status === "CONFIRMED" && b.payment_summary && parseFloat(b.payment_summary.deposit_paid_amount) === 0;
    const isUnpaidBalance = b.status === "IN_PROGRESS" && b.payment_summary && parseFloat(b.payment_summary.remaining_balance) > 0;
    return isUnpaidDeposit || isUnpaidBalance;
  }).length;

  const deliveriesCount = bookings.filter((b) => b.status === "DELIVERY_PENDING").length;

  // Build Needs Attention Items (Part 5)
  const attentionItems: { label: string; actionText: string; link: string; type: "payment" | "delivery" | "message" | "approval" }[] = [];

  bookings.forEach((b) => {
    const a = b.active_assignment;

    // 1. Replacement Creator Approval Request
    if (a && a.is_replacement && a.client_approval_status === "PENDING" && a.status === "ACCEPTED") {
      attentionItems.push({
        label: `A replacement professional candidate requires your confirmation for booking #${b.booking_number}.`,
        actionText: "Review Replacement",
        link: `/client/bookings/${b.id}`,
        type: "approval"
      });
    }

    // 2. Deposit Due
    if (b.status === "CONFIRMED" && b.payment_summary && parseFloat(b.payment_summary.deposit_paid_amount) === 0) {
      attentionItems.push({
        label: `Deposit payment of ${formatCurrency(b.payment_summary.deposit_amount)} is due for booking #${b.booking_number}.`,
        actionText: "Pay Deposit",
        link: `/client/payments`,
        type: "payment"
      });
    }

    // 3. Balance Due
    if (b.status === "IN_PROGRESS" && b.payment_summary && parseFloat(b.payment_summary.remaining_balance) > 0) {
      attentionItems.push({
        label: `Remaining balance payment is ready to clear for booking #${b.booking_number}.`,
        actionText: "Pay Balance",
        link: `/client/payments`,
        type: "payment"
      });
    }
  });



  const getAlertIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <Clock className="w-4 h-4 text-primary" />;
      case "approval":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "delivery":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-primary" />;
    }
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
            Review status updates and messaging logs with the Coordinator.
          </p>
        </div>
        
        {/* QUICK ACTIONS */}
        <div className="flex items-center gap-3">
          <Link
            href="/freelancers"
            className="flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Explore Creatives</span>
          </Link>
          <Link
            href="/services"
            className="flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Browse Services</span>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-955/35 border border-rose-900/50 text-rose-200 rounded-xl p-4 text-xs font-medium">
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
          <div className="divide-y divide-border-custom/30 font-medium">
            {attentionItems.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1">
                <div className="flex items-center gap-3 text-xs text-text-sub">
                  {getAlertIcon(item.type)}
                  <span>{item.label}</span>
                </div>
                <Link
                  href={item.link}
                  className="text-xs text-primary font-bold hover:underline self-start sm:self-auto"
                >
                  {item.actionText} →
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

      {/* SUMMARY KPI CARDS (4-Column Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Link href="/client/bookings" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Active Hirings</span>
          <div className="flex items-baseline justify-between font-semibold">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">{activeBookings.length}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/client/projects" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Projects Under Review</span>
          <div className="flex items-baseline justify-between font-semibold">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">{projectsUnderReviewCount}</span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              View Status <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/client/payments" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Payments Due</span>
          <div className="flex items-baseline justify-between font-semibold">
            <span className={`text-3xl font-extrabold transition ${paymentsDueCount > 0 ? "text-primary" : "text-text-main group-hover:text-primary"}`}>
              {paymentsDueCount}
            </span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Clear Payments <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/client/deliveries" className="bg-surface border border-border-custom/70 hover:border-primary/30 p-5 rounded-2xl flex flex-col justify-between shadow-xs transition group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-4">Deliveries</span>
          <div className="flex items-baseline justify-between font-semibold">
            <span className="text-3xl font-extrabold text-text-main group-hover:text-primary transition">
              {deliveriesCount}
            </span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              Review Work <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

      </section>

      {/* DASHBOARD ROWS (Bookings & Projects lists) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Bookings List */}
        <section className="bg-surface border border-border-custom rounded-3xl p-6 space-y-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
              <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Active Bookings</span>
              </h3>
              <Link href="/client/bookings" className="text-xs text-primary font-bold hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-4 mt-4 font-semibold text-xs">
              {bookings.length > 0 ? (
                bookings.slice(0, 3).map((b) => {
                  const hasAssigned = b.freelancer !== null;
                  return (
                    <div key={b.id} className="p-4 border border-border-custom/60 rounded-2xl hover:border-border-custom transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-primary">{b.booking_number}</span>
                          <span className="text-[8px] px-2.5 py-0.5 border border-primary/20 bg-primary/5 rounded-full text-primary font-extrabold uppercase">
                            {getFriendlyStatusLabel(b)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-text-main">{b.title || "Creative Booking"}</h4>
                        <div className="text-[9px] text-text-sub">
                          <p>Original Selection: {b.selected_freelancer?.full_name}</p>
                          <p>Assigned Creator: {hasAssigned ? b.freelancer.full_name : <span className="italic text-text-muted">Not confirmed yet</span>}</p>
                        </div>
                      </div>
                      
                      <Link
                        href={`/client/bookings/${b.id}`}
                        className="px-4 py-1.5 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-[10px] font-bold rounded-full transition text-center self-start sm:self-auto"
                      >
                        View Booking
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-text-muted border border-dashed border-border-custom/50 rounded-2xl bg-surface-elevated font-medium">
                  <p>No active bookings requests yet.</p>
                </div>
              )}
            </div>
          </div>

          {bookings.length === 0 && (
            <div className="pt-4 border-t border-border-custom/50 flex gap-2 font-semibold">
              <Link href="/freelancers" className="flex-1 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider text-center">
                Explore Creatives
              </Link>
              <Link href="/services" className="flex-1 py-2 bg-surface hover:bg-surface-elevated text-text-sub border border-border-custom text-[10px] font-bold rounded-full uppercase tracking-wider text-center">
                Browse Services
              </Link>
            </div>
          )}
        </section>

        {/* Projects list */}
        <section className="bg-surface border border-border-custom rounded-3xl p-6 space-y-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
              <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Job Posts</span>
              </h3>
              <Link href="/client/projects" className="text-xs text-primary font-bold hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-4 mt-4 font-semibold text-xs">
              {projects.length > 0 ? (
                projects.slice(0, 3).map((p) => {
                  const refCode = `PRJ-${String(p.id).padStart(6, "0")}`;
                  return (
                    <div key={p.id} className="p-4 border border-border-custom/60 rounded-2xl hover:border-border-custom transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-primary">{refCode}</span>
                          <span className="text-[8px] px-2.5 py-0.5 border border-primary/20 bg-primary/5 rounded-full text-primary font-extrabold uppercase">
                            {p.status.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-text-main">{p.title}</h4>
                        <p className="text-[9px] text-text-sub font-medium">Budget: {formatCurrency(p.budget)}</p>
                      </div>
                      
                      <Link
                        href={`/client/projects/${p.id}`}
                        className="px-4 py-1.5 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-[10px] font-bold rounded-full transition text-center self-start sm:self-auto"
                      >
                        View Project
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-text-muted border border-dashed border-border-custom/50 rounded-2xl bg-surface-elevated font-medium">
                  <p>No active project posts yet.</p>
                </div>
              )}
            </div>
          </div>

          {projects.length === 0 && (
            <div className="pt-4 border-t border-border-custom/50 font-semibold">
              <Link href="/client/projects" className="w-full py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider text-center block">
                Post a Project Brief
              </Link>
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
