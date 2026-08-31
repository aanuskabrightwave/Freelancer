"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { messageService } from "@/services/message.service";

type ActiveTab = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export default function ClientBookingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("PENDING");

  async function loadBookings() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await bookingService.getClientBookings();
      setBookings(data);
    } catch (err: any) {
      setErrorMsg("Failed to retrieve your booking requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const handleOpenChat = async (freelancerProfileId: number) => {
    try {
      setErrorMsg(null);
      const convo = await messageService.createConversation(freelancerProfileId);
      router.push(`/client/messages?active=${convo.id}`);
    } catch (err: any) {
      setErrorMsg("Failed to open chat with freelancer.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "REQUESTED":
      case "PENDING_CONFIRMATION":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "IN_PROGRESS":
        return "bg-primary-hover border-primary/30 text-primary";
      case "DELIVERY_PENDING":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "COMPLETED":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "REJECTED":
      case "CANCELLED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "RESCHEDULE_REQUESTED":
        return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
      default:
        return "bg-surface-elevated border-border-custom text-text-sub";
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const s = b.status;
    if (activeTab === "PENDING") {
      return s === "REQUESTED" || s === "PENDING_CONFIRMATION";
    }
    if (activeTab === "CONFIRMED") {
      return s === "CONFIRMED" || s === "RESCHEDULE_REQUESTED";
    }
    if (activeTab === "IN_PROGRESS") {
      return s === "IN_PROGRESS" || s === "DELIVERY_PENDING";
    }
    if (activeTab === "COMPLETED") {
      return s === "COMPLETED";
    }
    if (activeTab === "CANCELLED") {
      return s === "CANCELLED" || s === "REJECTED";
    }
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header card */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <h1 className="text-xl md:text-2xl font-black text-text-main">My Client Bookings</h1>
          <p className="text-text-sub text-xs mt-1">Track status, execution timelines, and manage rescheduling overrides.</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 border-b border-border-custom pb-2">
          {(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab
                  ? "bg-primary text-text-main shadow-lg shadow-primary"
                  : "bg-surface hover:bg-surface-elevated text-text-sub border border-border-custom"
              }`}
            >
              {tab === "PENDING" ? "Requested" : tab.toLowerCase().replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.map((booking) => (
            <div 
              key={booking.id}
              className="bg-surface border border-border-custom rounded-3xl p-6 shadow-lg hover:border-border-custom transition space-y-4"
            >
              {/* Row 1: Header metadata */}
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border-custom pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-primary font-mono font-bold">{booking.booking_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadge(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Agreed Amount</span>
                  <span className="text-sm font-black text-primary">₹{parseInt(booking.agreed_amount).toLocaleString()}</span>
                </div>
              </div>

              {/* Row 2: Service & Package specifics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="text-text-muted font-semibold mb-1 uppercase tracking-wider text-[10px]">Service / Project</h4>
                  <span className="text-text-main font-extrabold block">{booking.title || "Creative Listing"}</span>
                  <p className="text-[10px] text-text-sub mt-1 uppercase font-bold text-primary">
                    Source: {booking.source_type}
                  </p>
                </div>

                <div>
                  <h4 className="text-text-muted font-semibold mb-1 uppercase tracking-wider text-[10px]">Execution Date</h4>
                  <span className="text-text-main font-bold">
                    {booking.scheduled_date ? `${booking.scheduled_date} (${String(booking.start_time).substring(0,5)} - ${String(booking.end_time).substring(0,5)})` : "Not scheduled"}
                  </span>
                </div>
              </div>

              {/* Row 3: Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-border-custom">
                <span className="text-[10px] text-text-muted">
                  Created on {new Date(booking.created_at).toLocaleDateString()}
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenChat(booking.freelancer_profile_id)}
                    className="px-3.5 py-1.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub text-xs font-bold rounded-lg transition"
                  >
                    Open Chat
                  </button>

                  <Link
                    href={`/client/bookings/${booking.id}`}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-lg transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>

            </div>
          ))}

          {filteredBookings.length === 0 && (
            <div className="py-20 text-center text-text-muted border border-dashed border-border-custom rounded-3xl flex flex-col justify-center items-center">
              <span className="text-3xl mb-4">🗓️</span>
              <h3 className="font-bold text-text-main text-sm">No Bookings Found</h3>
              <p className="text-xs text-text-sub mt-2 max-w-sm">
                No active bookings in the "{activeTab.toLowerCase().replace("_", " ")}" status category.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
