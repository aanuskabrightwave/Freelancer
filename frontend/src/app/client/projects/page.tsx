"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Calendar, ArrowRight, DollarSign, Plus } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

type TabType = "ACTIVE" | "CLOSED" | "ALL";

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
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

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPEN":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
      case "CLOSED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600";
      default:
        return "bg-neutral-500/10 border-neutral-500/30 text-text-muted";
    }
  };

  const activeProjects = projects.filter(p => p.status.toUpperCase() === "OPEN");
  const closedProjects = projects.filter(p => p.status.toUpperCase() === "CLOSED");

  const displayedProjects = 
    activeTab === "ACTIVE" ? activeProjects : 
    activeTab === "CLOSED" ? closedProjects : projects;

  if (loading) {
    return <LoadingState message="Loading your projects..." />;
  }

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader
            title="My Project Briefs"
            description="Manage your custom job postings, track applicant bids, and review talent proposals."
          />
          <Link
            href="/client/projects/new"
            className="px-5 py-3 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Post Requirement
          </Link>
        </div>

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
            Open Postings ({activeProjects.length})
          </button>
          <button
            onClick={() => setActiveTab("CLOSED")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
              activeTab === "CLOSED"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            Closed ({closedProjects.length})
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
              activeTab === "ALL"
                ? "bg-primary text-text-on-dark shadow-xs"
                : "bg-surface border border-border-custom text-text-sub hover:text-text-main"
            }`}
          >
            All Postings ({projects.length})
          </button>
        </div>

        {/* Projects Grid */}
        {displayedProjects.length === 0 ? (
          <EmptyState
            title={activeTab === "ACTIVE" ? "No open postings" : activeTab === "CLOSED" ? "No closed postings" : "No project briefs posted"}
            description="Create project briefs to invite bids and quotes from specialists."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedProjects.map((project) => (
              <div
                key={project.id}
                className="bg-surface-elevated border border-border-custom rounded-2xl p-6 flex flex-col justify-between hover:shadow-xs transition duration-200"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Project Brief #{project.id}
                      </span>
                      <h3 className="font-extrabold text-base text-text-main mt-0.5 line-clamp-1">
                        {project.title}
                      </h3>
                    </div>
                    <span className={`inline-block px-2.5 py-1 border rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(project.status)}`}>
                      {project.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-text-sub line-clamp-2 leading-relaxed font-medium">
                    {project.description}
                  </p>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 bg-surface p-3.5 border border-border-custom rounded-xl text-[11px] text-text-sub font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-muted" />
                      <span>
                        {project.deadline 
                          ? new Date(project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                          : "No Deadline"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-text-muted" />
                      <span className="font-bold text-text-main">
                        ₹{parseFloat(project.budget_min).toLocaleString()} - ₹{parseFloat(project.budget_max).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-border-custom">
                  <Link
                    href={`/client/projects/${project.id}`}
                    className="flex-grow py-2.5 text-center bg-primary hover:bg-primary-hover text-[11px] font-extrabold uppercase tracking-wider rounded-xl text-text-on-dark transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    Manage Postings
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
