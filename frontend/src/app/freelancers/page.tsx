"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMediaUrl } from "@/lib/api";
import { freelancerService } from "@/services/freelancer.service";
import Container from "@/components/ui/Container";

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

export default function PublicFreelancerDirectory() {
  const router = useRouter();

  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [profession, setProfession] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);

  async function fetchFreelancers() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const filters: any = {
        page,
        page_size: 20,
      };
      if (profession) filters.profession = profession;
      if (city.trim()) filters.city = city.trim();

      const data = await freelancerService.listFreelancers(filters);
      setFreelancers(data);
    } catch (err: any) {
      setErrorMsg("Failed to query the freelancer directory. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFreelancers();
  }, [profession, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFreelancers();
  };

  return (
    <div className="min-h-screen bg-background text-text-main py-16 px-6 font-sans">
      <Container>
        {/* Directory Title */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4 cinematic-reveal">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Discover Talent</span>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-text-main">
            Explore Creative Talent
          </h1>
          <p className="text-text-sub text-base max-w-md mx-auto leading-relaxed">
            Discover top-tier photographers, videographers, editors, and production specialists.
          </p>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleSearchSubmit} className="mb-12 bg-surface-elevated border border-border-custom rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-sm max-w-5xl mx-auto">
          <div>
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Primary Profession</label>
            <select 
              value={profession} 
              onChange={(e) => setProfession(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-text-main text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="">All Professions</option>
              {Object.entries(PROFESSION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Location (City)</label>
            <input 
              type="text" 
              value={city} 
              onChange={(e) => setCity(e.target.value)} 
              placeholder="e.g. Mumbai, Delhi"
              className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-text-main text-xs placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex items-end">
            <button 
              type="submit" 
              className="w-full py-3 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              Search Professionals
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="mb-6 max-w-5xl mx-auto bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Grid cards */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {freelancers.map((f) => (
                <div 
                  key={f.id} 
                  className="bg-surface-elevated border border-border-custom/60 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 flex flex-col justify-between group shadow-sm"
                >
                  <div className="relative aspect-[4/3] bg-surface overflow-hidden flex items-center justify-center border-b border-border-custom/50">
                    {f.profile_photo_url ? (
                      <img 
                        src={getMediaUrl(f.profile_photo_url)} 
                        alt={f.full_name} 
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">No Profile Picture</span>
                    )}

                    {f.verification_status === "VERIFIED" && (
                      <span className="absolute top-3 right-3 bg-success text-text-on-dark text-[9px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider">
                        VERIFIED
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary">
                        {PROFESSION_LABELS[f.primary_profession] || f.primary_profession}
                      </span>
                      <h3 className="text-base font-semibold text-text-main mt-1 group-hover:text-primary transition-colors truncate">
                        {f.full_name}
                      </h3>
                      <p className="text-xs text-text-sub mt-1 line-clamp-2 leading-relaxed">{f.professional_title}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border-custom/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-text-muted font-medium block uppercase tracking-wider">Starting Price</span>
                        <span className="font-bold text-text-main text-sm">
                          {f.starting_price ? `₹${parseInt(f.starting_price).toLocaleString()}` : "Contact for Quote"}
                        </span>
                      </div>
                      <button 
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-[10px] font-bold rounded-full transition cursor-pointer"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {freelancers.length === 0 && (
              <div className="py-20 text-center text-text-muted border border-dashed border-border-custom rounded-3xl bg-surface-elevated">
                No published freelancer profiles matching these criteria were found.
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
