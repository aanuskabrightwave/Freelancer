"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Calendar, ArrowRight, DollarSign } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { bookingService } from "@/services/booking.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

type TabType = "ACTIVE" | "ALL";

export default function ClientProjectsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await bookingService.getClientBookings();
        setBookings(data);
      } catch (err) {
        console.error("Failed to load client bookings for projects list", err);
        setErrorMsg("Failed to load projects. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const getFriendlyStatus = (status: string, payState?: string) => {
    switch (status) {
      case "REQUESTED": return "Request Pending";
      case "PENDING_CONFIRMATION": return "Quote Received";
      case "CONFIRMED": return payState === "DEPOSIT_PAID" ? "Confirmed (Escrow Paid)" : "Deposit Required";
      case "IN_PROGRESS": return "In Progress";
      case "DELIVERY_PENDING": return "Pending Review";
      case "COMPLETED": return "Completed";
      case "CANCELLED": return "Cancelled";
      case "REJECTED": return "Rejected";
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string, payState?: string) => {
    switch (status) {
      case "REQUESTED":
      case "PENDING_CONFIRMATION":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600";
      case "CONFIRMED":
        return payState === "DEPOSIT_PAID" 
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
          : "bg-rose-500/10 border-rose-500/30 text-rose-600";
      case "IN_PROGRESS":
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-600";
      case "DELIVERY_PENDING":
        return "bg-purple-500/10 border-purple-500/30 text-purple-600";
      case "COMPLETED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
      default:
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
    }
  };

  const activeProjects = bookings.filter(b => 
    ["CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING", "RESCHEDULE_REQUESTED"].includes(b.status)
  );

  const displayedProjects = activeTab === "ACTIVE" ? activeProjects : bookings;

  if (loading) {
    return <LoadingState message="Loading your projects..." />;
  }

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <PageHeader
          title="My Projects"
          description="View active milestones, monitor revisions, check payment stages, and access secure workspace channels."
        />

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex gap-2 border-b border-border-custom pb-2">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
              activeTab === "ACTIVE"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            Active Projects ({activeProjects.length})
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
              activeTab === "ALL"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            All Bookings & Proposals ({bookings.length})
          </button>
        </div>

        {/* Projects List */}
        {displayedProjects.length === 0 ? (
          <EmptyState
            title={activeTab === "ACTIVE" ? "No active projects" : "No bookings found"}
            description={
              activeTab === "ACTIVE"
                ? "Active contracts will appear here once deposit payments are captured."
                : "Explore freelancers or services to submit your first booking request."
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedProjects.map((project) => {
              const hasWorkspace = ["CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING", "COMPLETED", "CANCELLED", "RESCHEDULE_REQUESTED"].includes(project.status);
              
              return (
                <div
                  key={project.id}
                  className="bg-surface-elevated border border-border-custom rounded-2xl p-6 flex flex-col justify-between hover:shadow-xs transition duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                          Booking #{project.booking_number}
                        </span>
                        <h3 className="font-extrabold text-base text-text-main mt-0.5 line-clamp-1">
                          {project.title}
                        </h3>
                      </div>
                      <span className={`inline-block px-2.5 py-1 border rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(project.status, project.payment_completion_state)}`}>
                        {getFriendlyStatus(project.status, project.payment_completion_state)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-text-sub line-clamp-2 leading-relaxed">
                      {project.description || "No project description provided."}
                    </p>

                    {/* Metadata items */}
                    <div className="grid grid-cols-2 gap-4 bg-surface p-3.5 border border-border-custom rounded-xl text-[11px] text-text-sub font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-text-muted" />
                        <span>
                          {project.booking_date 
                            ? new Date(project.booking_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                            : "Scheduled Date"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-text-muted" />
                        <span className="font-bold text-text-main">
                          ₹{parseFloat(project.agreed_amount || project.price || "0").toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-border-custom">
                    <Link
                      href={`/client/bookings/${project.id}`}
                      className="flex-1 py-2.5 text-center bg-surface hover:bg-surface-elevated border border-border-custom text-[11px] font-extrabold uppercase tracking-wider rounded-xl text-text-sub hover:text-text-main transition"
                    >
                      View Details
                    </Link>
                    {hasWorkspace ? (
                      <Link
                        href={`/client/bookings/${project.id}/workspace`}
                        className="flex-1 py-2.5 text-center bg-primary hover:bg-primary-hover text-[11px] font-extrabold uppercase tracking-wider rounded-xl text-text-on-dark transition flex items-center justify-center gap-1"
                      >
                        Workspace
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <div className="flex-1 py-2.5 text-center border border-dashed border-border-custom text-[10px] font-bold uppercase tracking-wider rounded-xl text-text-muted flex items-center justify-center">
                        Workspace Pending
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
