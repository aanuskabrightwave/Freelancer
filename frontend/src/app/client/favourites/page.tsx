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
    <Container className="py-8">
      <div className="space-y-6">
        <PageHeader
          title="My Saved Favourites"
          description="Access your bookmarked creative professionals and services for easy booking."
        />

        {/* Tab Selector */}
        <div className="flex gap-4 border-b border-slate-850 pb-px">
          <button
            onClick={() => setActiveTab("freelancers")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition ${
              activeTab === "freelancers"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-slate-500 hover:text-slate-350"
            }`}
          >
            Saved Freelancers ({freelancers.length})
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition ${
              activeTab === "services"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-slate-500 hover:text-slate-350"
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
                        className="bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden transition group"
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
                                className="w-14 h-14 rounded-2xl object-cover border border-slate-850"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center text-indigo-400 font-bold uppercase text-xl">
                                {fav.full_name ? fav.full_name[0] : "C"}
                              </div>
                            )}
                            <div>
                              <h3 className="text-sm font-black text-white group-hover:text-indigo-400 transition">
                                <Link href={`/freelancers/${fav.freelancer_profile_id}`}>
                                  {fav.full_name}
                                </Link>
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {fav.professional_title}
                              </p>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500">
                            Location: {fav.city}, {fav.country}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 border-t border-slate-850 pt-3">
                            <div className="flex items-center gap-1.5">
                              <StarRating rating={fav.average_rating || 0} size="xs" />
                              <span className="text-[11px] font-black text-white">
                                {fav.average_rating ? fav.average_rating.toFixed(1) : "0.0"}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({fav.review_count} reviews)
                              </span>
                            </div>
                            
                            {fav.starting_price && (
                              <span className="text-xs font-black text-emerald-450 ml-auto">
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
                        className="bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-3xl overflow-hidden shadow-xl relative transition group"
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
                          <div className="h-44 overflow-hidden relative border-b border-slate-850">
                            <img
                              src={fav.cover_image_url}
                              alt={fav.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            />
                            {fav.service_type && (
                              <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-full text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider">
                                {fav.service_type}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-44 bg-slate-950/40 border-b border-slate-850 flex items-center justify-center text-slate-650">
                            No Cover Image
                          </div>
                        )}

                        <div className="p-6 space-y-4">
                          <div>
                            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">
                              By {fav.freelancer_name}
                            </span>
                            <h3 className="text-xs font-black text-white group-hover:text-indigo-400 transition mt-1 truncate">
                              <Link href={`/services/${fav.service_id}`}>{fav.title}</Link>
                            </h3>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                            <div className="flex items-center gap-1.5">
                              <StarRating rating={fav.average_rating || 0} size="xs" />
                              <span className="text-[11px] font-black text-white">
                                {fav.average_rating ? fav.average_rating.toFixed(1) : "0.0"}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({fav.review_count})
                              </span>
                            </div>

                            {fav.starting_price && (
                              <span className="text-xs font-black text-emerald-450">
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
