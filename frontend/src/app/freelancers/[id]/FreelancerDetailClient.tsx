"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { freelancerService } from "@/services/freelancer.service";
import FavouriteButton from "@/components/favourites/FavouriteButton";
import { TrustBadgeList } from "@/components/trust/TrustBadge";
import StarRating from "@/components/reviews/StarRating";
import ReviewCard from "@/components/reviews/ReviewCard";
import RatingDistribution from "@/components/reviews/RatingDistribution";
import { reviewService } from "@/services/review.service";

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

  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [allReviewsForDistribution, setAllReviewsForDistribution] = useState<any[]>([]); // fetch all to calculate distribution accurately
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
        
        // If we got fewer than 10 reviews, there are no more pages
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
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-md shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Profile Not Accessible</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMsg || "Could not retrieve details."}</p>
          <button 
            onClick={() => router.push("/freelancers")} 
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  // Split portfolio into featured and standard
  const featuredPortfolio = profile.portfolio?.filter((p: any) => p.is_featured) || [];
  const standardPortfolio = profile.portfolio?.filter((p: any) => !p.is_featured) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* Cover Banner Image */}
      <div className="h-64 md:h-80 w-full bg-slate-900 relative overflow-hidden">
        {profile.cover_photo_url ? (
          <img 
            src={profile.cover_photo_url} 
            alt="Cover Banner" 
            className="w-full h-full object-cover opacity-75"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 opacity-60"></div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-24 relative z-10 pb-20">
        
        {/* Profile Overlay Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            
            {/* Profile Avatar Overlay */}
            <div className="w-32 h-32 rounded-full border-4 border-slate-900 bg-slate-950 flex-shrink-0 overflow-hidden shadow-2xl -mt-16 md:-mt-24">
              {profile.profile_photo_url ? (
                <img 
                  src={profile.profile_photo_url} 
                  alt={profile.full_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-xs uppercase bg-slate-900">
                  Avatar
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                {PROFESSION_LABELS[profile.primary_profession] || profile.primary_profession}
              </span>
              
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <h1 className="text-2xl md:text-3xl font-black text-white">{profile.full_name}</h1>
                {profile.verification_status === "VERIFIED" && (
                  <span className="text-emerald-400 text-sm font-bold" title="Verified Professional">✔</span>
                )}
              </div>

              <p className="text-slate-400 text-sm mt-1">{profile.professional_title}</p>
              
              {/* Rating Summary block */}
              {profile.review_count > 0 && (
                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                  <StarRating rating={profile.average_rating || 0} size="xs" />
                  <span className="text-xs font-black text-white">
                    {profile.average_rating ? profile.average_rating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({profile.review_count} {profile.review_count === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-2">
                {profile.city}, {profile.state}, {profile.country} • {profile.experience_years} years experience
              </p>

              {/* Trust badges list */}
              {profile.trust_badges && profile.trust_badges.length > 0 && (
                <div className="mt-3">
                  <TrustBadgeList badges={profile.trust_badges} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Starting Price</span>
            <span className="text-2xl font-black text-white">
              {profile.starting_price ? `₹${parseInt(profile.starting_price).toLocaleString()}` : "On Quote"}
            </span>
            <div className="mt-2">
              <FavouriteButton targetId={profile.id} type="freelancer" label="Save Creator" />
            </div>
          </div>
        </div>

        {/* Two Column details layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main profile contents */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bio Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <h2 className="text-base font-extrabold text-white mb-4">About Professional</h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
            </div>

            {/* Skills Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <h2 className="text-base font-extrabold text-white mb-4">Skills & Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map((s: any) => (
                  <span 
                    key={s.id} 
                    className="px-3.5 py-1.5 bg-slate-950 border border-slate-800/80 text-slate-400 font-bold text-xs rounded-full"
                  >
                    {s.name}
                  </span>
                ))}
                {(!profile.skills || profile.skills.length === 0) && (
                  <span className="text-xs text-slate-500">No skills highlighted.</span>
                )}
              </div>
            </div>

            {/* Equipment Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <h2 className="text-base font-extrabold text-white mb-4">Equipment & Gear</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.equipment?.map((eq: any) => (
                  <div key={eq.id} className="bg-slate-950 border border-slate-850 rounded-2xl p-4">
                    <span className="text-[9px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                      {eq.equipment_type}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-2">{eq.brand} {eq.model}</h4>
                    {eq.description && <p className="text-xs text-slate-500 mt-1">{eq.description}</p>}
                  </div>
                ))}
                {(!profile.equipment || profile.equipment.length === 0) && (
                  <span className="text-xs text-slate-500 col-span-full">No equipment gear listed.</span>
                )}
              </div>
            </div>

            {/* Portfolio Grid Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <h2 className="text-base font-extrabold text-white mb-6">Portfolio Showcase</h2>
              
              {featuredPortfolio.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Featured Work</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {featuredPortfolio.map((item: any) => (
                      <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group">
                        <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-slate-900">
                          {item.media_type === "IMAGE" ? (
                            <img src={item.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          ) : (
                            <div className="text-center p-4">
                              <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-indigo-400 font-bold">
                                {item.media_type}
                              </span>
                              <p className="text-xs text-slate-400 truncate mt-2 max-w-xs">{item.media_url}</p>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">{item.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">All Projects</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {standardPortfolio.map((item: any) => (
                    <div key={item.id} className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                        {item.media_type === "IMAGE" ? (
                          <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] bg-slate-850 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">{item.media_type}</span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block mt-1">{item.category}</span>
                      </div>
                    </div>
                  ))}
                  {(!profile.portfolio || profile.portfolio.length === 0) && (
                    <span className="text-xs text-slate-500 col-span-full">No portfolio projects uploaded.</span>
                  )}
                </div>
              </div>

            </div>

            {/* Reviews & Ratings Section */}
            <div className="space-y-6">
              <h2 className="text-base font-extrabold text-white">Client Feedback & Reviews</h2>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Overall Score Card */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider mb-2">Reputation Score</span>
                  <div className="text-4xl font-black text-white">
                    {profile.average_rating ? profile.average_rating.toFixed(1) : "0.0"}
                  </div>
                  <div className="mt-2">
                    <StarRating rating={profile.average_rating || 0} size="sm" />
                  </div>
                  <span className="text-xs text-slate-500 mt-2 block">
                    Based on {profile.review_count} verified reviews
                  </span>
                </div>

                {/* Star breakdowns progress bars */}
                <div className="flex-grow">
                  <RatingDistribution reviews={allReviewsForDistribution} />
                </div>
              </div>

              {/* Filters Header */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-450 uppercase">Filter rating:</span>
                  <select
                    value={reviewsRating || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReviewsRating(val ? parseInt(val) : undefined);
                      setReviewsPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
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
                  <span className="text-xs font-black text-slate-450 uppercase">Sort by:</span>
                  <select
                    value={reviewsSort}
                    onChange={(e) => {
                      setReviewsSort(e.target.value);
                      setReviewsPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
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
                  <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-8 text-center text-slate-500 text-xs">
                    No reviews matching the criteria were found.
                  </div>
                )}

                {hasMoreReviews && reviews.length >= 10 && (
                  <button
                    onClick={() => setReviewsPage((p) => p + 1)}
                    disabled={loadingReviews}
                    className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-xs font-black text-white rounded-xl transition uppercase tracking-wider cursor-pointer"
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-6">Rates & Service Fees</h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold">Starting Price</span>
                  <span className="text-base font-black text-white">
                    {profile.starting_price ? `₹${parseInt(profile.starting_price).toLocaleString()}` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold">Hourly Rate</span>
                  <span className="text-base font-black text-white">
                    {profile.hourly_rate ? `₹${parseInt(profile.hourly_rate).toLocaleString()}/hr` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold">Event Rate</span>
                  <span className="text-base font-black text-white">
                    {profile.event_rate ? `₹${parseInt(profile.event_rate).toLocaleString()}/event` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-slate-400 font-semibold">Travel Coverage</span>
                  <span className="text-xs font-bold text-slate-200 text-right">
                    {profile.willing_to_travel ? `Willing (Radius: ${profile.service_radius_km || 25} km)` : "Local Only"}
                  </span>
                </div>
              </div>

              {/* Action buttons (Disabled) */}
              <div className="space-y-2">
                <button 
                  disabled 
                  className="w-full py-3 bg-indigo-600/30 text-indigo-400 text-xs font-bold rounded-xl border border-indigo-500/20 cursor-not-allowed text-center"
                >
                  Book Professional
                </button>
                <button 
                  disabled 
                  className="w-full py-3 bg-slate-950/50 text-slate-500 text-xs font-bold rounded-xl border border-slate-850 cursor-not-allowed text-center"
                >
                  Send Message
                </button>
                <span className="text-[10px] text-slate-500 font-bold block text-center mt-3 uppercase tracking-wider">
                  Booking & Messaging available in Phase 4
                </span>
              </div>
            </div>

            {/* Travel Radius details */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-xs text-slate-400 space-y-2">
              <p className="font-bold text-slate-200 mb-2">Platform Notice:</p>
              <p>Sensitive contact info (email/phone) is protected. Booking and messaging occur securely via the platform portal once activated.</p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
