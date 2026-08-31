"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, getMediaUrl } from "@/lib/api";

interface MatchedCreator {
  id: number;
  user_id: number;
  professional_title: string | null;
  full_name: string;
}

interface ProjectDetail {
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
  client_id: number;
  booking_id: number | null;
  booking_number: string | null;
  matched_freelancer: MatchedCreator | null;
  admin_review_notes: string | null;
  admin_conversation_id: number | null;
  created_at: string;
}

interface FreelancerSearchItem {
  id: number;
  user_id: number;
  full_name: string;
  professional_title: string;
  city: string;
  average_rating: number | null;
  starting_price: string | null;
  profile_photo_url: string | null;
  verification_status: string;
}

interface BookingAssignmentOut {
  id: number;
  status: string;
  assignment_round: number;
  offered_payout_amount: string;
  decline_reason: string | null;
  counter_offer_amount: string | null;
  counter_offer_notes: string | null;
  is_replacement: boolean;
  client_approval_required: boolean;
  client_approval_status: string;
  created_at: string;
  freelancer_profile?: {
    full_name: string;
  };
}

interface BookingDetail {
  id: number;
  booking_number: string;
  assignments: BookingAssignmentOut[];
}

export default function AdminProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  // Project states
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Converted Booking assignment history states
  const [bookingDetails, setBookingDetails] = useState<BookingDetail | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Freelancer search states
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [professionFilter, setProfessionFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [freelancersList, setFreelancersList] = useState<FreelancerSearchItem[]>([]);
  const [loadingFreelancers, setLoadingFreelancers] = useState<boolean>(false);

  // Match submission states
  const [selectedCreator, setSelectedCreator] = useState<FreelancerSearchItem | null>(null);
  const [offeredPayout, setOfferedPayout] = useState<string>("");
  const [matchNotes, setMatchNotes] = useState<string>("");
  const [matching, setMatching] = useState<boolean>(false);

  const fetchProjectDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ProjectDetail>(`/admin/projects/${id}`);
      setProject(data);
      if (data.admin_review_notes) {
        setReviewNotes(data.admin_review_notes);
      }

      // If project has converted booking, fetch assignment history from booking detail
      if (data.booking_id) {
        fetchBookingHistory(data.booking_id);
      }
    } catch (err: any) {
      setError(err.message || "We couldn't load project details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingHistory = async (bookingId: number) => {
    setLoadingHistory(true);
    try {
      const details = await api.get<BookingDetail>(`/admin/bookings/${bookingId}`);
      setBookingDetails(details);
    } catch (err) {
      console.error("Error loading linked booking assignment logs:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProjectDetail();
    }
  }, [id]);

  // Search Freelancers Directory
  const fetchFreelancers = async () => {
    setLoadingFreelancers(true);
    try {
      const params: Record<string, string> = { page_size: "100" };
      if (professionFilter) params["profession"] = professionFilter;
      if (cityFilter.trim()) params["city"] = cityFilter.trim();

      const data = await api.get<FreelancerSearchItem[]>("/freelancers", { params });
      setFreelancersList(data);
    } catch (err) {
      console.error("Error loading creators:", err);
    } finally {
      setLoadingFreelancers(false);
    }
  };

  useEffect(() => {
    if (searchModalOpen) {
      fetchFreelancers();
    }
  }, [searchModalOpen, professionFilter, cityFilter]);

  const handleReviewStatusTransition = async (targetStatus: string) => {
    if (!id || submittingReview) return;
    setSubmittingReview(true);
    try {
      await api.post(`/admin/projects/${id}/review`, {
        status: targetStatus,
        admin_review_notes: reviewNotes.trim()
      });
      await fetchProjectDetail();
    } catch (err: any) {
      alert(err.message || "Failed to update review status.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMatchFreelancerSubmit = async () => {
    if (!id || !selectedCreator || matching) return;
    setMatching(true);
    try {
      await api.post(`/admin/projects/${id}/match`, {
        freelancer_profile_id: selectedCreator.id,
        offered_payout_amount: parseFloat(offeredPayout) || null,
        admin_notes: matchNotes.trim()
      });
      setSelectedCreator(null);
      setOfferedPayout("");
      setMatchNotes("");
      setSearchModalOpen(false);
      await fetchProjectDetail();
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        alert("This project was updated. Loading the latest status.");
        await fetchProjectDetail();
      } else {
        alert(err.message || "Failed to assign candidate offer.");
      }
    } finally {
      setMatching(false);
    }
  };

  const selectCandidateForMatch = (creator: FreelancerSearchItem) => {
    setSelectedCreator(creator);
    // Auto-calculate default offered rate (default 75% of project budget)
    const suggested = project?.budget
      ? (parseFloat(project.budget) * 0.75).toFixed(0)
      : "0";
    setOfferedPayout(suggested);
  };

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

  // Filter local search results in memory
  const filteredCreators = freelancersList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.professional_title && c.professional_title.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="p-8 bg-background min-h-screen text-text-main space-y-6 animate-pulse">
        <div className="h-8 bg-surface-elevated rounded-xl w-1/4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-surface-elevated rounded-3xl"></div>
          <div className="h-96 bg-surface-elevated rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 bg-background min-h-screen text-text-main flex flex-col justify-center items-center gap-4">
        <div className="bg-rose-955/35 border border-rose-900/50 text-rose-200 p-6 rounded-3xl max-w-md text-center">
          <p className="text-sm font-semibold">{error || "Project post details not found."}</p>
        </div>
        <Link
          href="/admin/job-posts"
          className="px-6 py-2.5 bg-surface text-text-main border border-border-custom rounded-full text-xs font-semibold hover:bg-surface-elevated transition-all"
        >
          Back to Job Posts
        </Link>
      </div>
    );
  }

  const projectRef = `PRJ-${String(project.id).padStart(6, "0")}`;

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-custom pb-6">
        <div>
          <Link href="/admin/job-posts" className="text-text-muted hover:text-primary text-xs font-semibold">
            ← Back to Job Posts
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              {project.title}
            </h1>
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {project.status.replace(/_/g, " ").toLowerCase()}
            </span>
            <span className="text-[10px] bg-surface border border-border-custom text-text-sub px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {projectRef}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Brief details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Project Summary Card */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3">
              Project Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Client</span>
                <p className="text-text-main">{project.client_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Client Preference</span>
                <p className="text-text-main font-bold italic text-primary">Open to Admin Matching</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Project Category</span>
                <p className="text-text-main capitalize">{project.category.replace(/_/g, " ").toLowerCase()}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Delivery Target Date</span>
                <p className="text-text-main">{formatDate(project.deadline)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Budget agreed</span>
                <p className="text-text-main text-sm font-bold">{formatCurrency(project.budget)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Type</span>
                <p className="text-text-main font-semibold uppercase">{project.project_type || "REMOTE"}</p>
              </div>
            </div>
          </div>

          {/* Description & Requirement Card */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3">
              Client Requirement
            </h3>
            <div className="text-xs space-y-4 font-medium leading-relaxed">
              <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider block">
                Requirement Details
              </span>
              <p className="text-text-main bg-surface/50 border border-border-custom/50 p-4 rounded-2xl whitespace-pre-wrap">
                {project.description || "No project requirement details provided."}
              </p>
            </div>
          </div>

          {/* Converted Booking Assignment logs history */}
          {bookingDetails && (
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-border-custom/50 pb-3">
                <h3 className="text-base font-bold text-text-main">
                  Matching Assignment History
                </h3>
                <Link
                  href={`/admin/bookings/${bookingDetails.id}`}
                  className="text-primary hover:text-primary-hover text-[10px] font-bold uppercase tracking-wider"
                >
                  View Full Booking Control Center
                </Link>
              </div>

              {loadingHistory ? (
                <div className="text-center py-6 text-xs text-text-muted">Loading assignment rounds...</div>
              ) : bookingDetails.assignments && bookingDetails.assignments.length > 0 ? (
                <div className="space-y-3 font-semibold text-xs">
                  {bookingDetails.assignments.map((a) => (
                    <div key={a.id} className="border border-border-custom bg-surface/40 p-4 rounded-2xl flex justify-between items-center gap-4">
                      <div>
                        <p className="text-text-main font-bold">Round #{a.assignment_round} Offers</p>
                        <p className="text-text-sub mt-0.5">Professional: {a.freelancer_profile?.full_name}</p>
                        <p className="text-[10px] text-text-muted mt-1">Budget offered: {formatCurrency(a.offered_payout_amount)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          a.status === "OFFERED"
                            ? "bg-amber-950/40 text-amber-300 border border-amber-900/30"
                            : a.status === "ACCEPTED"
                            ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/30"
                            : "bg-rose-950/40 text-rose-300 border border-rose-900/30"
                        }`}>
                          {a.status}
                        </span>
                        {a.decline_reason && (
                          <p className="text-[10px] text-rose-300 italic mt-1.5">Reason: "{a.decline_reason}"</p>
                        )}
                        {a.counter_offer_amount && (
                          <p className="text-[10px] text-amber-300 font-bold mt-1">Counter: {formatCurrency(a.counter_offer_amount)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-sub text-xs bg-surface/20 border border-dashed border-border-custom rounded-2xl">
                  No matches have been proposed yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Actions side panel */}
        <div className="space-y-8">
          
          {/* Admin Matching Operations */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3 font-semibold">
              Curation Review & Matching
            </h3>

            {/* Submitted stage */}
            {project.status === "SUBMITTED" && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="bg-amber-950/20 border border-amber-900/30 text-amber-200 p-4 rounded-2xl">
                  <p>New project posts submitted by Client. Initiate review transition.</p>
                </div>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Review observations..."
                  className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-2xl p-3 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted"
                ></textarea>
                <button
                  onClick={() => handleReviewStatusTransition("UNDER_ADMIN_REVIEW")}
                  disabled={submittingReview}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition-all cursor-pointer"
                >
                  Start Review
                </button>
              </div>
            )}

            {/* Under Review Stage */}
            {project.status === "UNDER_ADMIN_REVIEW" && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="bg-blue-950/20 border border-blue-900/30 text-blue-200 p-4 rounded-2xl">
                  <p>Project is currently under administrative review stage.</p>
                </div>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Additional curation notes..."
                  className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-2xl p-3 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted"
                ></textarea>
                <button
                  onClick={() => handleReviewStatusTransition("MATCHING")}
                  disabled={submittingReview}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition-all cursor-pointer"
                >
                  Start Creator Matching
                </button>
              </div>
            )}

            {/* Matching Stage */}
            {project.status === "MATCHING" && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-2xl">
                  <p>Creator matching is active. Search the directory to propose a professional candidate.</p>
                </div>
                <button
                  onClick={() => setSearchModalOpen(true)}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition-all cursor-pointer"
                >
                  Match Freelancer
                  </button>
              </div>
            )}

            {/* Converted Booking Stage */}
            {project.status === "BOOKING_CREATED" && project.booking_id && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 p-4 rounded-2xl">
                  <p className="font-bold">Project converted to Booking</p>
                  <p className="text-[10px] text-text-sub mt-1">Consequent matching actions are managed inside the booking control center.</p>
                </div>
                <Link
                  href={`/admin/bookings/${project.booking_id}`}
                  className="w-full py-2.5 bg-surface hover:bg-surface-elevated text-text-main border border-border-custom text-xs font-bold rounded-full transition-all text-center block"
                >
                  Open Booking Control Center
                </Link>
              </div>
            )}
          </div>

          {/* Client Communication Redirection (Part 11, 12) */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3">
              Curation Communication
            </h3>
            <div className="space-y-3 font-semibold">
              <p className="text-text-sub text-[10px]">Mediated client support chats are segmented under PROJECT context.</p>
              {project.admin_conversation_id ? (
                <Link
                  href={`/admin/messages?conversation=${project.admin_conversation_id}`}
                  className="w-full py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider text-center block"
                >
                  Message Client
                </Link>
              ) : (
                <div className="p-3 bg-surface/30 border border-border-custom/50 rounded-xl text-[10px] text-text-muted italic text-center font-medium">
                  Client mediated conversation not created.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Matching directory search modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-border-custom rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border-custom pb-4">
              <div>
                <h3 className="text-lg font-bold text-text-main">Select Match Candidate</h3>
                <p className="text-xs text-text-sub">Search and select professional profiles to match against project brief requirements.</p>
              </div>
              <button
                onClick={() => {
                  setSearchModalOpen(false);
                  setSelectedCreator(null);
                }}
                className="text-text-sub hover:text-text-main font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Search by name or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <select
                value={professionFilter}
                onChange={(e) => setProfessionFilter(e.target.value)}
                className="bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">All Professions</option>
                <option value="PHOTOGRAPHER">Photographer</option>
                <option value="VIDEOGRAPHER">Videographer</option>
                <option value="EDITOR">Editor</option>
                <option value="DJ">DJ / Sound Mixer</option>
                <option value="DECORATOR">Decorator</option>
              </select>
              <input
                type="text"
                placeholder="Filter by city..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Directory Profiles List */}
            <div className="flex-grow overflow-y-auto min-h-0 space-y-3 bg-surface/50 border border-border-custom p-4 rounded-2xl">
              {loadingFreelancers ? (
                <div className="text-center py-12 text-xs text-text-muted">Loading directory profiles...</div>
              ) : filteredCreators.length > 0 ? (
                filteredCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="bg-surface-elevated border border-border-custom/80 hover:border-primary/50 p-4 rounded-2xl flex justify-between items-center gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface border border-border-custom overflow-hidden flex items-center justify-center text-xs font-bold text-text-muted">
                        {creator.profile_photo_url ? (
                          <img src={getMediaUrl(creator.profile_photo_url)} alt={creator.full_name} className="w-full h-full object-cover" />
                        ) : (
                          creator.full_name[0]
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-text-main">{creator.full_name}</h4>
                          <span className={`text-[8px] px-1.5 py-0.1 border rounded uppercase tracking-wider font-bold ${
                            creator.verification_status === "VERIFIED"
                              ? "bg-emerald-950/45 border-emerald-800/40 text-emerald-400"
                              : "bg-surface border-border-custom text-text-muted"
                          }`}>
                            {creator.verification_status}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-sub font-semibold">{creator.professional_title}</p>
                        <p className="text-[9px] text-text-muted mt-0.5">Location: {creator.city} • Rating: {creator.average_rating || "N/A"} ★</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {creator.starting_price && (
                        <p className="text-[10px] font-bold text-text-main mb-1.5">From {formatCurrency(creator.starting_price)}</p>
                      )}
                      <button
                        onClick={() => selectCandidateForMatch(creator)}
                        className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                      >
                        Match creator
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-xs text-text-muted italic">
                  No professional profiles match filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Match confirmation panel with client approvals warnings (Part 18, 20) */}
      {selectedCreator && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-border-custom rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Confirm proposed Match</h3>
              <p className="text-xs text-text-sub mt-0.5">Confirm candidate offered payout rate before sending brief assignment.</p>
            </div>

            <div className="bg-surface p-4 border border-border-custom rounded-2xl text-xs font-semibold space-y-2">
              <div className="flex justify-between">
                <span className="text-text-sub">Candidate Profile:</span>
                <span className="text-text-main">{selectedCreator.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-sub">Profession:</span>
                <span className="text-text-main">{selectedCreator.professional_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-sub">Location:</span>
                <span className="text-text-main">{selectedCreator.city}</span>
              </div>
            </div>

            {/* Warning Client approval block (Part 20) */}
            <div className="bg-amber-955/20 border border-amber-900/30 text-amber-300 p-4 rounded-2xl text-[11px] font-medium leading-relaxed space-y-1">
              <p className="font-bold text-[10px] uppercase tracking-wide">⚠️ Client Approval Required</p>
              <p className="text-text-sub">This matches will create a proposed assignment offer. Client approval will be required to activate final booking.</p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Offered Payout Rate (₹)</label>
              <input
                type="number"
                value={offeredPayout}
                onChange={(e) => setOfferedPayout(e.target.value)}
                placeholder="Enter offered payout amount..."
                className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-2xl px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Administrative match notes</label>
              <textarea
                rows={2}
                value={matchNotes}
                onChange={(e) => setMatchNotes(e.target.value)}
                placeholder="Negotiations notes, details, terms..."
                className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-2xl p-3 focus:ring-1 focus:ring-primary focus:outline-none"
              ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedCreator(null)}
                className="flex-1 py-2.5 border border-border-custom hover:bg-surface text-text-main text-xs font-bold rounded-full transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMatchFreelancerSubmit}
                disabled={matching}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {matching ? "Matching..." : "Send Match Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
