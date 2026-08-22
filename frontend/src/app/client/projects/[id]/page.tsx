"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, DollarSign, MapPin, XCircle, ArrowRight } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import LoadingState from "@/components/common/LoadingState";

export default function ClientProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [project, setProject] = useState<any | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadProjectDetails() {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await projectService.getClientProjectDetails(id as string);
      setProject(data);

      const props = await projectService.getReceivedProposals(id as string);
      setProposals(props);
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
    if (!confirm("Are you sure you want to close this project requirement? This will hide it from the browse jobs feed for freelancers.")) {
      return;
    }

    try {
      setClosing(true);
      setErrorMsg(null);
      const updated = await projectService.closeClientProject(project.id);
      setProject(updated);
      alert("Project requirement closed successfully.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to close project.");
    } finally {
      setClosing(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
      case "CLOSED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600";
      case "AWARDED":
        return "bg-blue-500/10 border-blue-500/30 text-blue-600";
      default:
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
    }
  };

  const getProposalBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
      case "REJECTED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600";
      case "WITHDRAWN":
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
      default:
        return "bg-amber-500/10 border-amber-500/30 text-amber-600";
    }
  };

  if (loading) {
    return <LoadingState message="Loading project brief..." />;
  }

  if (errorMsg && !project) {
    return (
      <Container className="py-8">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
        <div className="mt-4">
          <Link href="/client/projects" className="text-xs font-bold uppercase tracking-wider text-primary">
            &larr; Back to Projects
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Back Link */}
        <Link href="/client/projects" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-sub hover:text-text-main transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Project Listing #{project.id}
              </span>
              <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(project.status)}`}>
                {project.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-text-main leading-tight">{project.title}</h1>
          </div>

          {project.status === "OPEN" && (
            <button
              onClick={handleCloseProject}
              disabled={closing}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer animate-pulse"
            >
              <XCircle className="w-4 h-4" />
              {closing ? "Closing Project..." : "Close Project"}
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Brief Info */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
              <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider">Project Specification</h3>
              <p className="text-xs text-text-main font-normal leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </div>

            {/* Received Proposals Section */}
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider">
                Received Proposals ({proposals.length})
              </h3>
              
              {proposals.length === 0 ? (
                <div className="text-xs text-text-muted font-bold uppercase tracking-wider py-4 text-center">
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
                          <span className={`inline-block px-2 py-0.5 border rounded-lg text-[8px] font-extrabold uppercase tracking-wider ${getProposalBadgeClass(prop.status)}`}>
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
          </div>

          {/* Details Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6 font-medium text-xs text-text-sub">
              <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider text-[11px]">Listing Coordinates</h3>

              <div className="space-y-4">
                {/* Budget Range */}
                <div className="flex justify-between items-start py-2 border-b border-border-custom/50">
                  <span className="text-text-muted">Budget Range</span>
                  <div className="text-right">
                    <span className="font-extrabold text-text-main block">
                      ₹{parseFloat(project.budget_min).toLocaleString()} - ₹{parseFloat(project.budget_max).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-text-muted font-bold block uppercase mt-0.5">INR Currency</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex justify-between items-center py-2 border-b border-border-custom/50">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-text-muted" />
                    Delivery Date
                  </span>
                  <span className="font-extrabold text-text-main">
                    {project.deadline 
                      ? new Date(project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                      : "No deadline"}
                  </span>
                </div>

                {/* Work Type */}
                <div className="flex justify-between items-center py-2 border-b border-border-custom/50">
                  <span className="text-text-muted">Work Mode</span>
                  <span className="font-extrabold text-text-main uppercase tracking-wider">
                    {project.project_type}
                  </span>
                </div>

                {/* Location */}
                {project.project_type !== "REMOTE" && (
                  <div className="flex justify-between items-start py-2">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-text-muted" />
                      Location
                    </span>
                    <span className="font-extrabold text-text-main text-right">
                      {project.city}, {project.state || ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
