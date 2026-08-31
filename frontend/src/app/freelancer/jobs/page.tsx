"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FolderOpen, Calendar, ArrowRight, DollarSign, Search, Filter, MapPin } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import { marketplaceService } from "@/services/service.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

export default function FreelancerBrowseJobsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/freelancer/bookings");
  }, [router]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [projectType, setProjectType] = useState("");
  const [city, setCity] = useState("");

  async function loadCategories() {
    try {
      const cats = await marketplaceService.getCategoriesMenu();
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load category menu", err);
    }
  }

  async function queryJobs() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (categoryId) params.category_id = parseInt(categoryId);
      if (minBudget) params.min_budget = parseFloat(minBudget);
      if (maxBudget) params.max_budget = parseFloat(maxBudget);
      if (projectType) params.project_type = projectType;
      if (city.trim()) params.city = city.trim();

      const data = await projectService.listProjects(params);
      setJobs(data);
    } catch (err) {
      console.error("Failed to fetch jobs list", err);
      setErrorMsg("Failed to query open job listings. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    queryJobs();
  }, [categoryId, projectType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    queryJobs();
  };

  const getCategoryLabel = (catId?: number) => {
    if (!catId) return "Creative Brief";
    const found = categories.find((c) => c.id === catId);
    return found ? found.name : "Creative Brief";
  };

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <PageHeader
          title="Browse Available Project Briefs"
          description="Discover open creative postings, apply with custom budget proposals, and start direct agreements."
        />

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Filters Panel */}
        <form onSubmit={handleSearchSubmit} className="bg-surface-elevated border border-border-custom rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-sm">
          {/* Keyword Search */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Search Keywords</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Wedding, Editor"
                className="w-full bg-surface border border-border-custom rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Work Mode */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Delivery Mode</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
            >
              <option value="">All Modes</option>
              <option value="REMOTE">Remote</option>
              <option value="ON_SITE">On-Site</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          {/* City / Location */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">City / Location</label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full bg-surface border border-border-custom rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
              <MapPin className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            </div>
          </div>

          {/* Budget Range filters */}
          <div className="sm:col-span-2 md:col-span-3 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Min Budget (INR)</label>
              <input
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="₹ Min price"
                className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Max Budget (INR)</label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="₹ Max price"
                className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Submit Search button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </form>

        {/* Jobs Feed Grid */}
        {loading ? (
          <LoadingState message="Scanning marketplace listings..." />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No open briefs match your filters"
            description="Adjust your search parameters or check back later for new client projects."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-surface-elevated border border-border-custom rounded-2xl p-6 flex flex-col justify-between hover:shadow-xs transition duration-200"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Posted {new Date(job.created_at).toLocaleDateString()}
                      </span>
                      <h3 className="font-extrabold text-base text-text-main mt-0.5 line-clamp-1">
                        {job.title}
                      </h3>
                    </div>
                    <span className="inline-block px-2.5 py-1 bg-surface border border-border-custom rounded-lg text-[9px] font-bold text-text-sub uppercase tracking-wider">
                      {getCategoryLabel(job.category_id)}
                    </span>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-text-sub line-clamp-2 leading-relaxed font-medium">
                    {job.description}
                  </p>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 bg-surface p-3.5 border border-border-custom rounded-xl text-[11px] text-text-sub font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-text-muted" />
                      <span className="truncate">
                        {job.project_type === "REMOTE" ? "Remote" : `${job.city || "On-site"}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-text-muted" />
                      <span className="font-bold text-text-main">
                        ₹{parseFloat(job.budget_min).toLocaleString()} - ₹{parseFloat(job.budget_max).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-border-custom">
                  <Link
                    href={`/freelancer/jobs/${job.id}`}
                    className="flex-grow py-2.5 text-center bg-primary hover:bg-primary-hover text-[11px] font-extrabold uppercase tracking-wider rounded-xl text-text-on-dark transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    View Job details
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
