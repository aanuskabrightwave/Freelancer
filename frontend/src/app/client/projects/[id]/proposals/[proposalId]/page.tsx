"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, DollarSign, Clock, Check, X, User } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import LoadingState from "@/components/common/LoadingState";

export default function ClientReviewProposalPage() {
  const { id: projectId, proposalId } = useParams();
  const router = useRouter();

  const [proposal, setProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Scheduling Form for Acceptance
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  async function loadProposalDetails() {
    if (!proposalId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await projectService.getClientProposalDetails(proposalId as string);
      setProposal(data);
    } catch (err: any) {
      console.error("Failed to load proposal details", err);
      setErrorMsg(err.response?.data?.detail || "Failed to load proposal details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProposalDetails();
  }, [proposalId]);

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || processing) return;

    if (!scheduledDate || !startTime || !endTime) {
      setErrorMsg("Please provide scheduled date, start time, and end time for the booking contract.");
      return;
    }

    try {
      setProcessing(true);
      setErrorMsg(null);

      // Call the existing client_bookings.py endpoint via projectService helper
      await projectService.acceptProposal(proposal.id, {
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        venue_name: venueName || undefined,
        venue_address: venueAddress || undefined,
        city: city || undefined,
        state: state || undefined,
      });
      
      setSuccessMsg("Proposal accepted successfully. Project awarded and Booking Generated!");
      setProposal((prev: any) => ({ ...prev, status: "ACCEPTED" }));
      setShowAcceptForm(false);
      
      setTimeout(() => {
        router.push("/client/bookings");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to accept proposal.");
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    if (!confirm("Are you sure you want to REJECT this proposal bid?")) {
      return;
    }

    try {
      setProcessing(true);
      setErrorMsg(null);
      await projectService.rejectClientProposal(proposal.id);
      
      setSuccessMsg("Proposal bid rejected.");
      setProposal((prev: any) => ({ ...prev, status: "REJECTED" }));

      setTimeout(() => {
        router.push(`/client/projects/${projectId}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to reject proposal.");
      setProcessing(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
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

  if (loading) {
    return <LoadingState message="Fetching proposal details..." />;
  }

  if (errorMsg && !proposal) {
    return (
      <Container className="py-8">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
        <div className="mt-4">
          <Link href={`/client/projects/${projectId}`} className="text-xs font-bold uppercase tracking-wider text-primary">
            &larr; Back to Project listing
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Back Link */}
        <Link href={`/client/projects/${projectId}`} className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-sub hover:text-text-main transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Project listing
        </Link>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Bid Submission Details
              </span>
              <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(proposal.status)}`}>
                {proposal.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-text-main leading-tight">
              Bid on: {proposal.project_title || "Project Brief"}
            </h1>
          </div>

          {proposal.status === "PENDING" && !showAcceptForm && (
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 sm:flex-initial px-5 py-3 bg-surface border border-rose-300 hover:bg-rose-55 text-rose-650 text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer"
              >
                <X className="w-4 h-4" />
                Reject Bid
              </button>
              <button
                onClick={() => setShowAcceptForm(true)}
                disabled={processing}
                className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-text-main text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Award Project
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs font-semibold">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Cover letter Pitch or Acceptance Form */}
          <div className="lg:col-span-8 space-y-6">
            {showAcceptForm ? (
              <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider">
                    Define Project Booking Details
                  </h3>
                  <button
                    onClick={() => setShowAcceptForm(false)}
                    className="text-text-muted hover:text-text-main text-xs font-bold uppercase"
                  >
                    Cancel
                  </button>
                </div>
                
                <form onSubmit={handleAcceptSubmit} className="space-y-4 font-sans text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Scheduled Date *</label>
                      <input
                        type="date"
                        required
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Start Time *</label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">End Time *</label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Venue Name (Optional)</label>
                      <input
                        type="text"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        placeholder="e.g. Cinema Studio A"
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Venue Address (Optional)</label>
                      <input
                        type="text"
                        value={venueAddress}
                        onChange={(e) => setVenueAddress(e.target.value)}
                        placeholder="Street details..."
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">City (Optional)</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">State (Optional)</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-text-main text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {processing ? "Awarding Contract..." : "Confirm & Award Contract"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
                <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider">Freelancer Proposal Pitch</h3>
                <p className="text-xs text-text-main font-normal leading-relaxed whitespace-pre-line">
                  {proposal.cover_letter}
                </p>
              </div>
            )}
          </div>

          {/* Details Sidebar & Public Profile Link */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6 font-medium text-xs text-text-sub">
              <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider text-[11px]">Bidding Coordinates</h3>

              <div className="space-y-4">
                {/* Creator */}
                <div className="flex justify-between items-center py-2 border-b border-border-custom/50">
                  <span className="text-text-muted">Creator</span>
                  <span className="font-extrabold text-text-main">
                    {proposal.freelancer_name || `Freelancer #${proposal.freelancer_profile_id}`}
                  </span>
                </div>

                {/* Proposed Amount */}
                <div className="flex justify-between items-start py-2 border-b border-border-custom/50">
                  <span className="text-text-muted">Bid Price</span>
                  <div className="text-right">
                    <span className="font-extrabold text-text-main block">
                      ₹{parseFloat(proposal.proposed_amount).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-text-muted font-bold block uppercase mt-0.5">Agreed Price</span>
                  </div>
                </div>

                {/* Delivery Time */}
                <div className="flex justify-between items-center py-2 border-b border-border-custom/50">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-text-muted" />
                    Delivery Time
                  </span>
                  <span className="font-extrabold text-text-main">
                    {proposal.delivery_days} days
                  </span>
                </div>
              </div>

              {/* View Public Profile */}
              <div className="pt-4 border-t border-border-custom">
                <Link
                  href={`/freelancers/${proposal.freelancer_profile_id}`}
                  className="w-full py-3 bg-surface border border-border-custom hover:bg-surface-elevated text-text-sub hover:text-text-main text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  <User className="w-4 h-4 text-text-muted" />
                  View Public Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
