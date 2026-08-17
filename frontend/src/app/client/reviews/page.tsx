"use client";

import React, { useState, useEffect } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import ReviewCard from "@/components/reviews/ReviewCard";
import StarRating from "@/components/reviews/StarRating";
import { reviewService } from "@/services/review.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

export default function ClientReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editing review modal state
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState("");
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const list = await reviewService.getClientReviews();
      setReviews(list);
    } catch (err) {
      console.error("Failed to load client reviews", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleEditClick = (review: any) => {
    setEditingReview(review);
    setEditRating(review.overall_rating);
    setEditTitle(review.title || "");
    setEditComment(review.comment);
    setErrorMsg(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editComment.length < 20) {
      setErrorMsg("Your comment must be at least 20 characters.");
      return;
    }

    try {
      setSaving(true);
      const updated = await reviewService.editReview(editingReview.id, {
        overall_rating: editRating,
        title: editTitle.trim() || undefined,
        comment: editComment,
      });

      // Update reviews list locally
      setReviews((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      setEditingReview(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSuccess = (id: number) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return <LoadingState message="Loading your submitted reviews..." />;
  }

  return (
    <Container className="py-12">
      <div className="space-y-8">
        <PageHeader
          title="Submitted Reviews"
          description="View and manage the ratings and feedback you have posted for completed bookings."
        />

        {reviews.length === 0 ? (
          <EmptyState
            title="No reviews posted yet"
            description="Completed bookings will appear in your history, where you can leave verified feedback."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 max-w-3xl">
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                clientMode={true}
                onEdit={handleEditClick}
                onDeleteSuccess={handleDeleteSuccess}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface-elevated border border-border-custom rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-6 shadow-xl relative animate-fade-in">
            <button
              onClick={() => setEditingReview(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                Edit Feedback
              </span>
              <h3 className="text-base font-semibold text-text-main">Update Your Review</h3>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="flex items-center justify-between bg-surface p-4 border border-border-custom rounded-2xl">
                <span className="text-xs font-semibold text-text-sub">Overall Rating</span>
                <StarRating rating={editRating} interactive size="md" onChange={setEditRating} />
              </div>

              <div>
                <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-main focus:outline-none placeholder-text-muted"
                />
              </div>

              <div>
                <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">
                  Comment (min 20 chars)
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={20}
                  maxLength={3000}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none placeholder-text-muted resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-5 py-2.5 bg-surface border border-border-custom text-xs font-bold rounded-full text-text-sub hover:text-text-main transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-xs font-bold rounded-full text-text-on-dark transition cursor-pointer"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Container>
  );
}
