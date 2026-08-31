"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { messageService } from "@/services/message.service";
import {
  Calendar,
  Clock,
  Briefcase,
  FileText,
  MessageSquare,
  ChevronRight,
  Inbox,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

type BookingTab = "ALL" | "ASSIGNMENTS" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export default function FreelancerBookingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookingTab>("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [bookingsData, assignmentsData] = await Promise.all([
        bookingService.getFreelancerBookings(),
        bookingService.getFreelancerAssignments()
      ]);
      setBookings(bookingsData);
      setAssignments(assignmentsData);
    } catch (err: any) {
      setErrorMsg("We couldn't load your bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Direct Freelancer ↔ Admin chat room navigation (Part 12)
  const handleOpenAdminChat = async (booking: any) => {
    if (chatLoading) return;
    try {
      setChatLoading(true);
      setErrorMsg(null);
      
      const conversations = await messageService.getConversations();
      // Scopes only FREELANCER_ADMIN conversation for this booking (Part 12)
      const existingConvo = conversations.find(
        (c: any) => c.conversation_type === "FREELANCER_ADMIN" && c.booking_id === booking.id
      );

      if (existingConvo) {
        router.push(`/freelancer/messages?active=${existingConvo.id}`);
      } else {
        setErrorMsg("Admin-mediated messaging channel is not created yet.");
      }
    } catch (err: any) {
      setErrorMsg("Failed to open coordination chat with Admin.");
    } finally {
      setChatLoading(false);
    }
  };

  // Status Badge Mapper (Part 6)
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

  const getFriendlyBookingStatus = (b: any) => {
    const s = b.status;
    const payState = b.payment_completion_state;

    if (s === "CONFIRMED") {
      return payState === "UNPAID"
        ? { label: "Waiting for Client Deposit", style: "bg-rose-500/10 border-rose-500/30 text-rose-450 font-bold" }
        : { label: "Ready to Start", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
    }
    if (s === "IN_PROGRESS") {
      return { label: "In Progress", style: "bg-primary/10 border-primary/20 text-primary font-bold" };
    }
    if (s === "DELIVERY_PENDING") {
      return { label: "Submitted to Admin", style: "bg-blue-500/10 border-blue-500/30 text-blue-400" };
    }
    if (s === "COMPLETED") {
      return { label: "Completed", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-450" };
    }
    if (s === "CANCELLED" || s === "REJECTED") {
      return { label: "Cancelled", style: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
    }
    return { label: s.replace(/_/g, " "), style: "bg-surface-elevated border-border-custom text-text-sub" };
  };

  // Filtering lists (Part 3)
  const isPendingAssignment = (status: string) => ["OFFERED", "ACCEPTED", "REJECTED"].includes(status);

  const pendingAssignmentsList = assignments.filter((a) => a.status === "OFFERED");
  const activeConfirmedJobsList = bookings.filter((b) =>
    ["CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING"].includes(b.status)
  );

  const getFilteredItems = () => {
    if (activeTab === "ASSIGNMENTS") return pendingAssignmentsList.map(a => ({ ...a, type: "ASSIGNMENT" }));
    if (activeTab === "ACTIVE") return activeConfirmedJobsList.map(b => ({ ...b, type: "BOOKING" }));
    if (activeTab === "COMPLETED") return bookings.filter(b => b.status === "COMPLETED").map(b => ({ ...b, type: "BOOKING" }));
    if (activeTab === "CANCELLED") return bookings.filter(b => ["CANCELLED", "REJECTED"].includes(b.status)).map(b => ({ ...b, type: "BOOKING" }));

    // ALL (Combined)
    const list: any[] = [];
    pendingAssignmentsList.forEach(a => list.push({ ...a, type: "ASSIGNMENT" }));
    bookings.forEach(b => list.push({ ...b, type: "BOOKING" }));
    return list;
  };

  const filteredItems = getFilteredItems();

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 md:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="bg-surface border border-border-custom rounded-3xl p-6 h-32 flex flex-col justify-between">
            <div className="w-1/3 h-5 bg-surface-elevated rounded"></div>
            <div className="w-1/2 h-3 bg-surface-elevated rounded"></div>
          </div>
          <div className="h-48 bg-surface rounded-3xl border border-border-custom"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">Bookings</h1>
            <p className="text-text-sub text-xs mt-1">
              Manage assignments and confirmed jobs coordinated by our team.
            </p>
          </div>
          <Link
            href="/freelancer/dashboard"
            className="text-xs uppercase tracking-widest font-bold text-text-sub hover:text-primary flex items-center gap-2 group transition"
          >
            Dashboard →
          </Link>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters (Part 3) */}
        <div className="flex gap-2 pb-2 overflow-x-auto border-b border-border-custom scrollbar-thin">
          {(["ALL", "ASSIGNMENTS", "ACTIVE", "COMPLETED", "CANCELLED"] as BookingTab[]).map((tab) => {
            const count = getFilteredItems().length; // Simple tab count helper
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer shrink-0 ${
                  activeTab === tab
                    ? "bg-primary text-text-on-dark border-primary shadow-sm"
                    : "bg-surface hover:bg-surface-elevated text-text-sub border-border-custom"
                }`}
              >
                {tab === "ALL" ? "All Bookings" : tab === "ASSIGNMENTS" ? "Offered Assignments" : tab === "ACTIVE" ? "Active Jobs" : tab.toLowerCase().replace(/_/g, " ")}
              </button>
            );
          })}
        </div>

        {/* Bookings / Assignments List */}
        <div className="space-y-6">
          {filteredItems.map((item) => {
            const isAssignment = item.type === "ASSIGNMENT";
            const status = isAssignment
              ? getFriendlyAssignmentStatus(item.status, item.counter_offer_amount !== null)
              : getFriendlyBookingStatus(item);

            const refNumber = isAssignment ? item.booking_number : item.booking_number;
            const title = item.title || "Creative Work Request";
            const offeredVal = isAssignment ? item.offered_payout_amount : item.agreed_amount;
            const bookingId = isAssignment ? item.booking_id : item.id;
            const formattedDate = item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString("en-IN") : "Flexible Schedule";

            return (
              <div
                key={item.id}
                className="bg-surface border border-border-custom rounded-3xl p-6 shadow-md space-y-4 hover:border-border-custom/80 transition duration-150"
              >
                {/* Header row metadata */}
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border-custom/50 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-text-muted font-mono font-bold">{refNumber}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${status.style}`}>
                      {status.label}
                    </span>
                    {isAssignment && (
                      <span className="px-2 py-0.5 rounded-full text-[8px] bg-amber-500/10 text-amber-400 font-extrabold uppercase border border-amber-500/20">
                        Admin Offer
                      </span>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Offered Payout</span>
                    <span className="text-sm font-black text-primary">₹{Number(offeredVal).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Logistics info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <h4 className="text-text-muted font-bold uppercase tracking-wider text-[9px] mb-0.5">Job Requirement</h4>
                    <span className="text-text-main font-bold block">{title}</span>
                    <span className="text-[10px] text-text-sub block mt-1">
                      Venue: {item.venue_name || "Coordinated Location"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-text-muted font-bold uppercase tracking-wider text-[9px] mb-0.5">Shoot Schedule</h4>
                    <span className="text-text-main font-bold block">{formattedDate}</span>
                    {item.start_time && (
                      <span className="text-[10px] text-text-sub block mt-0.5 font-mono">
                        {String(item.start_time).substring(0, 5)} - {String(item.end_time).substring(0, 5)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-border-custom/50 flex-wrap gap-2">
                  <span className="text-[9px] text-text-muted">
                    {isAssignment ? "Assigned Offer" : "Confirmed Contract"}
                  </span>

                  <div className="flex gap-2">
                    {!isAssignment && (
                      <button
                        onClick={() => handleOpenAdminChat(item)}
                        className="px-3.5 py-1.5 bg-surface border border-border-custom hover:bg-surface-elevated text-text-sub hover:text-text-main text-xs font-bold rounded-lg transition"
                      >
                        Message Admin
                      </button>
                    )}
                    
                    <Link
                      href={`/freelancer/bookings/${bookingId}`}
                      className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-lg transition text-center"
                    >
                      Review Assignment
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-24 text-center text-text-muted border border-dashed border-border-custom rounded-3xl flex flex-col justify-center items-center space-y-4">
              <Inbox className="w-10 h-10 text-text-muted" />
              <div>
                <h3 className="font-bold text-text-main text-sm">No bookings yet</h3>
                <p className="text-xs text-text-sub mt-1">
                  Bookings assigned by our team will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
