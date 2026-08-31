"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  XCircle,
  ArrowRight,
  MessageSquare,
  Sparkles,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Shield,
  Briefcase
} from "lucide-react";
import { projectService } from "@/services/project.service";
import LoadingState from "@/components/common/LoadingState";
import { getMediaUrl } from "@/lib/api";

export default function ClientProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [project, setProject] = useState<any | null>(null);
  const [proposals, setProposals] = useState<any[]>([]); // For legacy projects (Part 6)
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Decision Modal States (Part 19, 20)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  async function loadProjectDetails() {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const data = await projectService.getClientProjectDetails(id as string);
      setProject(data);

      // Only query received proposals if legacy self-managed project
      if (!data.is_admin_managed) {
        const props = await projectService.getReceivedProposals(id as string);
        setProposals(props);
      }
    } catch (err: any) {
      console.error("Failed to load client project details", err);
      setErrorMsg(err.response?.data?.detail || "Failed to load project details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjectDetails();
  }, [id]);

  const handleCloseProject = async () => {
    if (!project) return;
    if (!confirm("Are you sure you want to cancel/close this project brief?")) {
      return;
    }

    try {
      setClosing(true);
      setErrorMsg(null);
      const updated = await projectService.closeClientProject(project.id);
      setProject(updated);
      alert("Project brief cancelled successfully.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to close project.");
    } finally {
      setClosing(false);
    }
  };

  // Matched Professional Approval (Part 18)
  const handleApproveProfessional = async () => {
    if (!project?.latest_assignment_id) return;
    try {
      setActionLoading(true);
      await projectService.respondToAssignment(project.latest_assignment_id, true);
      setShowApproveConfirm(false);
      await loadProjectDetails();
      alert("Professional approved successfully! Directing assignment completion.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to approve proposed professional.");
    } finally {
      setActionLoading(false);
    }
  };

  // Matched Professional Decline (Part 18, 20)
  const handleDeclineProfessional = async () => {
    if (!project?.latest_assignment_id) return;
    try {
      setActionLoading(true);
      await projectService.respondToAssignment(
        project.latest_assignment_id,
        false,
        declineReason.trim() || undefined
      );
      setShowDeclineConfirm(false);
      setDeclineReason("");
      await loadProjectDetails();
      alert("Decline submitted. Our team will continue matching another professional.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to decline proposed professional.");
    } finally {
      setActionLoading(false);
    }
  };

  // Friendly status strings (Part 4)
  const getFriendlyStatus = (p: any) => {
    if (p.booking_id) return "Booking Created";
    if (p.client_approval_required && p.client_approval_status === "PENDING") {
      return "Your Approval Required";
    }
    if (p.client_approval_status === "APPROVED") {
      return "Professional Confirmation in Progress";
    }
    
    const s = p.status.toUpperCase();
    if (s === "SUBMITTED") return "Submitted to Admin";
    if (s === "UNDER_ADMIN_REVIEW") return "Under Admin Review";
    if (s === "MATCHING" || s === "MATCHING_IN_PROGRESS") return "Matching a Professional";
    if (s === "COMPLETED") return "Completed";
    if (s === "CANCELLED" || s === "CLOSED") return "Cancelled";
    
    return p.status.replace(/_/g, " ");
  };

  const getStatusBadgeStyle = (statusLabel: string) => {
    switch (statusLabel) {
      case "Your Approval Required":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse";
      case "Submitted to Admin":
      case "Under Admin Review":
      case "Matching a Professional":
      case "Professional Confirmation in Progress":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "Booking Created":
      case "Completed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Cancelled":
        return "bg-rose-950/40 border-rose-900/30 text-rose-300";
      default:
        return "bg-surface-elevated border-border-custom text-text-sub";
    }
  };

  if (loading) {
    return <LoadingState message="Loading project brief..." />;
  }

  if (errorMsg && !project) {
    return (
      <div className="min-h-screen bg-background text-text-sub py-10 px-4 md:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
          <Link href="/client/projects" className="text-xs font-bold uppercase tracking-wider text-primary">
            &larr; Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const friendlyStatus = getFriendlyStatus(project);

  // Status timeline parameters (Part 11)
  const timelineSteps = [
    { label: "Submitted", done: true },
    { label: "Admin Review", done: project.status !== "SUBMITTED" },
    { label: "Matching", done: !["SUBMITTED", "UNDER_ADMIN_REVIEW"].includes(project.status) },
    { label: "Client Approval", done: project.client_approval_status === "APPROVED" || !!project.booking_id },
    { label: "Confirmation", done: !!project.booking_id },
    { label: "Booking Created", done: !!project.booking_id },
  ];

  let activeStepIndex = 0;
  for (let i = timelineSteps.length - 1; i >= 0; i--) {
    if (timelineSteps[i].done) {
      activeStepIndex = i;
      break;
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border-custom/50 pb-4">
          <div>
            <Link href="/client/projects" className="text-xs text-primary font-black uppercase tracking-wider hover:underline flex items-center gap-1.5">
              ← Back to Projects
            </Link>
            <h1 className="text-lg md:text-xl font-black mt-2 text-text-main flex items-center gap-3">
              <span>{project.title}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(friendlyStatus)}`}>
                {friendlyStatus}
              </span>
            </h1>
            <p className="text-[10px] text-text-muted mt-1 font-mono uppercase tracking-wider">
              Project Brief: PRJ-{project.id} • Mode: {project.is_admin_managed ? "Managed Coordination" : "Legacy Self-Managed"}
            </p>
          </div>

          <div className="flex gap-2">
            {project.is_admin_managed && project.admin_conversation_id && (
              <Link
                href={`/client/messages?active=${project.admin_conversation_id}`}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Admin</span>
              </Link>
            )}
            {["SUBMITTED", "UNDER_ADMIN_REVIEW", "MATCHING"].includes(project.status) && (
              <button
                onClick={handleCloseProject}
                disabled={closing}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated text-rose-450 border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel Brief
              </button>
            )}
          </div>
        </div>

        {/* Converted Booking Banner (Part 25, 26, 27) */}
        {project.booking_id && (
          <div className="bg-gradient-to-r from-emerald-950/20 to-surface border border-emerald-500/30 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
            <div className="flex gap-3 items-center text-emerald-400">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="font-extrabold uppercase tracking-wider">Booking Created: {project.booking_number}</span>
                <p className="text-text-sub mt-0.5">This project is now being managed as an active marketplace booking.</p>
              </div>
            </div>
            <Link
              href={`/client/bookings/${project.booking_id}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-text-on-dark text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              Open Booking →
            </Link>
          </div>
        )}

        {/* Managed Progress Timeline (Part 11) */}
        {project.is_admin_managed && (
          <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Project Lifecycle Stage</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              {timelineSteps.map((step, idx) => {
                const isDone = step.done;
                const isCurrent = idx === activeStepIndex;
                return (
                  <div key={idx} className="space-y-2 relative flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                      isDone 
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : isCurrent
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-surface-elevated border-border-custom text-text-muted"
                    }`}>
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span className={`text-[9px] font-black leading-tight tracking-tight uppercase block ${
                      isDone ? "text-text-main" : isCurrent ? "text-primary" : "text-text-muted"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Requirements Brief & Matching */}
          <div className="lg:col-span-2 space-y-8">

            {/* Proposed Match Approval (Part 15-20) */}
            {project.is_admin_managed && project.client_approval_required && project.matched_freelancer && (
              <div className="bg-gradient-to-br from-amber-950/20 to-surface border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex gap-3 items-start text-amber-300">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">Recommended Professional</h3>
                    <p className="text-[11px] text-amber-400 mt-1 leading-relaxed">
                      Our team has matched a professional based on your project requirements. Please review the profile and confirm whether you'd like to continue.
                    </p>
                  </div>
                </div>

                {/* Freelancer profile coordinate summary */}
                <div className="bg-surface-elevated border border-border-custom rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-14 h-14 bg-surface border border-border-custom rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
                    {project.matched_freelancer.profile_photo_url ? (
                      <img
                        src={getMediaUrl(project.matched_freelancer.profile_photo_url)}
                        alt={project.matched_freelancer.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-text-muted font-bold">No Photo</span>
                    )}
                  </div>
                  <div className="text-xs space-y-1.5 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-text-main text-sm">{project.matched_freelancer.full_name}</h4>
                        <p className="text-text-sub text-[10px] uppercase font-bold text-primary">
                          {project.matched_freelancer.professional_title || "Creative Professional"}
                        </p>
                      </div>
                      <Link
                        href={`/freelancers/${project.matched_freelancer.id}`}
                        target="_blank"
                        className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="flex gap-4 text-[10px] text-text-muted font-semibold pt-1 border-t border-border-custom/50">
                      <span>Rating: {project.matched_freelancer.average_rating ? `${project.matched_freelancer.average_rating} ⭐` : "N/A"}</span>
                      <span>Location: {project.matched_freelancer.city || "Remote"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowApproveConfirm(true)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-text-on-dark text-xs font-bold rounded-xl transition cursor-pointer text-center"
                  >
                    Approve Professional
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowDeclineConfirm(true)}
                    className="flex-1 py-2.5 bg-surface hover:bg-surface-elevated text-rose-450 border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer text-center"
                  >
                    Decline Professional
                  </button>
                </div>
              </div>
            )}

            {/* If approved but pending professional confirmation (Part 21) */}
            {project.is_admin_managed && project.client_approval_status === "APPROVED" && !project.booking_id && (
              <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-md flex items-center gap-3 text-xs text-text-sub leading-relaxed">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-text-main">Approved by You</p>
                  <p className="text-[10px] mt-0.5">Waiting for the professional's final confirmation to convert this project brief to a booking contract.</p>
                </div>
              </div>
            )}

            {/* Requirement Specifications */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Project Specification</h3>
              <p className="text-xs text-text-main font-normal leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </div>

            {/* Legacy Self-Managed Proposals Section (Part 6) */}
            {!project.is_admin_managed && (
              <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">
                  Received Proposals ({proposals.length})
                </h3>

                {proposals.length === 0 ? (
                  <div className="text-xs text-text-muted italic py-4 text-center">
                    No proposals received yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((prop) => (
                      <div 
                        key={prop.id} 
                        className="border border-border-custom rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface hover:shadow-xs transition duration-200"
                      >
                        <div className="space-y-2 flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-text-main">
                              {prop.freelancer_name || `Freelancer #${prop.freelancer_profile_id}`}
                            </span>
                            <span className="px-2 py-0.5 border border-amber-500/20 text-amber-500 text-[8px] font-extrabold uppercase tracking-wider rounded-lg bg-amber-500/5">
                              {prop.status}
                            </span>
                          </div>
                          <p className="text-xs text-text-sub line-clamp-1 font-medium leading-relaxed">
                            {prop.cover_letter}
                          </p>
                          <div className="flex gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wide">
                            <span>Bid: ₹{parseFloat(prop.proposed_amount).toLocaleString()}</span>
                            <span>Delivery: {prop.delivery_days} days</span>
                          </div>
                        </div>
                        <Link
                          href={`/client/projects/${project.id}/proposals/${prop.id}`}
                          className="px-4 py-2 border border-border-custom hover:bg-surface-elevated text-[10px] font-extrabold uppercase tracking-wider rounded-xl text-text-sub hover:text-text-main transition text-center flex items-center justify-center gap-1.5 shrink-0"
                        >
                          View Proposal
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column: Listing Coordinates & Notices */}
          <div className="space-y-6">
            
            {/* Listing coordinates */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4 text-xs font-semibold text-text-sub">
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Listing Coordinates</h3>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-start py-2 border-b border-border-custom/50">
                  <span className="text-text-muted">Target Budget Limit</span>
                  <div className="text-right">
                    <span className="font-extrabold text-text-main block">
                      ₹{parseFloat(project.budget_min).toLocaleString()} - ₹{parseFloat(project.budget_max).toLocaleString()}
                    </span>
                    <span className="text-[8px] text-text-muted font-bold block uppercase mt-0.5">INR Currency</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border-custom/50">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-text-muted" />
                    Target Timeline
                  </span>
                  <span className="font-extrabold text-text-main">
                    {project.deadline 
                      ? new Date(project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                      : "No deadline"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border-custom/50">
                  <span className="text-text-muted">Location Mode</span>
                  <span className="font-extrabold text-text-main uppercase tracking-wider">
                    {project.project_type}
                  </span>
                </div>

                {project.project_type !== "REMOTE" && (
                  <div className="flex justify-between items-start py-2">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-text-muted" />
                      Venue Location
                    </span>
                    <span className="font-extrabold text-text-main text-right">
                      {project.city}, {project.state || ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Platform notice coordinate */}
            <div className="bg-surface border border-border-custom rounded-3xl p-5 shadow-sm text-xs text-text-sub space-y-2 leading-relaxed">
              <Shield className="w-4 h-4 text-primary" />
              <p className="font-bold text-text-main">Platform Coordination Notice:</p>
              <p>
                Our administrators review matching candidates for your briefs internally to ensure project contract quality. Matched creators are proposed directly for approval.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Confirm Approve Proposed Professional Modal Dialog (Part 19) */}
      {showApproveConfirm && project.matched_freelancer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-custom max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-text-main uppercase tracking-wider">Approve Professional?</h3>
            <p className="text-xs text-text-sub leading-relaxed">
              You are approving <strong className="text-text-main">{project.matched_freelancer.full_name}</strong> for this project. Continue?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveProfessional}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-text-on-dark text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Approve Professional
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Decline Proposed Professional Modal Dialog (Part 20) */}
      {showDeclineConfirm && project.matched_freelancer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-custom max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-text-main uppercase tracking-wider">Decline Professional?</h3>
            <div className="space-y-3">
              <p className="text-xs text-text-sub leading-relaxed">
                Why would you prefer another option? (Optional)
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={2}
                placeholder="Notes for the matching team..."
                className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setShowDeclineConfirm(false);
                  setDeclineReason("");
                }}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineProfessional}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-text-on-dark text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Decline & Continue Matching
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
