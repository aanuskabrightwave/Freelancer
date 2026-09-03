"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface UserMiniOut {
  id: number;
  full_name: string;
  email: string;
}

interface FreelancerMiniOut {
  id: number;
  user_id: number;
  professional_title?: string;
  full_name?: string;
  user?: UserMiniOut;
}

interface BookingAssignmentOut {
  id: number;
  status: string;
  offered_payout_amount: string;
  decline_reason: string | null;
  counter_offer_amount: string | null;
  is_replacement: boolean;
  client_approval_required: boolean;
  assignment_round?: number;
  client_approval_status: string;
  freelancer_profile?: FreelancerMiniOut;
}

interface BookingListItem {
  id: number;
  booking_number: string;
  title: string | null;
  source_type: string;
  status: string;
  scheduled_date: string | null;
  venue_name: string | null;
  location_city: string | null;
  agreed_amount: string;
  is_admin_managed: boolean;
  created_at: string;
  client: UserMiniOut | null;
  selected_freelancer: FreelancerMiniOut | null;
  freelancer: FreelancerMiniOut | null;
  active_assignment: BookingAssignmentOut | null;
}

export default function AdminBookingInboxPage() {
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (statusFilter !== "ALL") {
          params["status"] = statusFilter;
        }
        if (searchQuery.trim()) {
          params["search"] = searchQuery.trim();
        }
        const data = await api.get<BookingListItem[]>("/admin/bookings", { params });
        // Filter to admin-managed bookings only
        const managed = data.filter((b) => b.is_admin_managed);
        setBookings(managed);
      } catch (err: any) {
        setError(err.message || "We couldn't load booking requests. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, [statusFilter, searchQuery]);

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

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "bg-amber-950/40 text-amber-300 border-amber-900/30";
      case "MATCHING_IN_PROGRESS":
        return "bg-primary/10 text-primary border-primary/20";
      case "PENDING_CONFIRMATION":
        return "bg-blue-950/40 text-blue-300 border-blue-900/30";
      case "CONFIRMED":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-900/30";
      case "IN_PROGRESS":
        return "bg-teal-950/40 text-teal-300 border-teal-900/30";
      case "COMPLETED":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-900/30";
      case "REJECTED":
      case "CANCELLED":
        return "bg-rose-950/40 text-rose-300 border-rose-900/30";
      default:
        return "bg-surface text-text-sub border-border-custom";
    }
  };

  const getFriendlyStatusLabel = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "Awaiting Review";
      case "MATCHING_IN_PROGRESS":
        return "Matching Creator";
      case "PENDING_CONFIRMATION":
        return "Awaiting Confirmation";
      default:
        return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const getNextAction = (booking: BookingListItem) => {
    if (booking.status === "REQUESTED") {
      return { label: "Review Booking", style: "bg-primary text-text-on-dark hover:bg-primary-hover" };
    }
    if (booking.status === "MATCHING_IN_PROGRESS") {
      if (!booking.active_assignment) {
        return { label: "Assign Freelancer", style: "bg-surface text-text-main border border-border-custom hover:bg-surface-elevated" };
      }
      if (booking.active_assignment.status === "OFFERED") {
        if (booking.active_assignment.client_approval_required && booking.active_assignment.client_approval_status === "PENDING") {
          return { label: "Await Client Approval", style: "text-text-muted cursor-not-allowed bg-surface/30" };
        }
        return { label: "Await Creator Response", style: "text-text-muted cursor-not-allowed bg-surface/30" };
      }
      if (booking.active_assignment.status === "DECLINED") {
        if (booking.active_assignment.counter_offer_amount) {
          return { label: "Review Counter", style: "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30" };
        }
        return { label: "Assign Replacement", style: "bg-surface text-text-main border border-border-custom hover:bg-surface-elevated" };
      }
    }
    if (booking.status === "CONFIRMED") {
      return { label: "Monitor Deposit", style: "text-text-muted cursor-not-allowed bg-surface/30" };
    }
    if (booking.status === "IN_PROGRESS") {
      return { label: "Monitor Progress", style: "text-text-muted cursor-not-allowed bg-surface/30" };
    }
    if (booking.status === "DELIVERY_PENDING") {
      return { label: "Review Submission", style: "bg-teal-950/40 text-teal-300 border border-teal-900/30 hover:bg-teal-900/40" };
    }
    return { label: "View Details", style: "bg-surface text-text-sub border border-border-custom hover:bg-surface-elevated" };
  };

  const statusTabs = [
    { label: "All Bookings", value: "ALL" },
    { label: "New Requests", value: "REQUESTED" },
    { label: "Matching", value: "MATCHING_IN_PROGRESS" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Active Jobs", value: "IN_PROGRESS" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" }
  ];

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-main">Booking Inbox</h1>
        <p className="text-text-sub text-xs mt-1">Review Client booking requests, assign professionals, and manage booking progress.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-surface-elevated border border-border-custom p-4 rounded-3xl">
        <div className="flex flex-wrap gap-1.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-primary text-text-on-dark"
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
            placeholder="Search Booking ID / Client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-full px-5 py-2.5 pl-10 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted"
          />
          <span className="absolute left-4 top-3 text-text-muted text-xs">🔍</span>
        </div>
      </div>

      {/* Table / List View */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-elevated border border-border-custom rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-900/50 text-rose-200 rounded-3xl text-center text-xs font-semibold">
          {error}
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-surface-elevated border border-border-custom rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[10px] bg-surface/50">
                  <th className="py-4 px-5">Booking ID</th>
                  <th className="py-4 px-5">Client</th>
                  <th className="py-4 px-5">Selected Creator</th>
                  <th className="py-4 px-5">Assigned Creator</th>
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-5 text-right">Budget</th>
                  <th className="py-4 px-5">Booking Status</th>
                  <th className="py-4 px-5 text-right">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 font-medium">
                {bookings.map((booking) => {
                  const action = getNextAction(booking);
                  return (
                    <tr key={booking.id} className="hover:bg-surface/30 transition-all">
                      <td className="py-4 px-5 text-text-main font-bold">
                        <Link href={`/admin/bookings/${booking.id}`} className="hover:text-primary transition-colors">
                          {booking.booking_number}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-text-main">{booking.client?.full_name || "N/A"}</td>
                      <td className="py-4 px-5 text-text-sub">
                        {booking.selected_freelancer?.full_name || booking.selected_freelancer?.user?.full_name || (
                          <span className="italic text-text-muted">Not specified</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {booking.freelancer?.full_name || booking.freelancer?.user?.full_name ? (
                          <span className="text-text-main font-semibold">{booking.freelancer?.full_name || booking.freelancer?.user?.full_name}</span>
                        ) : booking.active_assignment?.freelancer_profile?.full_name || booking.active_assignment?.freelancer_profile?.user?.full_name ? (
                          <div>
                            <span className="text-text-main font-semibold">
                              {booking.active_assignment?.freelancer_profile?.full_name || booking.active_assignment?.freelancer_profile?.user?.full_name}
                            </span>
                            <span className="block text-amber-400 font-bold text-[9px] uppercase tracking-wider">
                              Offered (R#{booking.active_assignment.assignment_round})
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider">
                            Not assigned
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-text-sub">{formatDate(booking.scheduled_date)}</td>
                      <td className="py-4 px-5 text-right text-text-main font-bold">
                        {formatCurrency(booking.agreed_amount)}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-wide uppercase ${getStatusBadgeStyles(booking.status)}`}>
                          {getFriendlyStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
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
        <div className="py-16 text-center text-text-sub text-xs bg-surface-elevated border border-dashed border-border-custom rounded-3xl">
          No bookings are currently awaiting review.
        </div>
      )}
    </div>
  );
}
