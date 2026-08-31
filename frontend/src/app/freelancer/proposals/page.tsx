"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Calendar, DollarSign, XCircle, Clock, AlertCircle } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

type TabType = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "ALL";

export default function FreelancerProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("PENDING");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadProposals() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await projectService.getMyProposals();
      setProposals(data);
    } catch (err) {
      console.error("Failed to load freelancer proposals", err);
      setErrorMsg("Failed to query your submitted proposals. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProposals();
  }, []);

  const handleWithdraw = async (proposalId: number) => {
    if (!confirm("Are you sure you want to withdraw this proposal? This cannot be undone.")) {
      return;
    }
    try {
      setActionLoading(proposalId);
      setErrorMsg(null);
      await projectService.withdrawProposal(proposalId);
      
      // Update local state status to WITHDRAWN
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: "WITHDRAWN" } : p))
      );
      alert("Proposal withdrawn successfully.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to withdraw proposal.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACCEPTED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
      case "REJECTED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600";
      case "WITHDRAWN":
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
      case "PENDING":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600";
      default:
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
    }
  };

  const pendingProps = proposals.filter((p) => p.status.toUpperCase() === "PENDING");
  const acceptedProps = proposals.filter((p) => p.status.toUpperCase() === "ACCEPTED");
  const rejectedProps = proposals.filter((p) => p.status.toUpperCase() === "REJECTED");
  const withdrawnProps = proposals.filter((p) => p.status.toUpperCase() === "WITHDRAWN");

  const displayedProps =
    activeTab === "PENDING" ? pendingProps :
    activeTab === "ACCEPTED" ? acceptedProps :
    activeTab === "REJECTED" ? rejectedProps :
    activeTab === "WITHDRAWN" ? withdrawnProps : proposals;

  if (loading) {
    return <LoadingState message="Fetching your proposals..." />;
  }

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <PageHeader
          title="My Submitted Bids"
          description="Track your active proposals, review accepted project links, and manage withdrawn bids."
        />

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex gap-2 border-b border-border-custom pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition shrink-0 ${
              activeTab === "PENDING"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            Pending Bids ({pendingProps.length})
          </button>
          <button
            onClick={() => setActiveTab("ACCEPTED")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition shrink-0 ${
              activeTab === "ACCEPTED"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            Accepted ({acceptedProps.length})
          </button>
          <button
            onClick={() => setActiveTab("REJECTED")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition shrink-0 ${
              activeTab === "REJECTED"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            Rejected ({rejectedProps.length})
          </button>
          <button
            onClick={() => setActiveTab("WITHDRAWN")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition shrink-0 ${
              activeTab === "WITHDRAWN"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            Withdrawn ({withdrawnProps.length})
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition shrink-0 ${
              activeTab === "ALL"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            All Bids ({proposals.length})
          </button>
        </div>

        {/* Proposals Grid */}
        {displayedProps.length === 0 ? (
          <EmptyState
            title={`No ${activeTab.toLowerCase()} bids found`}
            description="Explore available project briefs and submit bids to secure contracts."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedProps.map((prop) => (
              <div
                key={prop.id}
                className="bg-surface-elevated border border-border-custom rounded-2xl p-6 flex flex-col justify-between hover:shadow-xs transition duration-200"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Bid Submitted {new Date(prop.created_at).toLocaleDateString()}
                      </span>
                      <h3 className="font-extrabold text-base text-text-main mt-0.5 line-clamp-1">
                        {prop.project_title || "Project Brief"}
                      </h3>
                    </div>
                    <span className={`inline-block px-2.5 py-1 border rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(prop.status)}`}>
                      {prop.status}
                    </span>
                  </div>

                  {/* Cover Letter preview */}
                  <p className="text-xs text-text-sub line-clamp-3 leading-relaxed font-medium">
                    {prop.cover_letter}
                  </p>

                  {/* Financials and timeline details */}
                  <div className="grid grid-cols-2 gap-4 bg-surface p-3.5 border border-border-custom rounded-xl text-[11px] text-text-sub font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <span>{prop.delivery_days} days delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-text-muted" />
                      <span className="font-bold text-text-main">
                        ₹{parseFloat(prop.proposed_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-border-custom">
                  {prop.status.toUpperCase() === "PENDING" && (
                    <button
                      onClick={() => handleWithdraw(prop.id)}
                      disabled={actionLoading === prop.id}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-text-main text-[11px] font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-[0.99] cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {actionLoading === prop.id ? "Withdrawing..." : "Withdraw Bid"}
                    </button>
                  )}
                  {prop.status.toUpperCase() === "ACCEPTED" && (
                    <Link
                      href="/freelancer/bookings"
                      className="w-full py-2.5 text-center bg-emerald-600 hover:bg-emerald-500 text-[11px] font-extrabold uppercase tracking-wider rounded-xl text-text-main transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      Go to Bookings
                    </Link>
                  )}
                  {prop.status.toUpperCase() === "REJECTED" && (
                    <div className="w-full py-2.5 border border-border-custom rounded-xl flex items-center justify-center gap-1 text-[10px] text-text-muted font-bold uppercase">
                      <AlertCircle className="w-4 h-4" />
                      Rejected by Client
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
