"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import { marketplaceService } from "@/services/service.service";
import { useAuth } from "@/context/AuthContext";

export default function PostProjectRequirementPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("REMOTE");
  const [categoryId, setCategoryId] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");

  useEffect(() => {
    // Enforce role authorization
    if (user && user.role !== "CLIENT") {
      router.push("/client/dashboard");
      return;
    }

    async function loadCategories() {
      try {
        const cats = await marketplaceService.getCategoriesMenu();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load category menu", err);
      }
    }
    loadCategories();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim() || !description.trim() || !budgetMin || !budgetMax || !categoryId) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    const min = parseFloat(budgetMin);
    const max = parseFloat(budgetMax);

    if (isNaN(min) || min < 0 || isNaN(max) || max < min) {
      setErrorMsg("Please enter valid budget ranges. Max budget must be greater than or equal to Min budget.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        project_type: projectType,
        budget_min: min,
        budget_max: max,
        category_id: parseInt(categoryId),
        deadline: deadline || undefined,
        city: projectType !== "REMOTE" ? city.trim() : undefined,
        state: projectType !== "REMOTE" ? state.trim() : undefined,
        country: projectType !== "REMOTE" ? country.trim() : undefined,
      };

      await projectService.createProject(payload);
      router.push("/client/projects");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to publish project brief. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-8 max-w-3xl">
      <div className="space-y-6">
        {/* Back Link */}
        <Link href="/client/projects" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-sub hover:text-text-main transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <PageHeader
          title="Post a Project Requirement"
          description="Specify your creative guidelines, set budget scopes, and receive custom bidding quotes from verified creators."
        />

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          {/* Project Title */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Project Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cinematic Wedding Video Editor"
              className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Service Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
              >
                <option value="">Select a Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Delivery/Timeline Date */}
            <div className="space-y-2">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Expected Deadline / Delivery Date</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Min Budget */}
            <div className="space-y-2">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Minimum Budget (INR) *</label>
              <input
                type="number"
                required
                min="0"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="₹ Min budget"
                className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>

            {/* Max Budget */}
            <div className="space-y-2">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Maximum Budget (INR) *</label>
              <input
                type="number"
                required
                min="0"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="₹ Max budget"
                className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Work Mode */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Work Mode / Delivery Style *</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
            >
              <option value="REMOTE">Remote Delivery</option>
              <option value="ON_SITE">On-Site Execution</option>
              <option value="HYBRID">Hybrid (Mix of Remote & On-Site)</option>
            </select>
          </div>

          {/* Location details for On-Site or Hybrid */}
          {projectType !== "REMOTE" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface p-4 border border-border-custom rounded-2xl animate-in slide-in-from-top-4 duration-200">
              <div className="space-y-2">
                <label className="block text-[9px] text-text-sub font-bold uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] text-text-sub font-bold uppercase tracking-wider">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] text-text-sub font-bold uppercase tracking-wider">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Project description brief */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Project Brief / Description *</label>
            <textarea
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline project instructions, creative styles, technical references, and what you expect as the final deliverable."
              className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary font-normal leading-relaxed"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-text-on-dark text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {submitting ? "Publishing Requirement..." : "Post Project Brief"}
          </button>
        </form>
      </div>
    </Container>
  );
}
