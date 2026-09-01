"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle, AlertCircle } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { projectService } from "@/services/project.service";
import { marketplaceService } from "@/services/service.service";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Photography" },
  { id: 10, name: "Videography" },
  { id: 18, name: "Editor" },
  { id: 27, name: "3D Animator" },
  { id: 33, name: "Graphics" },
];

export default function PostProjectRequirementPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("REMOTE");
  const [categoryId, setCategoryId] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  
  // Date Fields (Start Date & Optional End Date)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");

  // Field-specific Validation Error States
  const [startDateError, setStartDateError] = useState<string | null>(null);
  const [endDateError, setEndDateError] = useState<string | null>(null);
  const [minBudgetError, setMinBudgetError] = useState<string | null>(null);
  const [maxBudgetError, setMaxBudgetError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Today's date in YYYY-MM-DD for native HTML min constraint
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // Enforce role authorization
    if (user && user.role !== "CLIENT") {
      router.push("/client/dashboard");
      return;
    }

    async function loadCategories() {
      try {
        const cats = await marketplaceService.getCategoriesMenu();
        if (cats && cats.length > 0) {
          // Normalize category names (ensure Editing is displayed as Editor)
          const normalized = cats.map((c: any) => ({
            ...c,
            name: c.name === "Editing" ? "Editor" : c.name,
          }));

          // Ensure 3D Animator and Graphics exist in the list
          const has3D = normalized.some((c: any) => c.name.toLowerCase().includes("3d"));
          const hasGfx = normalized.some((c: any) => c.name.toLowerCase().includes("graphic"));

          if (!has3D) {
            normalized.push({ id: 27, name: "3D Animator" });
          }
          if (!hasGfx) {
            normalized.push({ id: 33, name: "Graphics" });
          }

          setCategories(normalized);
        }
      } catch (err) {
        console.error("Failed to load category menu, using defaults", err);
      }
    }
    loadCategories();
  }, [user]);

  // Date validation handlers
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (!val) {
      setStartDateError(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(val);

    if (isNaN(selected.getTime())) {
      setStartDateError("Please enter a valid start date.");
    } else if (selected < today) {
      setStartDateError("Event Start Date cannot be in the Past");
    } else {
      setStartDateError(null);
      // If end date is already set, verify end date >= start date
      if (endDate) {
        const endD = new Date(endDate);
        if (!isNaN(endD.getTime()) && endD < selected) {
          setEndDateError("Event End Date must be on or after Start Date");
        } else {
          setEndDateError(null);
        }
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (!val) {
      setEndDateError(null);
      return;
    }

    const selected = new Date(val);
    if (isNaN(selected.getTime())) {
      setEndDateError("Please enter a valid end date.");
      return;
    }

    if (startDate) {
      const startD = new Date(startDate);
      if (!isNaN(startD.getTime()) && selected < startD) {
        setEndDateError("Event End Date must be on or after Start Date");
        return;
      }
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        setEndDateError("Event End Date cannot be in the Past");
        return;
      }
    }

    setEndDateError(null);
  };

  // Budget validation handlers (Numbers only)
  const preventNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-", "."].includes(e.key) && e.currentTarget.type === "number") {
      e.preventDefault();
    }
  };

  const handleMinBudgetChange = (val: string) => {
    // Keep only numbers
    const cleanVal = val.replace(/\D/g, "");
    setBudgetMin(cleanVal);
    if (!cleanVal) {
      setMinBudgetError(null);
      return;
    }
    const num = parseInt(cleanVal, 10);
    if (isNaN(num) || num <= 0) {
      setMinBudgetError("Minimum budget must be greater than ₹0.");
    } else {
      setMinBudgetError(null);
      if (budgetMax) {
        const maxNum = parseInt(budgetMax, 10);
        if (!isNaN(maxNum) && maxNum < num) {
          setMaxBudgetError("Maximum budget must be greater than or equal to minimum budget.");
        } else {
          setMaxBudgetError(null);
        }
      }
    }
  };

  const handleMaxBudgetChange = (val: string) => {
    // Keep only numbers
    const cleanVal = val.replace(/\D/g, "");
    setBudgetMax(cleanVal);
    if (!cleanVal) {
      setMaxBudgetError(null);
      return;
    }
    const num = parseInt(cleanVal, 10);
    const minNum = parseInt(budgetMin, 10);
    if (isNaN(num) || num <= 0) {
      setMaxBudgetError("Maximum budget must be greater than ₹0.");
    } else if (!isNaN(minNum) && num < minNum) {
      setMaxBudgetError("Maximum budget must be greater than or equal to minimum budget.");
    } else {
      setMaxBudgetError(null);
    }
  };

  const validateForm = () => {
    let isValid = true;
    setErrorMsg(null);

    // Title
    if (!title.trim()) {
      setTitleError("Project title is required.");
      isValid = false;
    } else {
      setTitleError(null);
    }

    // Category
    if (!categoryId) {
      setCategoryError("Please select a service category.");
      isValid = false;
    } else {
      setCategoryError(null);
    }

    // Start Date
    if (startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(startDate);
      if (selected < today) {
        setStartDateError("Event Start Date cannot be in the Past");
        isValid = false;
      } else {
        setStartDateError(null);
      }
    }

    // End Date (Optional)
    if (endDate && startDate) {
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      if (endD < startD) {
        setEndDateError("Event End Date must be on or after Start Date");
        isValid = false;
      } else {
        setEndDateError(null);
      }
    }

    // Minimum Budget
    const min = parseInt(budgetMin, 10);
    if (!budgetMin.trim()) {
      setMinBudgetError("Minimum budget is required in numbers.");
      isValid = false;
    } else if (isNaN(min) || min <= 0) {
      setMinBudgetError("Minimum budget must be greater than ₹0.");
      isValid = false;
    } else {
      setMinBudgetError(null);
    }

    // Maximum Budget
    const max = parseInt(budgetMax, 10);
    if (!budgetMax.trim()) {
      setMaxBudgetError("Maximum budget is required in numbers.");
      isValid = false;
    } else if (isNaN(max) || max <= 0) {
      setMaxBudgetError("Maximum budget must be greater than ₹0.");
      isValid = false;
    } else if (!isNaN(min) && max < min) {
      setMaxBudgetError("Maximum budget must be greater than or equal to minimum budget.");
      isValid = false;
    } else {
      setMaxBudgetError(null);
    }

    // Description
    if (!description.trim()) {
      setDescError("Project description brief is required.");
      isValid = false;
    } else if (description.trim().length < 20) {
      setDescError("Please provide a more descriptive brief (at least 20 characters).");
      isValid = false;
    } else {
      setDescError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) {
      setErrorMsg("Please resolve the highlighted validation errors before submitting.");
      return;
    }

    const min = parseInt(budgetMin, 10);
    const max = parseInt(budgetMax, 10);

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const timelineStr = endDate ? `${startDate} to ${endDate}` : startDate;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        project_type: projectType,
        budget_min: min,
        budget_max: max,
        category_id: parseInt(categoryId, 10),
        deadline: timelineStr || undefined,
        city: projectType !== "REMOTE" ? city.trim() : undefined,
        state: projectType !== "REMOTE" ? state.trim() : undefined,
        country: projectType !== "REMOTE" ? country.trim() : undefined,
      };

      await projectService.createProject(payload);
      setShowSuccessModal(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to publish project brief. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-8 max-w-3xl pb-16">
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface border border-border-custom max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider">Project Submitted</h3>
            <p className="text-xs text-text-sub leading-relaxed">
              Our team will review your requirement and begin matching a suitable verified professional.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/client/projects");
              }}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Go to My Projects
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Back Link */}
        <Link href="/client/projects" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-sub hover:text-text-main transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <PageHeader
          title="Post a Project Requirement"
          description="From an Idea to the Final Cut"
        />

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          {/* Project Title */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Project Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setTitleError(null);
              }}
              placeholder="e.g. Cinematic Wedding Video Editor"
              className={`w-full bg-surface border rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none transition ${
                titleError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-primary"
              }`}
            />
            {titleError && (
              <p className="text-[10px] text-rose-500 font-semibold mt-1">{titleError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Service Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (e.target.value) setCategoryError(null);
                }}
                className={`w-full bg-surface border rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none transition ${
                  categoryError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-primary"
                }`}
              >
                <option value="">Select a Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categoryError && (
                <p className="text-[10px] text-rose-500 font-semibold mt-1">{categoryError}</p>
              )}
            </div>

            {/* Work Mode */}
            <div className="space-y-1.5">
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
          </div>

          {/* Two Date Fields: Event Start Date & Optional Event End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Start Date */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Event Start Date</label>
              <input
                type="date"
                min={todayStr}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                onBlur={(e) => handleStartDateChange(e.target.value)}
                className={`w-full bg-surface border rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none transition ${
                  startDateError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-primary"
                }`}
              />
              {startDateError && (
                <p className="text-[10px] text-rose-500 font-semibold mt-1">{startDateError}</p>
              )}
            </div>

            {/* Event End Date (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">
                Event End Date <span className="text-text-muted font-normal normal-case">(Optional)</span>
              </label>
              <input
                type="date"
                min={startDate || todayStr}
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                onBlur={(e) => handleEndDateChange(e.target.value)}
                className={`w-full bg-surface border rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none transition ${
                  endDateError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-primary"
                }`}
              />
              {endDateError && (
                <p className="text-[10px] text-rose-500 font-semibold mt-1">{endDateError}</p>
              )}
            </div>
          </div>

          {/* Budget Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Min Budget */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Minimum Budget (INR) *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={budgetMin}
                onKeyDown={preventNonNumericKeys}
                onChange={(e) => handleMinBudgetChange(e.target.value)}
                onBlur={(e) => handleMinBudgetChange(e.target.value)}
                placeholder="₹ Min budget"
                className={`w-full bg-surface border rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none transition ${
                  minBudgetError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-primary"
                }`}
              />
              {minBudgetError && (
                <p className="text-[10px] text-rose-500 font-semibold mt-1">{minBudgetError}</p>
              )}
            </div>

            {/* Max Budget */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Maximum Budget (INR) *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={budgetMax}
                onKeyDown={preventNonNumericKeys}
                onChange={(e) => handleMaxBudgetChange(e.target.value)}
                onBlur={(e) => handleMaxBudgetChange(e.target.value)}
                placeholder="₹ Max budget"
                className={`w-full bg-surface border rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none transition ${
                  maxBudgetError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-primary"
                }`}
              />
              {maxBudgetError && (
                <p className="text-[10px] text-rose-500 font-semibold mt-1">{maxBudgetError}</p>
              )}
            </div>
          </div>

          {/* Location details for On-Site or Hybrid */}
          {projectType !== "REMOTE" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface p-4 border border-border-custom rounded-2xl animate-in slide-in-from-top-4 duration-200">
              <div className="space-y-1.5">
                <label className="block text-[9px] text-text-sub font-bold uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] text-text-sub font-bold uppercase tracking-wider">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider">Project Brief / Description *</label>
            <textarea
              required
              rows={6}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim().length >= 20) setDescError(null);
              }}
              placeholder="Outline project instructions, creative styles, technical references, and what you expect as the final deliverable."
              className={`w-full bg-surface border rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none font-normal leading-relaxed transition ${
                descError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-primary"
              }`}
            />
            {descError && (
              <p className="text-[10px] text-rose-500 font-semibold mt-1">{descError}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-text-main text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {submitting ? "Submitting Requirement..." : "Post Project Brief"}
          </button>
        </form>
      </div>
    </Container>
  );
}
