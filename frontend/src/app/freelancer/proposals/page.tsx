"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Calendar, ArrowRight, DollarSign, MapPin, Eye, FileText, X } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

type TabType = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export default function FreelancerProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal state
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);

  useEffect(() => {
    async function loadProposals() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await projectService.getFreelancerProposals();
        setProposals(data);
      } catch (err) {
        console.error("Failed to load freelancer proposals list", err);
        setErrorMsg("Failed to load proposals. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadProposals();
  }, []);

  const getFriendlyStatus = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING": return "Pending Decision";
      case "ACCEPTED": return "Accepted";
      case "REJECTED": return "Not Selected";
      case "WITHDRAWN": return "Withdrawn";
      case "SHORTLISTED": return "Shortlisted";
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600";
      case "ACCEPTED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
      case "SHORTLISTED":
        return "bg-purple-500/10 border-purple-500/30 text-purple-600";
      case "REJECTED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600";
      default:
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (activeTab === "ALL") return true;
    return p.status.toUpperCase() === activeTab;
  });

  if (loading) {
    return <LoadingState message="Loading your proposals..." />;
  }

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <PageHeader
          title="My Proposals"
          description="Track budgets, cover letters, and review responses for proposals you have submitted to client projects."
        />

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 border-b border-border-custom pb-2">
          {(["ALL", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
                activeTab === tab
                  ? "bg-primary text-text-on-dark shadow-xs"
                  : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
              }`}
            >
              {tab === "ALL" ? "All Proposals" : tab.toLowerCase()} ({
                tab === "ALL" 
                  ? proposals.length 
                  : proposals.filter(p => p.status.toUpperCase() === tab).length
              })
            </button>
          ))}
        </div>

        {/* Proposals Grid */}
        {filteredProposals.length === 0 ? (
          <EmptyState
            title="No proposals found"
            description={
              activeTab === "ALL"
                ? "You haven't submitted any proposals yet. Browse client projects and send your first proposal."
                : `You don't have any ${activeTab.toLowerCase()} proposals at the moment.`
            }
            action={
              activeTab === "ALL" ? (
                <Link
                  href="/services"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs"
                >
                  Browse Projects
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProposals.map((proposal) => {
              const project = proposal.project || {};
              const booking = proposal.booking;
              const hasBooking = !!booking;
              
              return (
                <div
                  key={proposal.id}
                  className="bg-surface-elevated border border-border-custom rounded-2xl p-6 flex flex-col justify-between hover:shadow-xs transition duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                          Submitted on {new Date(proposal.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <h3 className="font-extrabold text-base text-text-main mt-0.5 line-clamp-1">
                          {project.title || "Untitled Project"}
                        </h3>
                      </div>
                      <span className={`inline-block px-2.5 py-1 border rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(proposal.status)}`}>
                        {getFriendlyStatus(proposal.status)}
                      </span>
                    </div>

                    {/* Cover Letter Snippet */}
                    <p className="text-xs text-text-sub line-clamp-2 leading-relaxed">
                      {proposal.cover_letter || "No cover letter provided."}
                    </p>

                    {/* Metadata boxes */}
                    <div className="grid grid-cols-2 gap-4 bg-surface p-3.5 border border-border-custom rounded-xl text-[11px] text-text-sub font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-text-muted" />
                        <span className="truncate">
                          {project.city || "Remote"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-text-muted" />
                        <span className="font-bold text-text-main">
                          ₹{parseFloat(proposal.proposed_amount || "0").toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Booking Reference banner */}
                    {hasBooking && (
                      <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[11px]">
                        <span className="text-emerald-700 font-semibold">Booking Reference</span>
                        <span className="font-bold text-emerald-800">{booking.booking_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer buttons */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-border-custom">
                    <button
                      onClick={() => setSelectedProposal(proposal)}
                      className="flex-1 py-2.5 bg-surface hover:bg-surface-elevated border border-border-custom text-[11px] font-extrabold uppercase tracking-wider rounded-xl text-text-sub hover:text-text-main transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Proposal
                    </button>
                    {hasBooking ? (
                      <Link
                        href={`/freelancer/bookings/${booking.id}`}
                        className="flex-1 py-2.5 text-center bg-primary hover:bg-primary-hover text-[11px] font-extrabold uppercase tracking-wider rounded-xl text-text-on-dark transition flex items-center justify-center gap-1"
                      >
                        View Booking
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <div className="flex-1 py-2.5 text-center border border-dashed border-border-custom text-[10px] font-bold uppercase tracking-wider rounded-xl text-text-muted flex items-center justify-center">
                        {proposal.status.toUpperCase() === "PENDING" ? "Decision Pending" : "No Booking Workflow"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface-elevated border border-border-custom w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-border-custom flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Proposal #{selectedProposal.id} Details
                </span>
                <h3 className="font-extrabold text-lg text-text-main leading-snug">
                  {selectedProposal.project?.title || "Project Proposal"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                className="p-1.5 hover:bg-surface rounded-full text-text-sub hover:text-text-main transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-text-sub leading-relaxed font-medium">
              {/* Proposal Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface border border-border-custom rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Status</span>
                  <span className="text-xs font-black text-text-main mt-1 block uppercase tracking-wider">
                    {getFriendlyStatus(selectedProposal.status)}
                  </span>
                </div>
                <div className="bg-surface border border-border-custom rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Bid Amount</span>
                  <span className="text-xs font-black text-text-main mt-1 block">
                    ₹{parseFloat(selectedProposal.proposed_amount || "0").toLocaleString()}
                  </span>
                </div>
                <div className="bg-surface border border-border-custom rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Submitted On</span>
                  <span className="text-xs font-black text-text-main mt-1 block">
                    {new Date(selectedProposal.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Cover Letter Section */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-text-main flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-text-muted" />
                  Your Cover Letter
                </h4>
                <div className="bg-surface p-4 border border-border-custom rounded-2xl whitespace-pre-line text-text-main font-normal">
                  {selectedProposal.cover_letter}
                </div>
              </div>

              {/* Project Brief Section */}
              {selectedProposal.project && (
                <div className="space-y-4 border-t border-border-custom pt-6">
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-text-main">
                      Project Specification
                    </h4>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      The job details originally posted by the client.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] text-text-sub font-medium bg-surface p-4 border border-border-custom rounded-2xl">
                    <div>
                      <span className="text-text-muted block text-[9px] uppercase tracking-wider">Project Type</span>
                      <span className="font-bold text-text-main mt-0.5 block">{selectedProposal.project.project_type || "Remote"}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[9px] uppercase tracking-wider">Location</span>
                      <span className="font-bold text-text-main mt-0.5 block">
                        {selectedProposal.project.city ? `${selectedProposal.project.city}, ${selectedProposal.project.state || ""}` : "Remote"}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border-custom/50 mt-2">
                      <span className="text-text-muted block text-[9px] uppercase tracking-wider">Description</span>
                      <p className="text-text-main font-normal leading-relaxed mt-1 whitespace-pre-line">
                        {selectedProposal.project.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-elevated border-t border-border-custom flex gap-3 justify-end">
              <button
                onClick={() => setSelectedProposal(null)}
                className="px-5 py-2.5 bg-surface border border-border-custom hover:bg-surface-elevated text-xs font-bold uppercase tracking-wider rounded-xl text-text-sub hover:text-text-main transition cursor-pointer"
              >
                Close
              </button>
              {selectedProposal.booking && (
                <Link
                  href={`/freelancer/bookings/${selectedProposal.booking.id}`}
                  onClick={() => setSelectedProposal(null)}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-xs font-bold uppercase tracking-wider rounded-xl text-text-on-dark transition flex items-center gap-1"
                >
                  Go to Booking Workflow
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
