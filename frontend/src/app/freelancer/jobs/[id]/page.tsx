"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, DollarSign, MapPin, Send } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import { marketplaceService } from "@/services/service.service";
import LoadingState from "@/components/common/LoadingState";

export default function FreelancerJobDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace("/freelancer/bookings");
  }, [router]);

  const [project, setProject] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Proposal Submission States
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [bidPrice, setBidPrice] = useState("");
  const [bidDays, setBidDays] = useState("");
  const [bidCover, setBidCover] = useState("");

  async function loadJobDetails() {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const cats = await marketplaceService.getCategoriesMenu();
      setCategories(cats);

      const data = await projectService.getProjectDetails(id as string);
      setProject(data);

      // Check if freelancer already submitted a proposal
      const myProps = await projectService.getMyProposals();
      const exists = myProps.some((p: any) => p.project_id === data.id && p.status !== "WITHDRAWN");
      setAlreadySubmitted(exists);
    } catch (err: any) {
      console.error("Failed to load freelancer project details", err);
      setErrorMsg(err.response?.data?.detail || "Failed to load project details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const getCategoryLabel = (catId?: number) => {
    if (!catId) return "Creative Brief";
    const found = categories.find((c) => c.id === catId);
    return found ? found.name : "Creative Brief";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
      case "CLOSED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600";
      default:
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !project) return;

    const price = parseFloat(bidPrice);
    const days = parseInt(bidDays);

    if (isNaN(price) || price <= 0 || isNaN(days) || days <= 0 || !bidCover.trim()) {
      setErrorMsg("Please fill out valid price, delivery days, and cover message details.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await projectService.submitProposal(project.id, {
        proposed_amount: price,
        delivery_days: days,
        cover_letter: bidCover.trim()
      });

      setSuccessMsg("Proposal submitted successfully.");
      setAlreadySubmitted(true);
      setShowForm(false);
      
      // Auto redirect to proposals dashboard after 1.5 seconds
      setTimeout(() => {
        router.push("/freelancer/proposals");
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Unable to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading job details..." />;
  }

  if (errorMsg && !project) {
    return (
      <Container className="py-8">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
        <div className="mt-4">
          <Link href="/freelancer/jobs" className="text-xs font-bold uppercase tracking-wider text-primary">
            &larr; Back to Jobs Feed
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Back Link */}
        <Link href="/freelancer/jobs" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-sub hover:text-text-main transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs Feed
        </Link>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Job Posting #{project.id}
              </span>
              <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(project.status)}`}>
                {project.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-text-main leading-tight">{project.title}</h1>
          </div>
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
          {/* Main Brief Info */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
              <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider">Project Specification</h3>
              <p className="text-xs text-text-main font-normal leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </div>
          </div>

          {/* Details Sidebar & Bidding Action */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6 font-medium text-xs text-text-sub">
              <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider text-[11px]">Listing Coordinates</h3>

              <div className="space-y-4">
                {/* Category */}
                <div className="flex justify-between items-center py-2 border-b border-border-custom/50">
                  <span className="text-text-muted">Category</span>
                  <span className="font-extrabold text-text-main">
                    {getCategoryLabel(project.category_id)}
                  </span>
                </div>

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

              {/* Bidding Controls Panel */}
              <div className="pt-4 border-t border-border-custom">
                {alreadySubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">
                      Proposal Submitted
                    </span>
                    <span className="text-[8px] text-text-muted font-bold block uppercase mt-0.5">
                      Check status in My Proposals
                    </span>
                  </div>
                ) : project.status !== "OPEN" ? (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider block">
                      Listing Closed
                    </span>
                    <span className="text-[8px] text-text-muted font-bold block uppercase mt-0.5">
                      No longer accepting bids
                    </span>
                  </div>
                ) : showForm ? (
                  <form onSubmit={handleFormSubmit} className="space-y-4 font-sans text-xs">
                    <h4 className="font-extrabold uppercase text-[10px] text-text-main tracking-wider">Bid Parameters</h4>
                    
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Proposed Amount (INR) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={bidPrice}
                        onChange={(e) => setBidPrice(e.target.value)}
                        placeholder="₹ Bid amount"
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Delivery Time (Days) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={bidDays}
                        onChange={(e) => setBidDays(e.target.value)}
                        placeholder="e.g. 7"
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Cover Letter / Approach *</label>
                      <textarea
                        required
                        rows={4}
                        value={bidCover}
                        onChange={(e) => setBidCover(e.target.value)}
                        placeholder="Detail your capability, references, and milestones..."
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-normal leading-relaxed"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex-grow py-2.5 bg-surface border border-border-custom text-text-sub hover:text-text-main text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-grow py-2.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-text-on-dark text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        {submitting ? "Sending..." : "Submit Bid"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer animate-pulse"
                  >
                    <Send className="w-4 h-4" />
                    Submit Proposal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
