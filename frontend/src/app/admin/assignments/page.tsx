"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface UserMiniOut {
  id: number;
  full_name: string;
  email: string;
}

interface FreelancerMiniOut {
  id: number;
  user_id: number;
  professional_title: string;
  full_name: string;
}

interface BookingAssignmentOut {
  id: number;
  status: string;
  offered_payout_amount: string;
  decline_reason: string | null;
  counter_offer_amount: string | null;
  counter_offer_notes: string | null;
  is_replacement: boolean;
  client_approval_required: boolean;
  client_approval_status: string;
  client_approval_notes: string | null;
  created_at: string;
  responded_at: string | null;
  freelancer_profile?: {
    id: number;
    full_name: string;
  };
}

interface BookingListItem {
  id: number;
  booking_number: string;
  title: string | null;
  status: string;
  scheduled_date: string | null;
  agreed_amount: string;
  created_at: string;
  client: UserMiniOut | null;
  selected_freelancer: FreelancerMiniOut | null;
  freelancer: FreelancerMiniOut | null;
  active_assignment: BookingAssignmentOut | null;
}

function AssignmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");

  // State
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<string>("ALL");

  useEffect(() => {
    // Map URL status queries to tabs
    if (statusParam === "pending") {
      setFilterTab("AWAITING_FREELANCER");
    } else if (statusParam === "countered") {
      setFilterTab("COUNTER_OFFERS");
    } else if (statusParam === "approval") {
      setFilterTab("AWAITING_CLIENT_APPROVAL");
    } else {
      setFilterTab("ALL");
    }
  }, [statusParam]);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<BookingListItem[]>("/admin/bookings");
        // Keep bookings that have matching in progress status or have active assignments
        const matches = data.filter(
          (b) => b.active_assignment !== null || b.status === "MATCHING_IN_PROGRESS"
        );
        setBookings(matches);
      } catch (err: any) {
        setError(err.message || "We couldn't load assignments. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(typeof val === "string" ? parseFloat(val || "0") : val);
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "N/A";
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  const getFriendlyStatus = (booking: BookingListItem) => {
    const a = booking.active_assignment;
    if (!a) {
      return { label: "Unassigned", style: "bg-surface border-border-custom text-text-sub" };
    }
    if (a.status === "OFFERED") {
      return { label: "Awaiting Freelancer", style: "bg-amber-955/20 border-amber-900/30 text-amber-200" };
    }
    if (a.status === "ACCEPTED") {
      if (a.client_approval_status === "PENDING") {
        return { label: "Awaiting Client Approval", style: "bg-blue-955/35 border-blue-900/30 text-blue-200" };
      }
      return { label: "Accepted", style: "bg-emerald-955/45 border-emerald-900/30 text-emerald-300" };
    }
    if (a.status === "DECLINED") {
      if (a.counter_offer_amount) {
        return { label: "Counter Offer", style: "bg-purple-955 border-purple-900 text-purple-300" };
      }
      return { label: "Declined", style: "bg-rose-955/45 border-rose-900/30 text-rose-300" };
    }
    return { label: a.status, style: "bg-surface border-border-custom text-text-sub" };
  };

  const getNextAction = (booking: BookingListItem) => {
    const a = booking.active_assignment;
    if (!a) {
      return {
        label: "Assign Creator",
        style: "bg-primary text-text-on-dark hover:bg-primary-hover",
        url: `/admin/bookings/${booking.id}`
      };
    }
    if (a.status === "OFFERED") {
      return {
        label: "Message Freelancer",
        style: "bg-surface text-text-main border border-border-custom hover:bg-surface-elevated",
        url: `/admin/messages?booking_id=${booking.id}&role=FREELANCER`
      };
    }
    if (a.status === "DECLINED" && a.counter_offer_amount) {
      return {
        label: "Review Counter",
        style: "bg-primary text-text-on-dark hover:bg-primary-hover",
        url: `/admin/bookings/${booking.id}`
      };
    }
    if (a.status === "DECLINED") {
      return {
        label: "Reassign",
        style: "bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30",
        url: `/admin/bookings/${booking.id}`
      };
    }
    if (a.status === "ACCEPTED" && a.client_approval_status === "PENDING") {
      return {
        label: "Message Client",
        style: "bg-surface text-text-main border border-border-custom hover:bg-surface-elevated",
        url: `/admin/messages?booking_id=${booking.id}&role=CLIENT`
      };
    }
    return {
      label: "Open Booking",
      style: "bg-surface text-text-sub border border-border-custom hover:bg-surface-elevated",
      url: `/admin/bookings/${booking.id}`
    };
  };

  const tabs = [
    { label: "All Assignments", value: "ALL" },
    { label: "Awaiting Creator", value: "AWAITING_FREELANCER" },
    { label: "Counter Offers", value: "COUNTER_OFFERS" },
    { label: "Declined", value: "DECLINED" },
    { label: "Awaiting Client", value: "AWAITING_CLIENT_APPROVAL" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Unassigned", value: "UNASSIGNED" }
  ];

  // Filtering Logic
  const filteredBookings = bookings.filter((b) => {
    const a = b.active_assignment;

    // 1. Filter tabs matching
    if (filterTab === "AWAITING_FREELANCER" && (!a || a.status !== "OFFERED")) return false;
    if (filterTab === "COUNTER_OFFERS" && (!a || a.status !== "DECLINED" || !a.counter_offer_amount)) return false;
    if (filterTab === "DECLINED" && (!a || a.status !== "DECLINED" || a.counter_offer_amount)) return false;
    if (filterTab === "AWAITING_CLIENT_APPROVAL" && (!a || a.client_approval_status !== "PENDING")) return false;
    if (filterTab === "ACCEPTED" && (!a || a.status !== "ACCEPTED")) return false;
    if (filterTab === "UNASSIGNED" && (a !== null || b.status !== "MATCHING_IN_PROGRESS")) return false;

    // 2. Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = b.booking_number.toLowerCase().includes(q);
      const matchClient = b.client?.full_name.toLowerCase().includes(q) || false;
      const matchCreator = b.freelancer?.full_name.toLowerCase().includes(q) || a?.freelancer_profile?.full_name.toLowerCase().includes(q) || false;
      const matchTitle = b.title?.toLowerCase().includes(q) || false;
      return matchRef || matchClient || matchCreator || matchTitle;
    }

    return true;
  });

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-main font-semibold">Assignments Queue</h1>
        <p className="text-text-sub text-xs mt-1">Track professional assignment requests, responses, counters and approvals.</p>
      </div>

      {/* Search and Tabs Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-surface-elevated border border-border-custom p-4 rounded-3xl">
        <div className="flex flex-wrap gap-1.5 font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                filterTab === tab.value
                  ? "bg-primary text-text-on-dark shadow"
                  : "text-text-sub hover:text-text-main hover:bg-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-80">
          <input
            type="text"
            placeholder="Search Reference / User / Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-full px-5 py-2.5 pl-10 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted"
          />
          <span className="absolute left-4 top-3 text-text-muted text-xs">🔍</span>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-elevated border border-border-custom rounded-3xl"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-955/35 border border-rose-900/50 text-rose-200 rounded-3xl text-center text-xs font-semibold">
          {error}
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bg-surface-elevated border border-border-custom rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[10px] bg-surface/50">
                  <th className="py-4 px-5">Booking Ref</th>
                  <th className="py-4 px-5">Booking Title</th>
                  <th className="py-4 px-5">Client</th>
                  <th className="py-4 px-5">Candidate Professional</th>
                  <th className="py-4 px-5">Type</th>
                  <th className="py-4 px-5 text-right">Offered Amount</th>
                  <th className="py-4 px-5 text-right">Counter proposed</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Client Approval</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 font-medium">
                {filteredBookings.map((booking) => {
                  const a = booking.active_assignment;
                  const friendly = getFriendlyStatus(booking);
                  const action = getNextAction(booking);
                  
                  // Resolve assignment type mapping (Part 7)
                  let typeLabel = "Original Selection";
                  if (a?.is_replacement) {
                    typeLabel = "Replacement";
                  } else if (booking.selected_freelancer?.id && a?.freelancer_profile?.id && booking.selected_freelancer.id !== a.freelancer_profile.id) {
                    typeLabel = "Reassignment";
                  }

                  return (
                    <tr key={booking.id} className="hover:bg-surface/30 transition-all">
                      <td className="py-4 px-5 text-text-main font-bold">
                        <Link href={`/admin/bookings/${booking.id}`} className="hover:text-primary transition-colors">
                          {booking.booking_number}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-text-main font-semibold truncate max-w-[150px]">{booking.title || "Support Request"}</td>
                      <td className="py-4 px-5 text-text-sub">{booking.client?.full_name}</td>
                      <td className="py-4 px-5 text-text-sub font-semibold">
                        {a?.freelancer_profile?.full_name || booking.freelancer?.full_name || <span className="italic text-text-muted">Unassigned</span>}
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-[10px] text-text-muted capitalize">{typeLabel}</span>
                      </td>
                      <td className="py-4 px-5 text-right text-text-main font-bold">
                        {a ? formatCurrency(a.offered_payout_amount) : "N/A"}
                      </td>
                      <td className="py-4 px-5 text-right text-purple-400 font-bold">
                        {a?.counter_offer_amount ? formatCurrency(a.counter_offer_amount) : "—"}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-wide uppercase ${friendly.style}`}>
                          {friendly.label}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {a?.client_approval_status === "PENDING" ? (
                          <span className="text-amber-500 font-bold uppercase tracking-wider text-[9px]">Pending approval</span>
                        ) : a?.client_approval_status === "APPROVED" ? (
                          <span className="text-emerald-500 font-bold uppercase tracking-wider text-[9px]">Approved</span>
                        ) : a?.client_approval_status === "REJECTED" ? (
                          <span className="text-rose-500 font-bold uppercase tracking-wider text-[9px]">Declined</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={action.url}
                          className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${action.style}`}
                        >
                          {action.label}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-text-sub text-xs bg-surface-elevated border border-dashed border-border-custom rounded-3xl font-medium">
          No assignments match this view.
        </div>
      )}
    </div>
  );
}

export default function AdminAssignmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading workspace parameters...</div>}>
      <AssignmentsContent />
    </Suspense>
  );
}
