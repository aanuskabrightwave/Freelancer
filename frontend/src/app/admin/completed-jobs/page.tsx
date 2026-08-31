"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface CompletedJobListItem {
  id: number;
  booking_number: string;
  booking_title: string | null;
  client_name: string;
  freelancer_name: string;
  source_type: string;
  agreed_amount: number;
  payment_status: string;
  review_rating: number | null;
  review_comment: string | null;
  payout_status: string;
  completed_at: string | null;
}

function CompletedJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  // State
  const [jobs, setJobs] = useState<CompletedJobListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<string>("ALL");

  useEffect(() => {
    if (filterParam === "unreviewed") {
      setFilterTab("AWAITING_REVIEW");
    } else if (filterParam === "unpaid-payout") {
      setFilterTab("AWAITING_PAYOUT");
    } else {
      setFilterTab("ALL");
    }
  }, [filterParam]);

  useEffect(() => {
    async function fetchCompletedJobs() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<CompletedJobListItem[]>("/admin/completed-jobs");
        setJobs(data);
      } catch (err: any) {
        setError(err.message || "We couldn't load completed jobs history. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchCompletedJobs();
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

  // Mapped friendly source labels
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

  const tabs = [
    { label: "All Completed", value: "ALL" },
    { label: "Awaiting Client Review", value: "AWAITING_REVIEW" },
    { label: "Reviewed", value: "REVIEWED" },
    { label: "Awaiting Payout", value: "AWAITING_PAYOUT" },
    { label: "Payout Completed", value: "PAYOUT_COMPLETED" }
  ];

  // Filtering Logic
  const filteredJobs = jobs.filter((j) => {
    if (filterTab === "AWAITING_REVIEW" && j.review_rating !== null) return false;
    if (filterTab === "REVIEWED" && j.review_rating === null) return false;
    
    // Normalize comparison for payout status
    const payoutLower = j.payout_status.toLowerCase();
    if (filterTab === "AWAITING_PAYOUT" && (payoutLower === "paid" || payoutLower === "completed")) return false;
    if (filterTab === "PAYOUT_COMPLETED" && payoutLower !== "paid" && payoutLower !== "completed") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = j.booking_number.toLowerCase().includes(q);
      const matchClient = j.client_name.toLowerCase().includes(q);
      const matchCreator = j.freelancer_name.toLowerCase().includes(q);
      const matchTitle = j.booking_title?.toLowerCase().includes(q) || false;
      return matchRef || matchClient || matchCreator || matchTitle;
    }

    return true;
  });

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-main font-semibold">Completed Jobs History</h1>
        <p className="text-text-sub text-xs mt-1">Review completed bookings, payment clearances, client reviews, and payout disbursements.</p>
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

      {/* Table grid */}
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
                  <th className="py-4 px-5">Final assigned Professional</th>
                  <th className="py-4 px-5">Source Flow</th>
                  <th className="py-4 px-5 text-right">Agreed Budget</th>
                  <th className="py-4 px-5">Payment Status</th>
                  <th className="py-4 px-5">Payout Status</th>
                  <th className="py-4 px-5">Client Review</th>
                  <th className="py-4 px-5">Completed At</th>
                  <th className="py-4 px-5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 font-medium">
                {filteredJobs.map((job) => {
                  return (
                    <tr key={job.id} className="hover:bg-surface/30 transition-all">
                      <td className="py-4 px-5 text-text-main font-bold">
                        <Link href={`/admin/bookings/${job.id}`} className="hover:text-primary transition-colors">
                          {job.booking_number}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-text-main font-semibold truncate max-w-[150px]">{job.booking_title || "Creative Request"}</td>
                      <td className="py-4 px-5 text-text-sub">{job.client_name}</td>
                      <td className="py-4 px-5 text-text-sub font-semibold">{job.freelancer_name || <span className="italic text-text-muted">Unassigned</span>}</td>
                      <td className="py-4 px-5">
                        <span className="text-[10px] text-text-muted capitalize">
                          {getFriendlySource(job.source_type)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right text-text-main font-bold">
                        {formatCurrency(job.agreed_amount)}
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] uppercase tracking-wider font-bold">
                          {job.payment_status}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                          job.payout_status.toLowerCase() === "paid" || job.payout_status.toLowerCase() === "completed"
                            ? "bg-emerald-950/40 border border-emerald-900/30 text-emerald-300"
                            : "bg-amber-950/40 border border-amber-900/30 text-amber-300"
                        }`}>
                          {job.payout_status}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {job.review_rating ? (
                          <div className="flex flex-col">
                            <span className="text-amber-400 font-bold text-[10px]">{job.review_rating} ★</span>
                            {job.review_comment && (
                              <span className="text-[9px] text-text-muted italic truncate max-w-[120px]">"{job.review_comment}"</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted italic">No Review</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-text-sub">{formatDate(job.completed_at)}</td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/admin/bookings/${job.id}`}
                          className="inline-block px-4 py-1.5 bg-surface text-text-main border border-border-custom hover:bg-surface-elevated rounded-full text-[10px] font-bold transition-all cursor-pointer"
                        >
                          View Details
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
          No completed jobs yet.
        </div>
      )}
    </div>
  );
}

export default function AdminCompletedJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading workspace parameters...</div>}>
      <CompletedJobsContent />
    </Suspense>
  );
}
