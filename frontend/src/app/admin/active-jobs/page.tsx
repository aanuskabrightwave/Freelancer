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

interface PaymentSummaryOut {
  payment_completion_state: string;
  deposit_amount: string;
  deposit_paid_amount: string;
  remaining_balance: string;
  total_paid: string;
}

interface BookingListItem {
  id: number;
  booking_number: string;
  title: string | null;
  status: string;
  scheduled_date: string | null;
  agreed_amount: string;
  source_type: string;
  created_at: string;
  client: UserMiniOut | null;
  freelancer: FreelancerMiniOut | null;
  payment_summary: PaymentSummaryOut | null;
}

function ActiveJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");

  // State
  const [jobs, setJobs] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<string>("ALL");

  useEffect(() => {
    if (statusParam === "admin-review") {
      setFilterTab("ADMIN_REVIEW");
    } else {
      setFilterTab("ALL");
    }
  }, [statusParam]);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<BookingListItem[]>("/admin/bookings");
        // Keep CONFIRMED, IN_PROGRESS, and DELIVERY_PENDING bookings as active jobs
        const activeList = data.filter((b) =>
          ["CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING"].includes(b.status)
        );
        setJobs(activeList);
      } catch (err: any) {
        setError(err.message || "We couldn't load active jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
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

  // Mapped friendly Source names (Part 17)
  const getFriendlySource = (source: string) => {
    switch (source) {
      case "PROJECT":
        return "Project Match";
      case "SERVICE":
        return "Service Booking";
      case "PROFILE":
        return "Profile Booking";
      default:
        return source.replace(/_/g, " ").toLowerCase();
    }
  };

  // Normalize Work Status states (Part 19)
  const getWorkStateLabel = (job: BookingListItem) => {
    const paidDeposit = job.payment_summary
      ? parseFloat(job.payment_summary.deposit_paid_amount) > 0
      : false;

    if (!paidDeposit) {
      return { label: "Waiting for Deposit", style: "bg-amber-950/40 text-amber-300 border-amber-900/30" };
    }
    if (job.status === "CONFIRMED") {
      return { label: "Ready to Start", style: "bg-blue-955/35 border-blue-900/40 text-blue-300" };
    }
    if (job.status === "IN_PROGRESS") {
      return { label: "In Progress", style: "bg-primary/10 text-primary border-primary/20" };
    }
    if (job.status === "DELIVERY_PENDING") {
      return { label: "Waiting for Freelancer Submission", style: "bg-purple-955 border-purple-900 text-purple-300" };
    }
    return { label: job.status.replace(/_/g, " "), style: "bg-surface border-border-custom text-text-sub" };
  };

  const tabs = [
    { label: "All Active", value: "ALL" },
    { label: "Awaiting Deposit", value: "AWAITING_DEPOSIT" },
    { label: "Ready to Start", value: "READY_TO_START" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Admin Review / Deliveries", value: "ADMIN_REVIEW" }
  ];

  // Filters logic
  const filteredJobs = jobs.filter((j) => {
    const paidDeposit = j.payment_summary
      ? parseFloat(j.payment_summary.deposit_paid_amount) > 0
      : false;

    if (filterTab === "AWAITING_DEPOSIT" && paidDeposit) return false;
    if (filterTab === "READY_TO_START" && (!paidDeposit || j.status !== "CONFIRMED")) return false;
    if (filterTab === "IN_PROGRESS" && (!paidDeposit || j.status !== "IN_PROGRESS")) return false;
    if (filterTab === "ADMIN_REVIEW" && (!paidDeposit || j.status !== "DELIVERY_PENDING")) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = j.booking_number.toLowerCase().includes(q);
      const matchClient = j.client?.full_name.toLowerCase().includes(q) || false;
      const matchCreator = j.freelancer?.full_name.toLowerCase().includes(q) || false;
      const matchTitle = j.title?.toLowerCase().includes(q) || false;
      return matchRef || matchClient || matchCreator || matchTitle;
    }

    return true;
  });

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-main font-semibold">Active Jobs</h1>
        <p className="text-text-sub text-xs mt-1">Monitor confirmed bookings from payment verification through work and final delivery.</p>
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
            placeholder="Search Reference / Client / Title..."
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
      ) : filteredJobs.length > 0 ? (
        <div className="bg-surface-elevated border border-border-custom rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[10px] bg-surface/50">
                  <th className="py-4 px-5">Booking Ref</th>
                  <th className="py-4 px-5">Booking Title</th>
                  <th className="py-4 px-5">Client</th>
                  <th className="py-4 px-5">Assigned Creator</th>
                  <th className="py-4 px-5">Source Flow</th>
                  <th className="py-4 px-5">Event Schedule</th>
                  <th className="py-4 px-5 text-right">Agreed Budget</th>
                  <th className="py-4 px-5 text-center">Deposit Payment</th>
                  <th className="py-4 px-5">Work Progress</th>
                  <th className="py-4 px-5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 font-medium">
                {filteredJobs.map((job) => {
                  const workState = getWorkStateLabel(job);
                  const paidDeposit = job.payment_summary
                    ? parseFloat(job.payment_summary.deposit_paid_amount) > 0
                    : false;

                  return (
                    <tr key={job.id} className="hover:bg-surface/30 transition-all">
                      <td className="py-4 px-5 text-text-main font-bold">
                        <Link href={`/admin/bookings/${job.id}`} className="hover:text-primary transition-colors">
                          {job.booking_number}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-text-main font-semibold truncate max-w-[160px]">{job.title || "Support Booking"}</td>
                      <td className="py-4 px-5 text-text-sub">{job.client?.full_name}</td>
                      <td className="py-4 px-5 text-text-sub font-semibold">
                        {job.freelancer?.full_name || <span className="italic text-text-muted">Unassigned</span>}
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-[10px] text-text-muted capitalize">
                          {getFriendlySource(job.source_type)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-text-sub">{formatDate(job.scheduled_date)}</td>
                      <td className="py-4 px-5 text-right text-text-main font-bold">
                        {formatCurrency(job.agreed_amount)}
                      </td>
                      <td className="py-4 px-5 text-center font-bold">
                        {paidDeposit ? (
                          <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">Paid</span>
                        ) : (
                          <span className="text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">Unpaid</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-wide uppercase ${workState.style}`}>
                          {workState.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/admin/bookings/${job.id}`}
                          className="inline-block px-4 py-1.5 bg-surface text-text-main border border-border-custom hover:bg-surface-elevated rounded-full text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Open Booking
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
          No confirmed jobs are currently in progress.
        </div>
      )}
    </div>
  );
}

export default function AdminActiveJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading workspace parameters...</div>}>
      <ActiveJobsContent />
    </Suspense>
  );
}
