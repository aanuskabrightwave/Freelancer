"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { X, Calendar, MapPin, User, ArrowRight, MessageSquare, ChevronRight, Inbox } from "lucide-react";

type ClientFilterTab =
  | "ALL"
  | "MATCHING"
  | "APPROVAL_REQUIRED"
  | "PAYMENT_DUE"
  | "IN_PROGRESS"
  | "DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

const FILTER_LABELS: Record<ClientFilterTab, string> = {
  ALL: "All Bookings",
  MATCHING: "Matching Professional",
  APPROVAL_REQUIRED: "Approval Required",
  PAYMENT_DUE: "Payment Due",
  IN_PROGRESS: "In Progress",
  DELIVERY: "Delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function ClientBookingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClientFilterTab>("ALL");

  useEffect(() => {
    const statusParam = searchParams.get("status") || searchParams.get("tab") || searchParams.get("filter");
    if (statusParam) {
      const upper = statusParam.toUpperCase();
      if (upper === "COMPLETED") setActiveTab("COMPLETED");
      else if (upper === "IN_PROGRESS") setActiveTab("IN_PROGRESS");
      else if (upper === "PAYMENT_DUE") setActiveTab("PAYMENT_DUE");
      else if (upper === "APPROVAL_REQUIRED") setActiveTab("APPROVAL_REQUIRED");
      else if (upper === "DELIVERY") setActiveTab("DELIVERY");
      else if (upper === "CANCELLED") setActiveTab("CANCELLED");
      else if (upper === "MATCHING") setActiveTab("MATCHING");
    }
  }, [searchParams]);

  async function loadBookings() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await bookingService.getClientBookings();
      setBookings(data);
    } catch (err: any) {
      setErrorMsg("We couldn't load your bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  // Client-Friendly Status Mapping
  const getClientFriendlyStatus = (b: any) => {
    const s = b.status;
    const payState = b.payment_completion_state;
    const assignStatus = b.latest_assignment_status;

    if (s === "CANCELLED") return "Cancelled";
    if (s === "REJECTED") return "Rejected";
    if (s === "COMPLETED") return "Completed";

    if (b.client_approval_required) {
      return "Your Approval Required";
    }

    if (s === "REQUESTED") {
      return "Awaiting Admin Review";
    }
    if (s === "MATCHING_IN_PROGRESS") {
      if (assignStatus === "OFFERED") {
        return "Professional Contacted";
      }
      return "Matching a Professional";
    }
    if (s === "CONFIRMED") {
      if (payState === "UNPAID") return "Deposit Due";
      return "Confirmed";
    }
    if (s === "IN_PROGRESS") {
      return "Work in Progress";
    }
    if (s === "DELIVERY_PENDING") {
      return "Admin Reviewing Work";
    }
    if (s === "RESCHEDULE_REQUESTED") {
      return "Reschedule Requested";
    }

    return s.replace(/_/g, " ");
  };

  const getStatusBadgeStyle = (statusLabel: string) => {
    switch (statusLabel) {
      case "Your Approval Required":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse";
      case "Awaiting Admin Review":
      case "Matching a Professional":
      case "Professional Contacted":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "Deposit Due":
      case "Balance Payment Due":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "Confirmed":
      case "Completed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Work in Progress":
        return "bg-primary/10 border-primary/20 text-primary";
      case "Admin Reviewing Work":
      case "Preparing Final Delivery":
      case "Delivery Ready":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "Cancelled":
      case "Rejected":
        return "bg-rose-950/40 border-rose-900/30 text-rose-300";
      default:
        return "bg-surface-elevated border-border-custom text-text-sub";
    }
  };

  const getNextActionLabel = (b: any) => {
    const friendly = getClientFriendlyStatus(b);
    if (friendly === "Your Approval Required") return "Review Professional";
    if (friendly === "Deposit Due") return "Pay Deposit";
    if (friendly === "Work in Progress") return "View Progress";
    if (friendly === "Admin Reviewing Work") return "View Booking";
    if (friendly === "Completed") return "View Details";
    if (friendly === "Cancelled" || friendly === "Rejected") return "Closed";
    return "View Details";
  };

  const filteredBookings = bookings.filter((b) => {
    const friendly = getClientFriendlyStatus(b);

    if (activeTab === "ALL") return true;
    if (activeTab === "MATCHING") {
      return friendly === "Matching a Professional" || friendly === "Professional Contacted" || friendly === "Awaiting Admin Review";
    }
    if (activeTab === "APPROVAL_REQUIRED") return friendly === "Your Approval Required";
    if (activeTab === "PAYMENT_DUE") {
      return friendly === "Deposit Due" || friendly === "Balance Payment Due";
    }
    if (activeTab === "IN_PROGRESS") return friendly === "Work in Progress";
    if (activeTab === "DELIVERY") {
      return (
        friendly === "Admin Reviewing Work" ||
        friendly === "Preparing Final Delivery" ||
        friendly === "Delivery Ready"
      );
    }
    if (activeTab === "COMPLETED") return friendly === "Completed";
    if (activeTab === "CANCELLED") return friendly === "Cancelled" || friendly === "Rejected";
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-full bg-transparent py-10 px-4 md:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 h-32 animate-pulse flex flex-col justify-between">
            <div className="w-1/3 h-5 bg-surface-elevated/80 rounded-lg"></div>
            <div className="w-1/2 h-3 bg-surface-elevated/80 rounded-lg"></div>
          </div>
          <div className="flex gap-2 pb-2 overflow-x-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-24 h-8 bg-surface/80 border border-white/10 rounded-xl animate-pulse shrink-0"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface/80 border border-white/10 rounded-3xl p-6 h-48 animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="w-1/4 h-4 bg-surface-elevated/80 rounded"></div>
                  <div className="w-1/6 h-4 bg-surface-elevated/80 rounded"></div>
                </div>
                <div className="w-full h-12 bg-surface-elevated/80 rounded-xl"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent text-text-main py-10 px-4 md:px-8 font-sans pb-16">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Card */}
        <div className="bg-surface/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <h1 className="text-xl md:text-2xl font-black text-text-main">Bookings</h1>
          <p className="text-text-sub text-xs mt-1">
            Track your booking requests, professional assignment, payments and delivery progress.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters (Awaiting Review removed) */}
        <div className="flex gap-2 pb-2 overflow-x-auto border-b border-border-custom scrollbar-thin">
          {(Object.keys(FILTER_LABELS) as ClientFilterTab[]).map((tab) => {
            const count = bookings.filter((b) => {
              const friendly = getClientFriendlyStatus(b);
              if (tab === "ALL") return true;
              if (tab === "MATCHING") return friendly === "Matching a Professional" || friendly === "Professional Contacted" || friendly === "Awaiting Admin Review";
              if (tab === "APPROVAL_REQUIRED") return friendly === "Your Approval Required";
              if (tab === "PAYMENT_DUE") return friendly === "Deposit Due" || friendly === "Balance Payment Due";
              if (tab === "IN_PROGRESS") return friendly === "Work in Progress";
              if (tab === "DELIVERY") return ["Admin Reviewing Work", "Preparing Final Delivery", "Delivery Ready"].includes(friendly);
              if (tab === "COMPLETED") return friendly === "Completed";
              if (tab === "CANCELLED") return friendly === "Cancelled" || friendly === "Rejected";
              return false;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                  activeTab === tab
                    ? "bg-primary text-text-on-dark border-primary shadow-sm"
                    : "bg-surface hover:bg-surface-elevated text-text-sub border-border-custom"
                }`}
              >
                <span>{FILTER_LABELS[tab]}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    activeTab === tab ? "bg-text-on-dark/20 text-text-on-dark" : "bg-surface-elevated text-text-muted"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.map((booking) => {
            const friendlyStatus = getClientFriendlyStatus(booking);
            
            const selectedName = booking.selected_freelancer?.full_name || booking.selected_freelancer?.user?.full_name || "N/A";
            const assignedName = booking.freelancer?.full_name || booking.freelancer?.user?.full_name || null;

            return (
              <div 
                key={booking.id}
                className="bg-surface border border-border-custom rounded-3xl p-6 shadow-lg hover:border-border-custom/80 transition duration-150 flex flex-col md:flex-row md:items-stretch justify-between gap-6"
              >
                {/* Left Side: Summary info */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-primary font-mono font-bold tracking-tight">{booking.booking_number}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(friendlyStatus)}`}>
                      {friendlyStatus}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      • {new Date(booking.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-text-main">{booking.title || "Service Execution"}</h3>
                    <p className="text-[10px] text-text-sub mt-0.5 font-medium">
                      Venue: <span className="text-text-main font-semibold">{booking.venue_name || "Remote Delivery"}</span>
                    </p>
                  </div>

                  {/* Professional assignment visual mapping */}
                  <div className="bg-surface-elevated/40 border border-border-custom/50 rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px]">Selected Professional</span>
                      <span className="text-text-main font-bold mt-0.5 block">{selectedName}</span>
                    </div>
                    <div>
                      <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px]">Assigned Professional</span>
                      <span className={`font-bold mt-0.5 block ${assignedName ? "text-primary" : "text-text-sub/70 italic"}`}>
                        {assignedName || "Awaiting confirmation"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Price / CTA Actions */}
                <div className="md:w-48 border-t md:border-t-0 md:border-l border-border-custom/50 pt-4 md:pt-0 md:pl-6 flex flex-row md:flex-col justify-between items-center md:items-end md:justify-center gap-4">
                  <div className="text-left md:text-right">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Agreed Budget</span>
                    <span className="text-base font-black text-text-main">₹{parseInt(booking.agreed_amount).toLocaleString()}</span>
                    {booking.payment_completion_state && (
                      <span className="text-[8px] font-bold block mt-0.5 text-primary uppercase tracking-widest">
                        {booking.payment_completion_state.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full max-w-[150px]">
                    <Link
                      href={`/client/bookings/${booking.id}`}
                      className="w-full text-center py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {getNextActionLabel(booking)}
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}

          {filteredBookings.length === 0 && (
            <div className="py-20 text-center text-text-muted border border-dashed border-border-custom rounded-3xl flex flex-col justify-center items-center space-y-4">
              <Inbox className="w-10 h-10 text-text-muted" />
              <div>
                <h3 className="font-bold text-text-main text-sm">No Bookings Found</h3>
                <p className="text-xs text-text-sub mt-1 max-w-xs mx-auto">
                  You haven't created any bookings in this category yet.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Link
                  href="/services"
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-main border border-border-custom text-xs font-bold rounded-xl transition"
                >
                  Browse Services
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ClientBookingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ClientBookingsContent />
    </Suspense>
  );
}
