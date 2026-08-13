"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { freelancerService } from "@/services/freelancer.service";

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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Directory Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Explore Creative Talent
          </h1>
          <p className="text-slate-400 text-sm mt-3 max-w-lg mx-auto">
            Discover top-tier photographers, videographers, editors, and digital artists.
          </p>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleSearchSubmit} className="mb-10 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-xl backdrop-blur-xl">
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Primary Profession</label>
            <select 
              value={profession} 
              onChange={(e) => setProfession(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-xs focus:outline-none"
            >
              <option value="">All Professions</option>
              {Object.entries(PROFESSION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Location (City)</label>
            <input 
              type="text" 
              value={city} 
              onChange={(e) => setCity(e.target.value)} 
              placeholder="e.g. Mumbai, Delhi"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-xs placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button 
              type="submit" 
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/10"
            >
              Search Professionals
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Grid cards */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {freelancers.map((f) => (
                <div 
                  key={f.id} 
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition duration-300 flex flex-col justify-between group shadow-lg"
                >
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden flex items-center justify-center">
                    {f.profile_photo_url ? (
                      <img 
                        src={f.profile_photo_url} 
                        alt={f.full_name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-350"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No Profile Picture</span>
                    )}

                    {f.verification_status === "VERIFIED" && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                        VERIFIED
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">
                        {PROFESSION_LABELS[f.primary_profession] || f.primary_profession}
                      </span>
                      <h3 className="text-base font-black text-white mt-1 group-hover:text-indigo-300 transition duration-200 truncate">
                        {f.full_name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{f.professional_title}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Starting Price</span>
                        <span className="font-bold text-white text-sm">
                          {f.starting_price ? `₹${parseInt(f.starting_price).toLocaleString()}` : "Contact for Quote"}
                        </span>
                      </div>
                      <button 
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black rounded-lg transition"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {freelancers.length === 0 && (
              <div className="py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                No published freelancer profiles matching these criteria were found.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
