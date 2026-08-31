"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface DeliveryListItem {
  id: number;
  booking_id: number;
  booking_number: string;
  booking_title: string | null;
  client_name: string;
  freelancer_name: string;
  delivery_type: string;
  version: number;
  title: string;
  status: string;
  admin_review_status: string;
  submitted_at: string;
  shared_with_client_at: string | null;
  approved_at: string | null;
  revision_count: number;
  agreed_amount: number;
  deposit_paid_amount: number;
  remaining_balance: number;
  payment_completion_state: string;
}

function DeliveriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");

  // State
  const [deliveries, setDeliveries] = useState<DeliveryListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<string>("ALL");

  useEffect(() => {
    if (statusParam === "review") {
      setFilterTab("SUBMITTED_ADMIN");
    } else if (statusParam === "revision") {
      setFilterTab("REVISION_REQUIRED");
    } else if (statusParam === "balance") {
      setFilterTab("AWAITING_BALANCE");
    } else if (statusParam === "ready") {
      setFilterTab("READY_DELIVERY");
    } else {
      setFilterTab("ALL");
    }
  }, [statusParam]);

  useEffect(() => {
    async function fetchDeliveries() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<DeliveryListItem[]>("/admin/deliveries");
        setDeliveries(data);
      } catch (err: any) {
        setError(err.message || "We couldn't load deliveries. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchDeliveries();
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

  // Maps Delivery state combinations to friendly display labels (Part 6, 7)
  const getDeliveryStateLabel = (d: DeliveryListItem) => {
    const isApproved = d.admin_review_status === "APPROVED";
    const isPaid = d.remaining_balance === 0 || d.payment_completion_state === "PAID";

    if (d.admin_review_status === "PENDING") {
      return { label: "Submitted to Admin", style: "bg-amber-950/40 text-amber-300 border-amber-900/30", attention: true };
    }
    if (d.admin_review_status === "UNDER_REVIEW") {
      return { label: "Under Admin Review", style: "bg-blue-955/45 border-blue-900/40 text-blue-300", attention: true };
    }
    if (d.admin_review_status === "REVISION_REQUIRED") {
      return { label: "Revision Required", style: "bg-rose-955/45 border-rose-900/30 text-rose-300", attention: false };
    }
    if (isApproved) {
      if (!isPaid) {
        return { label: "Awaiting Client Balance", style: "bg-purple-955 border-purple-900 text-purple-300", attention: false };
      }
      if (d.shared_with_client_at === null) {
        return { label: "Ready for Final Delivery", style: "bg-emerald-955/45 border-emerald-900/30 text-emerald-300", attention: true };
      }
      return { label: "Delivered to Client", style: "bg-emerald-950/40 text-emerald-400 border-emerald-900/30", attention: false };
    }
    return { label: d.status, style: "bg-surface border-border-custom text-text-sub", attention: false };
  };

  const tabs = [
    { label: "All Deliveries", value: "ALL" },
    { label: "Submitted to Admin", value: "SUBMITTED_ADMIN" },
    { label: "Under Review", value: "ADMIN_REVIEW" },
    { label: "Revision Required", value: "REVISION_REQUIRED" },
    { label: "Awaiting Balance", value: "AWAITING_BALANCE" },
    { label: "Ready for Delivery", value: "READY_DELIVERY" },
    { label: "Delivered", value: "DELIVERED" }
  ];

  // Filtering Logic
  const filteredDeliveries = deliveries.filter((d) => {
    const state = getDeliveryStateLabel(d);
    const isPaid = d.remaining_balance === 0 || d.payment_completion_state === "PAID";

    if (filterTab === "SUBMITTED_ADMIN" && d.admin_review_status !== "PENDING") return false;
    if (filterTab === "ADMIN_REVIEW" && d.admin_review_status !== "UNDER_REVIEW") return false;
    if (filterTab === "REVISION_REQUIRED" && d.admin_review_status !== "REVISION_REQUIRED") return false;
    if (filterTab === "AWAITING_BALANCE" && (d.admin_review_status !== "APPROVED" || isPaid)) return false;
    if (filterTab === "READY_DELIVERY" && (d.admin_review_status !== "APPROVED" || !isPaid || d.shared_with_client_at !== null)) return false;
    if (filterTab === "DELIVERED" && d.shared_with_client_at === null) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = d.booking_number.toLowerCase().includes(q);
      const matchClient = d.client_name.toLowerCase().includes(q);
      const matchCreator = d.freelancer_name.toLowerCase().includes(q);
      const matchTitle = d.title.toLowerCase().includes(q);
      return matchRef || matchClient || matchCreator || matchTitle;
    }

    return true;
  });

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-main font-semibold">Deliveries Review Queue</h1>
        <p className="text-text-sub text-xs mt-1">Monitor freelancer submissions, Admin reviews, revisions and final delivery progress.</p>
      </div>

      {/* Search and Tabs Filters */}
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
      ) : filteredDeliveries.length > 0 ? (
        <div className="bg-surface-elevated border border-border-custom rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[10px] bg-surface/50">
                  <th className="py-4 px-5">Booking Ref</th>
                  <th className="py-4 px-5">Submission Title</th>
                  <th className="py-4 px-5">Client</th>
                  <th className="py-4 px-5">Freelancer</th>
                  <th className="py-4 px-5">Type</th>
                  <th className="py-4 px-5 text-center">Version</th>
                  <th className="py-4 px-5">Revisions</th>
                  <th className="py-4 px-5 text-right">Balance Due</th>
                  <th className="py-4 px-5">Review Status</th>
                  <th className="py-4 px-5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 font-medium">
                {filteredDeliveries.map((d) => {
                  const state = getDeliveryStateLabel(d);
                  const isPaid = d.remaining_balance === 0 || d.payment_completion_state === "PAID";
                  
                  return (
                    <tr key={d.id} className="hover:bg-surface/30 transition-all">
                      <td className="py-4 px-5 text-text-main font-bold">
                        <Link href={`/admin/bookings/${d.booking_id}`} className="hover:text-primary transition-colors">
                          {d.booking_number}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-text-main font-semibold truncate max-w-[155px]">{d.title}</td>
                      <td className="py-4 px-5 text-text-sub">{d.client_name}</td>
                      <td className="py-4 px-5 text-text-sub">{d.freelancer_name}</td>
                      <td className="py-4 px-5 text-text-sub uppercase">{d.delivery_type.toLowerCase()}</td>
                      <td className="py-4 px-5 text-center text-text-main font-bold">v{d.version}</td>
                      <td className="py-4 px-5 text-text-sub font-bold text-center">
                        {d.revision_count > 0 ? (
                          <span className="text-amber-500">{d.revision_count} requests</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right text-text-main font-bold">
                        {isPaid ? (
                          <span className="text-emerald-500">Paid</span>
                        ) : (
                          <span className="text-rose-400">{formatCurrency(d.remaining_balance)}</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-wide uppercase ${state.style}`}>
                            {state.label}
                          </span>
                          {state.attention && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" title="Needs Attention"></span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/admin/bookings/${d.booking_id}`}
                          className="inline-block px-4 py-1.5 bg-surface text-text-main border border-border-custom hover:bg-surface-elevated rounded-full text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Review Submission
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
          No submissions match this view.
        </div>
      )}
    </div>
  );
}

export default function AdminDeliveriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading workspace parameters...</div>}>
      <DeliveriesContent />
    </Suspense>
  );
}
