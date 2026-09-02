"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { reviewService } from "@/services/review.service";
import { bookingService } from "@/services/booking.service";
import { Star, MessageSquare, CheckCircle, Calendar, Sparkles, AlertCircle, Trash2 } from "lucide-react";

export default function ClientReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Leave Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Review Modal States
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const [reviewsData, bookingsData] = await Promise.all([
        reviewService.getClientReviews(),
        bookingService.getClientBookings()
      ]);
      
      setReviews(reviewsData);
      setBookings(bookingsData);
    } catch (err) {
      setErrorMsg("We couldn't load your review dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter completed bookings that do not have reviews yet (Part 5)
  const pendingReviews = bookings.filter((b) => {
    if (b.status !== "COMPLETED") return false;
    // Check if there is already a review matching booking.id
    return !reviews.some((r) => r.booking_id === b.id);
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating < 1 || overallRating > 5) {
      alert("Please select a rating between 1 and 5 stars.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        overall_rating: overallRating,
        comment: reviewComment.trim() || "", // Comment is optional (Part 8)
      };

      await reviewService.submitReview(activeBooking.id, payload);
      
      setShowReviewModal(false);
      setOverallRating(0);
      setReviewComment("");
      await loadData();
      alert("Thank you! Your review has been submitted successfully.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editRating < 1 || editRating > 5) {
      alert("Please select a rating between 1 and 5 stars.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      await reviewService.editReview(editingReview.id, {
        overall_rating: editRating,
        comment: editComment.trim() || "",
      });

      setEditingReview(null);
      await loadData();
      alert("Review updated successfully.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update review.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this review?")) {
      return;
    }
    try {
      setLoading(true);
      await reviewService.deleteReview(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete review.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-transparent py-10 px-4 md:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="bg-surface/80 border border-white/10 rounded-3xl p-6 h-32 flex flex-col justify-between">
            <div className="w-1/3 h-5 bg-surface-elevated/80 rounded"></div>
            <div className="w-1/2 h-3 bg-surface-elevated/80 rounded"></div>
          </div>
          <div className="h-48 bg-surface/80 rounded-3xl border border-white/10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-surface/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">Reviews</h1>
            <p className="text-text-sub text-xs mt-1">
              Rate professionals you've worked with and view your previous reviews.
            </p>
          </div>
          <Link
            href="/client/bookings?status=COMPLETED"
            className="text-xs uppercase tracking-widest font-bold text-text-sub hover:text-primary flex items-center gap-2 group transition"
          >
            Dashboard →
          </Link>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Submitted Reviews History (Part 13) */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-6">
          <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Review History</h3>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((r) => {
                const professionalName = r.freelancer_profile?.user?.full_name || "Specialist";
                return (
                  <div
                    key={r.id}
                    className="border border-border-custom/50 rounded-2xl p-5 bg-surface-elevated/10 space-y-4 relative"
                  >
                    {/* Delete and Edit action controls */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => {
                          setEditingReview(r);
                          setEditRating(r.overall_rating);
                          setEditComment(r.comment || "");
                        }}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteReview(r.id)}
                        className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3.5 h-3.5 ${
                              idx < r.overall_rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-text-muted"
                            }`}
                          />
                        ))}
                      </div>

                      <h4 className="font-extrabold text-sm text-text-main mt-1">
                        Review for {professionalName}
                      </h4>
                      
                      <div className="flex items-center gap-2 text-[9px] text-text-muted font-bold font-mono">
                        <span>Reference: Booking #{r.booking_id}</span>
                        <span>•</span>
                        <span>Date: {new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>

                    {r.comment && (
                      <p className="text-xs text-text-sub leading-relaxed font-medium">
                        "{r.comment}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-text-muted bg-surface-elevated/10 border border-border-custom/40 rounded-2xl italic">
              You haven't posted any reviews yet.
            </div>
          )}
        </div>

      </div>

      {/* Leave Review Dialog Modal */}
      {showReviewModal && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <form onSubmit={handleSubmitReview} className="bg-surface border border-border-custom max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-text-main uppercase tracking-wider">Leave Feedback</h3>
            
            <div className="space-y-3">
              <div className="border border-border-custom/50 rounded-xl p-3 bg-surface-elevated/20 text-xs">
                <span className="text-[8px] font-bold text-text-muted block uppercase">Booking</span>
                <span className="font-bold text-text-main">{activeBooking.title}</span>
                <span className="text-[9px] text-text-sub block mt-1">
                  Professional: {activeBooking.freelancer?.full_name || activeBooking.freelancer?.user?.full_name || "Specialist"}
                </span>
              </div>

              {/* Star rating selector (Part 7) */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1.5">Rating (Required)</label>
                <div className="flex gap-2 items-center">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const stars = idx + 1;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setOverallRating(stars)}
                        className="text-text-muted hover:text-amber-400 cursor-pointer focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition ${
                            stars <= overallRating ? "fill-amber-400 text-amber-400" : "text-text-muted"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Comment textarea (Part 8) */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1">
                  Share your experience (optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about the project quality, responsiveness, or timeline..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setOverallRating(0);
                  setReviewComment("");
                }}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={submitting || overallRating === 0}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-lg transition"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Review Dialog Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <form onSubmit={handleEditSubmit} className="bg-surface border border-border-custom max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-text-main uppercase tracking-wider">Edit Review</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1.5">Rating (Required)</label>
                <div className="flex gap-2 items-center">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const stars = idx + 1;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setEditRating(stars)}
                        className="text-text-muted hover:text-amber-400 cursor-pointer focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition ${
                            stars <= editRating ? "fill-amber-400 text-amber-400" : "text-text-muted"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1">
                  Share your experience (optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about the project quality, responsiveness, or timeline..."
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
