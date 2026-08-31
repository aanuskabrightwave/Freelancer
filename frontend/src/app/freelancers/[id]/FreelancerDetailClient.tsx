"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMediaUrl } from "@/lib/api";
import { freelancerService } from "@/services/freelancer.service";
import FavouriteButton from "@/components/favourites/FavouriteButton";
import { TrustBadgeList } from "@/components/trust/TrustBadge";
import StarRating from "@/components/reviews/StarRating";
import ReviewCard from "@/components/reviews/ReviewCard";
import RatingDistribution from "@/components/reviews/RatingDistribution";
import { reviewService } from "@/services/review.service";
import { messageService } from "@/services/message.service";
import Container from "@/components/ui/Container";
import { useAuth } from "@/context/AuthContext";
import BookProfessionalModal from "@/components/common/BookProfessionalModal";

const PROFESSION_LABELS: Record<string, string> = {
  PHOTOGRAPHER: "Photographer",
  VIDEOGRAPHER: "Videographer",
  VIDEO_EDITOR: "Video Editor",
  PHOTO_EDITOR: "Photo Editor",
  CINEMATOGRAPHER: "Cinematographer",
  DRONE_OPERATOR: "Drone Operator",
  REEL_EDITOR: "Reel Editor",
  MOTION_GRAPHICS_ARTIST: "Motion Graphics Artist",
  COLOR_GRADER: "Color Grader",
  OTHER: "Other",
};

export default function FreelancerDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any | null>(null);
  const isOwnProfile = user && profile && user.id === profile.user_id;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [allReviewsForDistribution, setAllReviewsForDistribution] = useState<any[]>([]); 
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsRating, setReviewsRating] = useState<number | undefined>(undefined);
  const [reviewsSort, setReviewsSort] = useState("newest");
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!id) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await freelancerService.getFreelancerById(id as string);
        setProfile(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setErrorMsg("The requested freelancer profile was not found or is currently private.");
        } else {
          setErrorMsg("Failed to retrieve profile data.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [id]);

  // Load reviews list when filters or page change
  useEffect(() => {
    async function loadReviewsList() {
      if (!id) return;
      try {
        setLoadingReviews(true);
        const data = await reviewService.getPublicFreelancerReviews(id as string, {
          page: reviewsPage,
          page_size: 10,
          rating: reviewsRating,
          sort: reviewsSort,
        });
        
        if (reviewsPage === 1) {
          setReviews(data);
        } else {
          setReviews((prev) => [...prev, ...data]);
        }
        
        if (data.length < 10) {
          setHasMoreReviews(false);
        } else {
          setHasMoreReviews(true);
        }
      } catch (err) {
        console.error("Failed to load reviews list", err);
      } finally {
        setLoadingReviews(false);
      }
    }
    loadReviewsList();
  }, [id, reviewsPage, reviewsRating, reviewsSort]);

  // Load all reviews (unfiltered) once to populate distribution bars
  useEffect(() => {
    async function loadAllReviewsForDistribution() {
      if (!id) return;
      try {
        const data = await reviewService.getPublicFreelancerReviews(id as string, {
          page: 1,
          page_size: 100,
        });
        setAllReviewsForDistribution(data);
      } catch (err) {
        console.error("Failed to load all reviews for distribution", err);
      }
    }
    loadAllReviewsForDistribution();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="min-h-screen bg-background text-text-main flex flex-col justify-center items-center px-6">
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-8 text-center max-w-md shadow-sm">
          <h2 className="text-xl font-semibold text-text-main mb-2">Profile Not Accessible</h2>
          <p className="text-text-sub text-sm mb-6">{errorMsg || "Could not retrieve details."}</p>
          <button 
            onClick={() => router.push("/freelancers")} 
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition cursor-pointer"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  const featuredPortfolio = profile.portfolio?.filter((p: any) => p.is_featured) || [];
  const standardPortfolio = profile.portfolio?.filter((p: any) => !p.is_featured) || [];

  return (
    <div className="min-h-screen bg-background text-text-main font-sans pb-24">
      
      {/* Cover Banner Image */}
      <div className="h-64 md:h-80 w-full bg-dark relative overflow-hidden">
        {profile.cover_photo_url ? (
          <img 
            src={getMediaUrl(profile.cover_photo_url)} 
            alt="Cover Banner" 
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-dark to-dark-soft opacity-65"></div>
        )}
      </div>

      <Container className="-mt-24 relative z-10">
        
        {/* Profile Overlay Card */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 w-full md:w-auto">
            
            {/* Profile Avatar Overlay */}
            <div className="w-32 h-32 rounded-full border-4 border-surface-elevated bg-surface flex-shrink-0 overflow-hidden shadow-md -mt-16 md:-mt-24">
              {profile.profile_photo_url ? (
                <img 
                  src={getMediaUrl(profile.profile_photo_url)} 
                  alt={profile.full_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted font-bold text-xs uppercase bg-surface">
                  Avatar
                </div>
              )}
            </div>

            <div className="text-center md:text-left space-y-2">
              <span className="px-3.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                {PROFESSION_LABELS[profile.primary_profession] || profile.primary_profession}
              </span>
              
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <h1 className="text-2xl md:text-3xl font-semibold text-text-main">{profile.full_name}</h1>
                {profile.verification_status === "VERIFIED" && (
                  <span className="text-success text-base font-bold" title="Verified Professional">✔</span>
                )}
              </div>

              <p className="text-text-sub text-sm font-medium">{profile.professional_title}</p>
              
              {profile.review_count > 0 && (
                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                  <StarRating rating={profile.average_rating || 0} size="xs" />
                  <span className="text-xs font-bold text-text-main">
                    {profile.average_rating ? profile.average_rating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    ({profile.review_count} {profile.review_count === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}

              <p className="text-xs text-text-muted">
                {profile.city}, {profile.state}, {profile.country} • {profile.experience_years} years experience
              </p>

              {profile.trust_badges && profile.trust_badges.length > 0 && (
                <div className="mt-3">
                  <TrustBadgeList badges={profile.trust_badges} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-1.5 border-t md:border-t-0 pt-4 md:pt-0 border-border-custom/50">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Starting Price</span>
            <span className="text-3xl font-bold text-text-main">
              {profile.starting_price ? `₹${parseInt(profile.starting_price).toLocaleString()}` : "On Quote"}
            </span>
            <div className="mt-2 w-full flex flex-col gap-2">
              {isOwnProfile ? (
                <button
                  onClick={() => router.push("/freelancer/profile/edit")}
                  className="w-full px-6 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition text-center"
                >
                  Edit Profile
                </button>
              ) : (
                <FavouriteButton targetId={profile.id} type="freelancer" label="Save Creator" />
              )}
            </div>
          </div>
        </div>

        {/* Two Column details layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main profile contents */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bio Card */}
            <div className="bg-surface-elevated border border-border-custom/60 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-text-main mb-4 uppercase tracking-wider text-[11px]">About Professional</h2>
              <p className="text-text-sub text-sm leading-relaxed whitespace-pre-line font-normal mb-6">{profile.bio}</p>
              
              {(profile.website || profile.instagram || profile.behance) && (
                <div className="flex flex-wrap gap-4 pt-4 border-t border-border-custom/50">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1.5">
                      🔗 Website
                    </a>
                  )}
                  {profile.instagram && (
                    <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1.5">
                      📸 Instagram
                    </a>
                  )}
                  {profile.behance && (
                    <a href={profile.behance} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1.5">
                      🎨 Behance
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Skills Card */}
            <div className="bg-surface-elevated border border-border-custom/60 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-text-main mb-4 uppercase tracking-wider text-[11px]">Skills & Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map((s: any) => (
                  <span 
                    key={s.id} 
                    className="px-3.5 py-1.5 bg-surface border border-border-custom/80 text-text-sub font-semibold text-xs rounded-full"
                  >
                    {s.name}
                  </span>
                ))}
                {(!profile.skills || profile.skills.length === 0) && (
                  <span className="text-xs text-text-muted">No skills highlighted.</span>
                )}
              </div>
            </div>

            {/* Equipment Card */}
            <div className="bg-surface-elevated border border-border-custom/60 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-text-main mb-4 uppercase tracking-wider text-[11px]">Equipment & Gear</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.equipment?.map((eq: any) => (
                  <div key={eq.id} className="bg-surface border border-border-custom/80 rounded-2xl p-4">
                    <span className="text-[9px] bg-surface-elevated border border-border-custom/80 px-2.5 py-1 rounded text-text-sub font-bold uppercase tracking-wider">
                      {eq.equipment_type}
                    </span>
                    <h4 className="text-sm font-semibold text-text-main mt-3">{eq.brand} {eq.model}</h4>
                    {eq.description && <p className="text-xs text-text-muted mt-1 leading-relaxed">{eq.description}</p>}
                  </div>
                ))}
                {(!profile.equipment || profile.equipment.length === 0) && (
                  <span className="text-xs text-text-muted col-span-full">No equipment gear listed.</span>
                )}
              </div>
            </div>

            {/* Portfolio Grid Card */}
            <div className="bg-surface-elevated border border-border-custom/60 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-text-main mb-6 uppercase tracking-wider text-[11px]">Portfolio Showcase</h2>
              
              {featuredPortfolio.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Featured Work</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {featuredPortfolio.map((item: any) => (
                      <div key={item.id} className="bg-surface border border-border-custom/80 rounded-2xl overflow-hidden shadow-sm group">
                        <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-background">
                          {item.media_type === "IMAGE" ? (
                            <img src={getMediaUrl(item.media_url)} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-350" />
                          ) : (
                            <div className="text-center p-4">
                              <span className="text-[9px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-primary font-bold">
                                {item.media_type}
                              </span>
                              <p className="text-xs text-text-sub truncate mt-2 max-w-xs">{item.media_url}</p>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-semibold text-text-main truncate">{item.title}</h4>
                          <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider mt-1 block">{item.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">All Projects</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {standardPortfolio.map((item: any) => (
                    <div key={item.id} className="bg-surface border border-border-custom/80 rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div className="aspect-video bg-background flex items-center justify-center overflow-hidden">
                        {item.media_type === "IMAGE" ? (
                          <img src={getMediaUrl(item.media_url)} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] bg-surface-elevated border border-border-custom px-2 py-0.5 rounded text-text-muted font-bold uppercase">{item.media_type}</span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-semibold text-text-main truncate">{item.title}</h4>
                        <span className="text-[9px] text-text-muted uppercase tracking-wider block mt-1">{item.category}</span>
                      </div>
                    </div>
                  ))}
                  {(!profile.portfolio || profile.portfolio.length === 0) && (
                    <span className="text-xs text-text-muted col-span-full">No portfolio projects uploaded.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews & Ratings Section */}
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-text-main uppercase tracking-wider text-[11px]">Client Feedback & Reviews</h2>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Overall Score Card */}
                <div className="flex-1 bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider mb-2">Reputation Score</span>
                  <div className="text-4xl font-black text-text-main">
                    {profile.average_rating ? profile.average_rating.toFixed(1) : "0.0"}
                  </div>
                  <div className="mt-2">
                    <StarRating rating={profile.average_rating || 0} size="sm" />
                  </div>
                  <span className="text-xs text-text-muted mt-2 block">
                    Based on {profile.review_count} verified reviews
                  </span>
                </div>

                {/* Star breakdowns progress bars */}
                <div className="flex-grow">
                  <RatingDistribution reviews={allReviewsForDistribution} />
                </div>
              </div>

              {/* Filters Header */}
              <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-text-sub uppercase">Filter rating:</span>
                  <select
                    value={reviewsRating || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReviewsRating(val ? parseInt(val) : undefined);
                      setReviewsPage(1);
                    }}
                    className="bg-surface border border-border-custom rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none"
                  >
                    <option value="">All Star Ratings</option>
                    <option value="5">5 Stars only</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-text-sub uppercase">Sort by:</span>
                  <select
                    value={reviewsSort}
                    onChange={(e) => {
                      setReviewsSort(e.target.value);
                      setReviewsPage(1);
                    }}
                    className="bg-surface border border-border-custom rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                  </select>
                </div>
              </div>

              {/* Review Cards list */}
              <div className="space-y-4">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}

                {reviews.length === 0 && (
                  <div className="bg-surface-elevated/40 border border-border-custom rounded-3xl p-8 text-center text-text-muted text-xs">
                    No reviews matching the criteria were found.
                  </div>
                )}

                {hasMoreReviews && reviews.length >= 10 && (
                  <button
                    onClick={() => setReviewsPage((p) => p + 1)}
                    disabled={loadingReviews}
                    className="w-full py-3 bg-surface hover:bg-surface-elevated border border-border-custom text-xs font-bold text-text-main rounded-xl transition uppercase tracking-wider cursor-pointer"
                  >
                    {loadingReviews ? "Loading more..." : "Load More Reviews"}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Pricing & Booking Sidebar */}
          <div className="space-y-6">
            
            {/* Booking Action Card */}
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <h2 className="text-xs font-bold text-text-main uppercase tracking-wider mb-6">Rates & Service Fees</h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2 border-b border-border-custom">
                  <span className="text-xs text-text-sub font-semibold">Starting Price</span>
                  <span className="text-base font-bold text-text-main">
                    {profile.starting_price ? `₹${parseInt(profile.starting_price).toLocaleString()}` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-custom">
                  <span className="text-xs text-text-sub font-semibold">Hourly Rate</span>
                  <span className="text-base font-bold text-text-main">
                    {profile.hourly_rate ? `₹${parseInt(profile.hourly_rate).toLocaleString()}/hr` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-custom">
                  <span className="text-xs text-text-sub font-semibold">Event Rate</span>
                  <span className="text-base font-bold text-text-main">
                    {profile.event_rate ? `₹${parseInt(profile.event_rate).toLocaleString()}/event` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-text-sub font-semibold">Travel Coverage</span>
                  <span className="text-xs font-semibold text-text-main text-right">
                    {profile.willing_to_travel ? `Willing (Radius: ${profile.service_radius_km || 25} km)` : "Local Only"}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              {!isOwnProfile && (
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      if (!user) {
                        router.push("/login");
                        return;
                      }
                      if (user.role !== "CLIENT") {
                        alert("Only CLIENT accounts can submit booking requests.");
                        return;
                      }
                      setIsBookModalOpen(true);
                    }}
                    disabled={processing}
                    className="w-full py-3 bg-primary text-text-main text-xs font-bold rounded-xl border border-primary/10 hover:bg-primary-hover transition text-center disabled:opacity-50 cursor-pointer"
                  >
                    Book Professional
                  </button>
                </div>
              )}
            </div>

            {/* Travel Radius details */}
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm text-xs text-text-sub space-y-2">
              <p className="font-bold text-text-main mb-2">Platform Notice:</p>
              <p>Sensitive contact info (email/phone) is protected. Booking and messaging occur securely via the platform portal once activated.</p>
            </div>

          </div>

        </div>

      </Container>

      {profile && (
        <BookProfessionalModal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          freelancer={profile}
        />
      )}
    </div>
  );
}
