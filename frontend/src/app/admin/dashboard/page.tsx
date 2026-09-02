"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface SummaryData {
  users: { total: number; clients: number; freelancers: number };
  marketplace: { services: number; projects: number; bookings: number; completed_bookings: number };
  financial: { gross_volume: string; platform_revenue: string; pending_payouts: string };
  operations: { pending_verifications: number; open_disputes: number; reported_reviews: number };
  managed_ops: {
    new_bookings: number;
    job_posts_to_review: number;
    pending_freelancer_responses: number;
    counter_offers: number;
    replacements_awaiting_approval: number;
    submissions_to_review: number;
    payments_pending: number;
    deliveries_ready: number;
    payouts_ready: number;
  };
  attention_items: Array<{
    id: string;
    type: string;
    title: string;
    action_label: string;
    action_url: string;
    created_at: string | null;
  }>;
  recent_bookings: Array<{
    id: number;
    booking_number: string;
    client_name: string;
    freelancer_name: string | null;
    selected_freelancer_name: string | null;
    booking_date: string | null;
    venue: string;
    budget: string;
    status: string;
    created_at: string | null;
  }>;
  recent_projects: Array<{
    id: number;
    title: string;
    client_name: string;
    budget: string;
    status: string;
    created_at: string | null;
  }>;
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const sumRes = await api.get<SummaryData>("/admin/dashboard");
        setSummary(sumRes);
      } catch (err: any) {
        setError(err.message || "We couldn't load the admin dashboard summary data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-transparent min-h-screen text-text-main animate-pulse">
        {/* Page Header skeleton */}
        <div className="h-10 bg-surface-elevated/80 rounded-xl w-1/4"></div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-elevated border border-border-custom rounded-3xl p-6 space-y-3">
              <div className="h-3 bg-surface rounded-full w-1/2"></div>
              <div className="h-6 bg-surface rounded-full w-3/4"></div>
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="h-64 bg-surface-elevated border border-border-custom rounded-3xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-transparent min-h-screen text-text-main flex flex-col justify-center items-center gap-4">
        <div className="bg-rose-950/30 border border-rose-900/50 text-rose-200 p-6 rounded-3xl max-w-md text-center">
          <p className="text-sm font-semibold">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-primary text-text-on-dark rounded-full text-xs font-semibold hover:bg-primary-hover transition-all"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const kpis = [
    {
      title: "New Booking Requests",
      count: summary?.managed_ops.new_bookings || 0,
      badge: "Needs Attention",
      badgeColor: "bg-amber-955/50 text-amber-300 border-amber-800/40",
      description: "Booking requests waiting for review",
      icon: "🔔"
    },
    {
      title: "Job Posts to Review",
      count: summary?.managed_ops.job_posts_to_review || 0,
      badge: "Matching",
      badgeColor: "bg-primary/10 text-primary border-primary/20",
      description: "Open briefs awaiting matching",
      icon: "📝"
    },
    {
      title: "Pending Creator Offers",
      count: summary?.managed_ops.pending_freelancer_responses || 0,
      badge: "Offered",
      badgeColor: "bg-blue-955/50 text-blue-300 border-blue-900/40",
      description: "Assignments awaiting response",
      icon: "✉️"
    },
    {
      title: "Counter Offers Received",
      count: summary?.managed_ops.counter_offers || 0,
      badge: "Renegotiation",
      badgeColor: "bg-purple-955/50 text-purple-300 border-purple-900/40",
      description: "Counter offers awaiting review",
      icon: "⚖️"
    },
    {
      title: "Replacements Approvals",
      count: summary?.managed_ops.replacements_awaiting_approval || 0,
      badge: "Awaiting Client",
      badgeColor: "bg-indigo-955/50 text-indigo-300 border-indigo-900/40",
      description: "Replacements waiting client ok",
      icon: "🔄"
    },
    {
      title: "Submissions to Review",
      count: summary?.managed_ops.submissions_to_review || 0,
      badge: "Quality Gate",
      badgeColor: "bg-teal-955/50 text-teal-300 border-teal-900/40",
      description: "Deliveries waiting admin check",
      icon: "🔍"
    },
    {
      title: "Client Payments Due",
      count: summary?.managed_ops.payments_pending || 0,
      badge: "Payments",
      badgeColor: "bg-orange-955/50 text-orange-300 border-orange-900/40",
      description: "Bookings with pending stages",
      icon: "💳"
    },
    {
      title: "Payouts Ready",
      count: summary?.managed_ops.payouts_ready || 0,
      badge: "Finance",
      badgeColor: "bg-emerald-955/50 text-emerald-300 border-emerald-900/40",
      description: "Payout releases ready in ledger",
      icon: "💰"
    }
  ];

  return (
    <div className="p-8 space-y-8 bg-transparent min-h-screen text-text-main font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-custom pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">Marketplace Overview</h1>
          <p className="text-text-sub text-xs mt-1">Real-time operational dashboard for matching, assignments, and payments.</p>
        </div>
      </div>

      {/* Grid: 8 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-border-custom/80 transition-all hover:scale-[1.01]"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">{kpi.title}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border tracking-wide uppercase ${kpi.badgeColor}`}>
                {kpi.badge}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-text-main">{kpi.count}</h2>
                <p className="text-[10px] text-text-muted mt-1 font-medium">{kpi.description}</p>
              </div>
              <div className="text-2xl opacity-80">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Operational: Needs Attention Queue */}
      <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div>
            <h3 className="text-lg font-bold text-text-main">Needs Attention</h3>
            <p className="text-xs text-text-sub mt-0.5">Critical operations queue requiring administrative action.</p>
          </div>
          <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full font-bold tracking-wide uppercase">
            {summary?.attention_items.length || 0} Action Items
          </span>
        </div>

        {summary && summary.attention_items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-1/5">Item Type</th>
                  <th className="py-3 px-4">Requirement / Alert</th>
                  <th className="py-3 px-4 w-1/5">Received Date</th>
                  <th className="py-3 px-4 w-1/6 text-right">Operational Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 font-medium">
                {summary.attention_items.map((item) => {
                  let badgeClass = "bg-surface text-text-sub";
                  let label = item.type;
                  if (item.type === "booking_review") {
                    badgeClass = "bg-amber-950/40 text-amber-300 border-amber-900/30";
                    label = "Booking Review";
                  } else if (item.type === "project_review") {
                    badgeClass = "bg-primary/10 text-primary border-primary/20";
                    label = "Project Review";
                  } else if (item.type === "counter_offer") {
                    badgeClass = "bg-purple-950/40 text-purple-300 border-purple-900/30";
                    label = "Counter Offer";
                  } else if (item.type === "replacement_approval") {
                    badgeClass = "bg-indigo-950/40 text-indigo-300 border-indigo-900/30";
                    label = "Replacement";
                  } else if (item.type === "submission_review") {
                    badgeClass = "bg-teal-950/40 text-teal-300 border-teal-900/30";
                    label = "Submission Review";
                  } else if (item.type === "payout_release") {
                    badgeClass = "bg-emerald-950/40 text-emerald-300 border-emerald-900/30";
                    label = "Payout Ready";
                  }

                  return (
                    <tr key={item.id} className="hover:bg-surface/30 transition-all">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold tracking-wide uppercase ${badgeClass}`}>
                          {label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-main">{item.title}</td>
                      <td className="py-3 px-4 text-text-sub">{formatDate(item.created_at)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={item.action_url}
                          className="inline-block px-4 py-1.5 bg-surface hover:bg-primary hover:text-text-on-dark text-text-main border border-border-custom hover:border-primary text-[10px] font-bold rounded-full transition-all cursor-pointer"
                        >
                          {item.action_label}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-text-sub text-xs bg-surface/20 border border-dashed border-border-custom rounded-3xl">
            No items need your attention right now.
          </div>
        )}
      </div>

      {/* Grid: Recent Bookings & Job Posts Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Booking Requests */}
        <div className="lg:col-span-2 bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border-custom/50">
            <div>
              <h3 className="text-lg font-bold text-text-main">Recent Booking Requests</h3>
              <p className="text-xs text-text-sub mt-0.5">Most recent client booking submissions.</p>
            </div>
            <Link
              href="/admin/bookings"
              className="text-primary hover:text-primary-hover font-bold text-[10px] uppercase tracking-wider"
            >
              Open Inbox →
            </Link>
          </div>

          {summary && summary.recent_bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Selected Professional</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Budget</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50 font-medium">
                  {summary.recent_bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-surface/30">
                      <td className="py-3 px-3 text-text-main font-bold">{booking.booking_number}</td>
                      <td className="py-3 px-3 text-text-sub">{booking.client_name}</td>
                      <td className="py-3 px-3 text-text-sub">
                        {booking.selected_freelancer_name || <span className="italic text-text-muted">Not specified</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold text-primary">{booking.status}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-text-main">{formatCurrency(booking.budget)}</td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="text-text-main hover:text-primary font-bold text-[10px] uppercase"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-text-sub text-xs bg-surface/20 border border-dashed border-border-custom rounded-3xl">
              No booking requests found.
            </div>
          )}
        </div>

        {/* Job Posts Preview */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
          <div className="pb-2 border-b border-border-custom/50">
            <h3 className="text-lg font-bold text-text-main">Recent Job Posts</h3>
            <p className="text-xs text-text-sub mt-0.5">Projects submitted by clients.</p>
          </div>

          {summary && summary.recent_projects.length > 0 ? (
            <div className="space-y-3">
              {summary.recent_projects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-surface border border-border-custom/80 p-4 rounded-2xl flex flex-col justify-between gap-2"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-text-main truncate w-3/4">{proj.title}</h4>
                    <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {proj.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-text-sub">
                    <span>By {proj.client_name}</span>
                    <span className="font-semibold text-text-main">{formatCurrency(proj.budget)}</span>
                  </div>
                  <div className="pt-2 border-t border-border-custom/30 flex justify-between items-center text-[9px] text-text-muted">
                    <span>{formatDate(proj.created_at)}</span>
                    <Link href="/admin/bookings" className="text-primary hover:underline font-semibold uppercase">
                      Open Inbox
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-text-sub text-xs bg-surface/20 border border-dashed border-border-custom rounded-3xl">
              No job postings found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
