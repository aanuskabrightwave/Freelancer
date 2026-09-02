"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { marketplaceService } from "@/services/service.service";
import Container from "@/components/ui/Container";
import AuthenticatedFluidBackground from "@/components/backgrounds/AuthenticatedFluidBackground";

const SERVICE_TYPE_LABELS = {
  ON_SITE: "On-Site",
  REMOTE: "Remote",
  HYBRID: "Hybrid"
};

function PublicServicesDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

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
  const [totalPages, setTotalPages] = useState(1);
  const [freelancerId, setFreelancerId] = useState("");

  useEffect(() => {
    const fId = searchParams.get("freelancer_id");
    if (fId) {
      setFreelancerId(fId);
    }
  }, [searchParams]);

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
      if (freelancerId) params.freelancer_id = Number(freelancerId);

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
  }, [selectedParentId, selectedChildId, serviceType, page, freelancerId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    queryServices();
  };

  const selectedParentCategory = categories.find(c => String(c.id) === selectedParentId);

  return (
    <div className="min-h-screen bg-transparent text-text-main py-16 px-6 font-sans relative">
      {!isAuthenticated && <AuthenticatedFluidBackground />}
      <Container className="relative z-10">
        
        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4 cinematic-reveal">
          <span className="text-overline-accent block">Marketplace Packages</span>
          <h1 className="text-4xl md:text-6xl text-title-prominent">
            Explore Services
          </h1>
          <p className="text-subtitle-prominent text-base max-w-md mx-auto leading-relaxed">
            Book professional creative packages directly with expert digital freelancers.
          </p>
        </div>

        {/* Filters Panel */}
        <form onSubmit={handleSearchSubmit} className="mb-12 bg-surface-elevated border border-border-custom rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-sm max-w-5xl mx-auto">
          <div>
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Category</label>
            <select
              value={selectedParentId}
              onChange={(e) => {
                setSelectedParentId(e.target.value);
                setSelectedChildId("");
              }}
              className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-text-main text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Subcategory</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              disabled={!selectedParentId}
              className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-text-main text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-40"
            >
              <option value="">All Subcategories</option>
              {selectedParentCategory?.subcategories?.map((sub: any) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-text-main text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="">All Types</option>
              <option value="REMOTE">Remote</option>
              <option value="ON_SITE">On-Site</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Location (City)</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-text-main text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-text-muted"
            />
          </div>

          <div className="sm:col-span-2 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Min Price (₹)</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-text-main text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-text-muted"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Max Price (₹)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-text-main text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-text-muted"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition shadow-sm h-[40px] cursor-pointer"
            >
              Search Services
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="mb-6 max-w-5xl mx-auto bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Directory Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {services.map((s) => {
                const coverImage = s.media?.find((m: any) => m.is_cover)?.media_url || s.media?.[0]?.media_url;
                return (
                  <div
                    key={s.id}
                    className="bg-surface-elevated border border-border-custom/60 rounded-2xl overflow-hidden hover:border-primary/30 transition duration-300 flex flex-col justify-between group shadow-sm"
                  >
                    <div className="aspect-[4/3] relative bg-surface overflow-hidden flex items-center justify-center border-b border-border-custom/50">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">No Showcase media</span>
                      )}
                      
                      <span className="absolute top-3 left-3 bg-dark/85 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase text-primary tracking-wider">
                        {SERVICE_TYPE_LABELS[s.service_type as keyof typeof SERVICE_TYPE_LABELS] || s.service_type}
                      </span>
                    </div>

                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                          <span>{s.category?.name || "Service"}</span>
                          <span>•</span>
                          <span className="text-primary">{s.subcategory?.name}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-text-main mt-1.5 group-hover:text-primary transition duration-200 line-clamp-2 leading-relaxed">
                          {s.title}
                        </h3>
                        <p className="text-[11px] text-text-sub mt-2 font-medium">
                          By {s.freelancer?.full_name || "Professional"}
                        </p>
                        {s.service_type !== "REMOTE" && s.city && (
                          <p className="text-[10px] text-text-muted mt-1">
                            📍 {s.city}, {s.state}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-border-custom/50 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] text-text-muted font-medium block uppercase tracking-wider">Starting Price</span>
                          <span className="font-extrabold text-text-main text-sm">
                            ₹{parseInt(s.starting_price || 0).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => router.push(`/services/${s.id}`)}
                          className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-[10px] font-bold rounded-full transition cursor-pointer"
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
              <div className="py-20 text-center text-text-muted border border-dashed border-border-custom rounded-3xl bg-surface-elevated">
                No active service listings matching your queries were found in the marketplace.
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}

export default function PublicServicesDirectory() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PublicServicesDirectoryContent />
    </Suspense>
  );
}
