"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Calendar, ArrowRight, DollarSign, Plus, MessageSquare, Shield, HelpCircle, Inbox } from "lucide-react";
import { projectService } from "@/services/project.service";
import LoadingState from "@/components/common/LoadingState";

type ProjectFilter = "ALL" | "REVIEW" | "MATCHING" | "APPROVAL" | "BOOKING_CREATED" | "COMPLETED" | "CANCELLED";

const FILTER_LABELS: Record<ProjectFilter, string> = {
  ALL: "All Briefs",
  REVIEW: "Under Review",
  MATCHING: "Matching Professional",
  APPROVAL: "Approval Required",
  BOOKING_CREATED: "Booking Created",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadProjects() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await projectService.getClientProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load client projects", err);
      setErrorMsg("Failed to load projects. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  // Client-Friendly Status Mapping (Part 4)
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

  // Next Action CTA Selector (Part 7)
  const getNextActionConfig = (p: any) => {
    const friendly = getFriendlyStatus(p);
    if (friendly === "Booking Created" && p.booking_id) {
      return { label: "View Booking", url: `/client/bookings/${p.booking_id}`, isPrimary: true };
    }
    if (friendly === "Your Approval Required") {
      return { label: "Review Professional", url: `/client/projects/${p.id}`, isPrimary: true };
    }
    return { label: "View Status", url: `/client/projects/${p.id}`, isPrimary: false };
  };

  const filteredProjects = projects.filter((p) => {
    const friendly = getFriendlyStatus(p);
    if (activeFilter === "ALL") return true;
    if (activeFilter === "REVIEW") {
      return friendly === "Submitted to Admin" || friendly === "Under Admin Review";
    }
    if (activeFilter === "MATCHING") {
      return friendly === "Matching a Professional" || friendly === "Professional Confirmation in Progress";
    }
    if (activeFilter === "APPROVAL") return friendly === "Your Approval Required";
    if (activeFilter === "BOOKING_CREATED") return friendly === "Booking Created";
    if (activeFilter === "COMPLETED") return friendly === "Completed";
    if (activeFilter === "CANCELLED") return friendly === "Cancelled";
    return false;
  });

  const getEmptyStateMessage = () => {
    if (activeFilter === "REVIEW") return "No project briefs under review.";
    if (activeFilter === "MATCHING") return "No matching coordinators active.";
    if (activeFilter === "APPROVAL") return "No professionals pending your approval.";
    if (activeFilter === "BOOKING_CREATED") return "No project bookings active.";
    if (activeFilter === "COMPLETED") return "No completed project records.";
    if (activeFilter === "CANCELLED") return "No cancelled project briefs.";
    return "You haven't posted any projects yet.";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 md:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-surface border border-border-custom rounded-3xl p-6 h-32 animate-pulse flex flex-col justify-between">
            <div className="w-1/3 h-5 bg-surface-elevated rounded-lg"></div>
            <div className="w-1/2 h-3 bg-surface-elevated rounded-lg"></div>
          </div>
          <div className="flex gap-2 pb-2 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-24 h-8 bg-surface border border-border-custom rounded-xl animate-pulse shrink-0"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface border border-border-custom rounded-3xl p-6 h-48 animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="w-1/4 h-4 bg-surface-elevated rounded"></div>
                  <div className="w-1/6 h-4 bg-surface-elevated rounded"></div>
                </div>
                <div className="w-full h-12 bg-surface-elevated rounded-xl"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Block */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">My Projects</h1>
            <p className="text-text-sub text-xs mt-1">
              Track project requests from submission through professional matching and booking.
            </p>
          </div>
          <Link
            href="/client/projects/new"
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition shadow-md shrink-0 cursor-pointer"
          >
            + Post Requirement
          </Link>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters (Part 35) */}
        <div className="flex gap-2 pb-2 overflow-x-auto border-b border-border-custom scrollbar-thin">
          {(Object.keys(FILTER_LABELS) as ProjectFilter[]).map((filter) => {
            const count = projects.filter((p) => {
              const friendly = getFriendlyStatus(p);
              if (filter === "ALL") return true;
              if (filter === "REVIEW") return friendly === "Submitted to Admin" || friendly === "Under Admin Review";
              if (filter === "MATCHING") return friendly === "Matching a Professional" || friendly === "Professional Confirmation in Progress";
              if (filter === "APPROVAL") return friendly === "Your Approval Required";
              if (filter === "BOOKING_CREATED") return friendly === "Booking Created";
              if (filter === "COMPLETED") return friendly === "Completed";
              if (filter === "CANCELLED") return friendly === "Cancelled";
              return false;
            }).length;

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                  activeFilter === filter
                    ? "bg-primary text-text-on-dark border-primary shadow-sm"
                    : "bg-surface hover:bg-surface-elevated text-text-sub border-border-custom"
                }`}
              >
                <span>{FILTER_LABELS[filter]}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    activeFilter === filter ? "bg-text-on-dark/20 text-text-on-dark" : "bg-surface-elevated text-text-muted"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Projects List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const friendlyStatus = getFriendlyStatus(project);
            const actionConfig = getNextActionConfig(project);
            const hasMatched = !!project.matched_freelancer;

            return (
              <div
                key={project.id}
                className="bg-surface border border-border-custom rounded-3xl p-6 flex flex-col justify-between hover:border-border-custom/80 transition duration-150 shadow-md"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-tight">PRJ-{project.id}</span>
                        {!project.is_admin_managed && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[8px] uppercase tracking-wider font-bold">Legacy</span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-text-main mt-0.5 line-clamp-1">
                        {project.title}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(friendlyStatus)}`}>
                      {friendlyStatus}
                    </span>
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs text-text-sub line-clamp-2 leading-relaxed font-medium">
                    {project.description}
                  </p>

                  {/* Budget & Matches */}
                  <div className="bg-surface-elevated/40 border border-border-custom/50 rounded-2xl p-3.5 space-y-2 text-[10px]">
                    <div className="flex justify-between font-semibold">
                      <span className="text-text-muted">Agreed/Budget Limit</span>
                      <span className="text-text-main font-bold">₹{parseFloat(project.budget_min).toLocaleString()} - ₹{parseFloat(project.budget_max).toLocaleString()}</span>
                    </div>

                    {hasMatched && (
                      <div className="flex justify-between items-center pt-2 border-t border-border-custom/30 font-semibold">
                        <span className="text-text-muted">Matched Creator</span>
                        <span className="text-primary font-bold">{project.matched_freelancer.full_name}</span>
                      </div>
                    )}

                    {project.booking_number && (
                      <div className="flex justify-between items-center pt-2 border-t border-border-custom/30 font-semibold">
                        <span className="text-text-muted">Linked Booking</span>
                        <span className="text-emerald-500 font-bold font-mono text-[9px]">{project.booking_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 mt-6 pt-4 border-t border-border-custom/60">
                  <Link
                    href={actionConfig.url}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
                      actionConfig.isPrimary
                        ? "bg-primary hover:bg-primary-hover text-text-on-dark"
                        : "bg-surface hover:bg-surface-elevated text-text-sub border border-border-custom hover:text-text-main"
                    } cursor-pointer`}
                  >
                    {actionConfig.label}
                  </Link>
                </div>
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            /* Empty State Container (Part 37) */
            <div className="col-span-1 md:col-span-2 py-20 text-center text-text-muted border border-dashed border-border-custom rounded-3xl flex flex-col justify-center items-center space-y-4">
              <Inbox className="w-10 h-10 text-text-muted" />
              <div>
                <h3 className="font-bold text-text-main text-sm">No Projects Found</h3>
                <p className="text-xs text-text-sub mt-1 max-w-xs mx-auto leading-relaxed">
                  {getEmptyStateMessage()}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Link
                  href="/client/projects/new"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Post a Project
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
