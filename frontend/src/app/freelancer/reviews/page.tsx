"use client";

import React, { useState, useEffect } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import StarRating from "@/components/reviews/StarRating";
import ReviewCard from "@/components/reviews/ReviewCard";
import RatingDistribution from "@/components/reviews/RatingDistribution";
import { TrustBadgeList } from "@/components/trust/TrustBadge";
import { reviewService } from "@/services/review.service";
import { freelancerService } from "@/services/freelancer.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

export default function FreelancerReviewsDashboard() {
  const [profile, setProfile] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch freelancer profile for stats & badges
      const prof = await freelancerService.getProfile();
      setProfile(prof);

      // Fetch received reviews
      const reviewList = await reviewService.getFreelancerReviews();
      setReviews(reviewList);
    } catch (err) {
      console.error("Failed to load freelancer reviews dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleReplySuccess = (reviewId: number, responseText: string) => {
    // Update local state to show the reply immediately
    setReviews((prevReviews) =>
      prevReviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              response_obj: {
                id: Date.now(), // temporary id
                review_id: reviewId,
                freelancer_profile_id: profile?.id || 0,
                response: responseText,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }
          : r
      )
    );
  };

  if (loading) {
    return <LoadingState message="Loading your reputation dashboard..." />;
  }

  return (
    <Container className="py-12">
      <div className="space-y-8">
        <PageHeader
          title="Reviews & Reputation"
          description="Manage client feedback, view your trust badges, and respond to public reviews."
        />

        {profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side column: Stats & badges */}
            <div className="space-y-6">
              {/* Rating Summary Card */}
              <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm text-center space-y-4">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                  Overall Rating
                </span>
                
                <div className="space-y-1">
                  <div className="text-5xl font-black text-text-main">
                    {profile.average_rating ? profile.average_rating.toFixed(2) : "0.00"}
                  </div>
                  <div className="flex justify-center mt-2">
                    <StarRating rating={profile.average_rating || 0} size="md" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border-custom/50 pt-4 text-xs font-semibold">
                  <div>
                    <span className="text-text-muted block">Total Reviews</span>
                    <strong className="text-text-main text-sm font-bold">{profile.review_count}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block">Completed Jobs</span>
                    <strong className="text-text-main text-sm font-bold">{profile.completed_jobs_count}</strong>
                  </div>
                </div>
              </div>

              {/* Trust Badges Card */}
              <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Earned Trust Badges</h3>
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                    Badges are evaluated automatically based on verification status and completed job performance.
                  </p>
                </div>

                {profile.trust_badges && profile.trust_badges.length > 0 ? (
                  <div className="pt-2">
                    <TrustBadgeList badges={profile.trust_badges} />
                  </div>
                ) : (
                  <span className="text-xs text-text-muted block pt-2">No trust badges earned yet.</span>
                )}
              </div>

              {/* Rating breakdown chart */}
              <RatingDistribution reviews={reviews} />
            </div>

            {/* Right side column: Reviews List */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-base font-bold text-text-main">Received Reviews ({reviews.length})</h2>

              {reviews.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="When clients review your completed bookings, their feedback and ratings will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      freelancerMode={true}
                      onReplySuccess={handleReplySuccess}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
