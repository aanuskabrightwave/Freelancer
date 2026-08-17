"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import StarRating from "@/components/reviews/StarRating";
import FavouriteButton from "@/components/favourites/FavouriteButton";
import { TrustBadgeList } from "@/components/trust/TrustBadge";
import { favouriteService } from "@/services/favourite.service";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

type TabOption = "freelancers" | "services";

export default function FavouritesPage() {
  const [activeTab, setActiveTab] = useState<TabOption>("freelancers");
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = async () => {
    try {
      setLoading(true);
      const flList = await favouriteService.getFavoriteFreelancers();
      const srvList = await favouriteService.getFavoriteServices();
      setFreelancers(flList);
      setServices(srvList);
    } catch (err) {
      console.error("Failed to load favorites", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  const handleToggleSuccess = () => {
    // Re-fetch list to update UI when something is unfavorited
    fetchFavourites();
  };

  return (
    <Container className="py-12">
      <div className="space-y-8">
        <PageHeader
          title="Saved Favourites"
          description="Access your bookmarked creative professionals and services for easy booking."
        />

        {/* Tab Selector */}
        <div className="flex gap-6 border-b border-border-custom/50 pb-px">
          <button
            onClick={() => setActiveTab("freelancers")}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition cursor-pointer ${
              activeTab === "freelancers"
                ? "text-primary border-b-2 border-primary"
                : "text-text-muted hover:text-text-sub"
            }`}
          >
            Saved Freelancers ({freelancers.length})
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition cursor-pointer ${
              activeTab === "services"
                ? "text-primary border-b-2 border-primary"
                : "text-text-muted hover:text-text-sub"
            }`}
          >
            Saved Services ({services.length})
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading your favourites..." />
        ) : (
          <>
            {activeTab === "freelancers" && (
              <>
                {freelancers.length === 0 ? (
                  <EmptyState
                    title="No saved freelancers yet"
                    description="Browse the marketplace and bookmark creative professionals you'd like to work with."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {freelancers.map((fav) => (
                      <div
                        key={fav.id}
                        className="bg-surface-elevated border border-border-custom hover:border-primary/30 rounded-3xl p-6 shadow-sm relative overflow-hidden transition-all group"
                      >
                        {/* Favorite button absolute positioning */}
                        <div className="absolute top-4 right-4 z-10">
                          <FavouriteButton
                            targetId={fav.freelancer_profile_id}
                            type="freelancer"
                            label=""
                            onToggleSuccess={handleToggleSuccess}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            {fav.profile_photo_url ? (
                              <img
                                src={fav.profile_photo_url}
                                alt={fav.full_name}
                                className="w-14 h-14 rounded-2xl object-cover border border-border-custom"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-surface border border-border-custom flex items-center justify-center text-primary font-bold uppercase text-xl">
                                {fav.full_name ? fav.full_name[0] : "C"}
                              </div>
                            )}
                            <div>
                              <h3 className="text-sm font-semibold text-text-main group-hover:text-primary transition">
                                <Link href={`/freelancers/${fav.freelancer_profile_id}`}>
                                  {fav.full_name}
                                </Link>
                              </h3>
                              <p className="text-xs text-text-sub mt-0.5">
                                {fav.professional_title}
                              </p>
                            </div>
                          </div>

                          <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">
                            Location: {fav.city}, {fav.country}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 border-t border-border-custom/50 pt-3">
                            <div className="flex items-center gap-1.5">
                              <StarRating rating={fav.average_rating || 0} size="xs" />
                              <span className="text-[11px] font-bold text-text-main">
                                {fav.average_rating ? fav.average_rating.toFixed(1) : "0.0"}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                ({fav.review_count} reviews)
                              </span>
                            </div>
                            
                            {fav.starting_price && (
                              <span className="text-xs font-bold text-success ml-auto">
                                Starts at ₹{parseInt(fav.starting_price).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {fav.trust_badges && fav.trust_badges.length > 0 && (
                            <div className="pt-1">
                              <TrustBadgeList badges={fav.trust_badges} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "services" && (
              <>
                {services.length === 0 ? (
                  <EmptyState
                    title="No saved services yet"
                    description="Explore packages and bookmark services you are interested in booking."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((fav) => (
                      <div
                        key={fav.id}
                        className="bg-surface-elevated border border-border-custom hover:border-primary/30 rounded-3xl overflow-hidden shadow-sm relative transition-all group"
                      >
                        {/* Favorite button absolute positioning */}
                        <div className="absolute top-4 right-4 z-10">
                          <FavouriteButton
                            targetId={fav.service_id}
                            type="service"
                            label=""
                            onToggleSuccess={handleToggleSuccess}
                          />
                        </div>

                        {fav.cover_image_url ? (
                          <div className="h-44 overflow-hidden relative border-b border-border-custom">
                            <img
                              src={fav.cover_image_url}
                              alt={fav.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            />
                            {fav.service_type && (
                              <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-surface-elevated/90 border border-border-custom rounded-full text-[9px] font-bold text-primary uppercase tracking-wider">
                                {fav.service_type}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-44 bg-surface border-b border-border-custom flex items-center justify-center text-text-muted text-xs">
                            No Cover Image
                          </div>
                        )}

                        <div className="p-6 space-y-4">
                          <div>
                            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">
                              By {fav.freelancer_name}
                            </span>
                            <h3 className="text-xs font-bold text-text-main group-hover:text-primary transition mt-1 truncate">
                              <Link href={`/services/${fav.service_id}`}>{fav.title}</Link>
                            </h3>
                          </div>

                          <div className="flex items-center justify-between border-t border-border-custom/50 pt-3">
                            <div className="flex items-center gap-1.5">
                              <StarRating rating={fav.average_rating || 0} size="xs" />
                              <span className="text-[11px] font-bold text-text-main">
                                {fav.average_rating ? fav.average_rating.toFixed(1) : "0.0"}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                ({fav.review_count})
                              </span>
                            </div>

                            {fav.starting_price && (
                              <span className="text-xs font-bold text-success">
                                ₹{parseInt(fav.starting_price).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Container>
  );
}
