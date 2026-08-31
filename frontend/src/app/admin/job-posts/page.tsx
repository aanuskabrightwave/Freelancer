"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface MatchedCreator {
  id: number;
  user_id: number;
  professional_title: string | null;
  full_name: string;
}

interface ProjectListItem {
  id: number;
  title: string;
  description: string;
  category: string;
  budget: string;
  deadline: string | null;
  project_type: string;
  status: string;
  is_admin_managed: boolean;
  client_name: string;
  booking_id: number | null;
  booking_number: string | null;
  matched_freelancer: MatchedCreator | null;
  created_at: string;
}

interface PaginatedProjects {
  total: number;
  page: number;
  page_size: number;
  items: ProjectListItem[];
}

export default function AdminJobPostsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {
          page: String(page),
          page_size: "15"
        };
        if (statusFilter !== "ALL") {
          params["status"] = statusFilter;
        }

        const data = await api.get<PaginatedProjects>("/admin/projects", { params });
        // Filter to admin managed projects only
        const managed = data.items.filter((p) => p.is_admin_managed);
        setProjects(managed);
        setTotalItems(managed.length);
      } catch (err: any) {
        setError(err.message || "We couldn't load project briefs. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [statusFilter, page]);

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

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-amber-950/40 text-amber-300 border-amber-900/30";
      case "UNDER_ADMIN_REVIEW":
        return "bg-blue-950/45 text-blue-300 border-blue-900/40";
      case "MATCHING":
        return "bg-primary/10 text-primary border-primary/20";
      case "BOOKING_CREATED":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-900/30";
      case "COMPLETED":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-900/30";
      case "CANCELLED":
        return "bg-rose-950/40 text-rose-300 border-rose-900/30";
      default:
        return "bg-surface text-text-sub border-border-custom";
    }
  };

  const getFriendlyStatusLabel = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "New Project";
      case "UNDER_ADMIN_REVIEW":
        return "Under Review";
      case "MATCHING":
        return "Matching Professional";
      case "BOOKING_CREATED":
        return "Booking Created";
      default:
        return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const getNextAction = (project: ProjectListItem) => {
    if (project.status === "SUBMITTED") {
      return { label: "Review", style: "bg-primary text-text-on-dark hover:bg-primary-hover", url: `/admin/job-posts/${project.id}` };
    }
    if (project.status === "UNDER_ADMIN_REVIEW") {
      return { label: "Start Matching", style: "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30", url: `/admin/job-posts/${project.id}` };
    }
    if (project.status === "MATCHING") {
      return { label: "Match Freelancer", style: "bg-primary text-text-on-dark hover:bg-primary-hover", url: `/admin/job-posts/${project.id}` };
    }
    if (project.status === "BOOKING_CREATED" && project.booking_id) {
      return { label: "View Booking", style: "bg-surface text-text-main border border-border-custom hover:bg-surface-elevated", url: `/admin/bookings/${project.booking_id}` };
    }
    return { label: "View Details", style: "bg-surface text-text-sub border border-border-custom hover:bg-surface-elevated", url: `/admin/job-posts/${project.id}` };
  };

  const statusTabs = [
    { label: "All Job Posts", value: "ALL" },
    { label: "New", value: "SUBMITTED" },
    { label: "Under Review", value: "UNDER_ADMIN_REVIEW" },
    { label: "Matching", value: "MATCHING" },
    { label: "Booking Created", value: "BOOKING_CREATED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" }
  ];

  // In-memory query text matching
  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const ref = `PRJ-${String(p.id).padStart(6, "0")}`.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.client_name.toLowerCase().includes(q) ||
      ref.includes(q)
    );
  });

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-main font-semibold">Job Posts</h1>
        <p className="text-text-sub text-xs mt-1">Review Client project requirements and match suitable professional creators.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-surface-elevated border border-border-custom p-4 rounded-3xl">
        <div className="flex flex-wrap gap-1.5 font-semibold">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-primary text-text-on-dark"
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
            placeholder="Search Reference / Client / Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-full px-5 py-2.5 pl-10 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted"
          />
          <span className="absolute left-4 top-3 text-text-muted text-xs">🔍</span>
        </div>
      </div>

      {/* Table listing */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-elevated border border-border-custom rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-955/35 border border-rose-900/50 text-rose-200 rounded-3xl text-center text-xs font-semibold">
          {error}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="bg-surface-elevated border border-border-custom rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[10px] bg-surface/50">
                  <th className="py-4 px-5">Ref ID</th>
                  <th className="py-4 px-5">Project Title</th>
                  <th className="py-4 px-5">Client Name</th>
                  <th className="py-4 px-5">Category</th>
                  <th className="py-4 px-5 text-right">Budget</th>
                  <th className="py-4 px-5">Deadline</th>
                  <th className="py-4 px-5">Matched Candidate</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 font-medium">
                {filteredProjects.map((p) => {
                  const action = getNextAction(p);
                  const refCode = `PRJ-${String(p.id).padStart(6, "0")}`;
                  return (
                    <tr key={p.id} className="hover:bg-surface/30 transition-all">
                      <td className="py-4 px-5 text-text-main font-bold">
                        <Link href={`/admin/job-posts/${p.id}`} className="hover:text-primary transition-colors">
                          {refCode}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-text-main font-semibold truncate max-w-[180px]">{p.title}</td>
                      <td className="py-4 px-5 text-text-sub">{p.client_name}</td>
                      <td className="py-4 px-5 text-text-sub capitalize">{p.category.replace(/_/g, " ").toLowerCase()}</td>
                      <td className="py-4 px-5 text-right text-text-main font-bold">
                        {formatCurrency(p.budget)}
                      </td>
                      <td className="py-4 px-5 text-text-sub">{formatDate(p.deadline)}</td>
                      <td className="py-4 px-5">
                        {p.matched_freelancer?.full_name ? (
                          <span className="text-text-main font-semibold">{p.matched_freelancer.full_name}</span>
                        ) : p.booking_id ? (
                          <span className="text-text-muted italic">Booking Link set</span>
                        ) : (
                          <span className="text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider">
                            Unmatched
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-wide uppercase ${getStatusBadgeStyles(p.status)}`}>
                          {getFriendlyStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={action.url}
                          className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${action.style}`}
                        >
                          {action.label}
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
        <div className="py-16 text-center text-text-sub text-xs bg-surface-elevated border border-dashed border-border-custom rounded-3xl">
          No project requests are waiting for review.
        </div>
      )}
    </div>
  );
}
