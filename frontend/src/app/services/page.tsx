"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { marketplaceService } from "@/services/service.service";

const SERVICE_TYPE_LABELS = {
  ON_SITE: "On-Site",
  REMOTE: "Remote",
  HYBRID: "Hybrid"
};

export default function PublicServicesDirectory() {
  const router = useRouter();

  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  async function loadCategories() {
    try {
      const cats = await marketplaceService.getCategoriesMenu();
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load category menu", err);
    }
  }

  async function queryServices() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params: any = {
        page,
        page_size: 20
      };

      if (selectedParentId) params.category_id = Number(selectedParentId);
      if (selectedChildId) params.subcategory_id = Number(selectedChildId);
      if (serviceType) params.service_type = serviceType;
      if (city.trim()) params.city = city.trim();
      if (minPrice) params.min_price = parseFloat(minPrice);
      if (maxPrice) params.max_price = parseFloat(maxPrice);

      const data = await marketplaceService.listPublicServices(params);
      setServices(data);
    } catch (err: any) {
      setErrorMsg("Failed to query service listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    queryServices();
  }, [selectedParentId, selectedChildId, serviceType, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    queryServices();
  };

  const selectedParentCategory = categories.find(c => String(c.id) === selectedParentId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Title Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Marketplace Services
          </h1>
          <p className="text-slate-400 text-sm mt-3 max-w-lg mx-auto">
            Book professional creative packages directly with expert digital freelancers.
          </p>
        </div>

        {/* Filters Panel */}
        <form onSubmit={handleSearchSubmit} className="mb-10 bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-xl">
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Category</label>
            <select
              value={selectedParentId}
              onChange={(e) => {
                setSelectedParentId(e.target.value);
                setSelectedChildId("");
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Subcategory</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              disabled={!selectedParentId}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none disabled:opacity-40"
            >
              <option value="">All Subcategories</option>
              {selectedParentCategory?.subcategories?.map((sub: any) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="REMOTE">Remote</option>
              <option value="ON_SITE">On-Site</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Location (City)</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none placeholder-slate-700"
            />
          </div>

          <div className="sm:col-span-2 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Min Price (₹)</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none placeholder-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Max Price (₹)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none placeholder-slate-700"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/10 h-[38px]"
            >
              Search Services
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Directory Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {services.map((s) => {
                const coverImage = s.media?.find((m: any) => m.is_cover)?.media_url || s.media?.[0]?.media_url;
                return (
                  <div
                    key={s.id}
                    className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition duration-300 flex flex-col justify-between group shadow-lg"
                  >
                    <div className="aspect-[4/3] relative bg-slate-950 overflow-hidden flex items-center justify-center">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-350"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-700 font-bold uppercase">No Showcase media</span>
                      )}
                      
                      <span className="absolute top-2 left-2 bg-slate-950/80 border border-slate-850 px-2 py-0.5 rounded text-[8px] font-black uppercase text-indigo-400 tracking-wider">
                        {SERVICE_TYPE_LABELS[s.service_type as keyof typeof SERVICE_TYPE_LABELS] || s.service_type}
                      </span>
                    </div>

                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>{s.category?.name || "Service"}</span>
                          <span>•</span>
                          <span className="text-indigo-400">{s.subcategory?.name}</span>
                        </div>
                        <h3 className="text-sm font-black text-white mt-1.5 group-hover:text-indigo-300 transition duration-200 line-clamp-2">
                          {s.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
                          By {s.freelancer?.full_name || "Professional"}
                        </p>
                        {s.service_type !== "REMOTE" && s.city && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            📍 {s.city}, {s.state}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-850 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] text-slate-500 font-semibold block uppercase">Starting Price</span>
                          <span className="font-extrabold text-white text-sm">
                            ₹{parseInt(s.starting_price || 0).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => router.push(`/services/${s.id}`)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black rounded-lg transition"
                        >
                          View Service
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {services.length === 0 && (
              <div className="py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                No active service listings matching your queries were found in the marketplace.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
