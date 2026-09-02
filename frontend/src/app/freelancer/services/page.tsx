"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { marketplaceService } from "@/services/service.service";

export default function FreelancerServicesDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function loadServices() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await marketplaceService.getMyServices();
      setServices(data);
    } catch (err: any) {
      setErrorMsg("Failed to retrieve your creative services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadServices();
    }
  }, [user]);

  const handlePauseToggle = async (id: number, currentStatus: string) => {
    try {
      setActionLoading(id);
      setErrorMsg(null);

      if (currentStatus === "PUBLISHED") {
        await marketplaceService.pauseService(id);
      } else {
        await marketplaceService.publishService(id);
      }
      
      // Reload services list
      const data = await marketplaceService.getMyServices();
      setServices(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to modify service status. Ensure all publication gates are met.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: number) => {
    if (!window.confirm("Are you sure you want to archive this service? Archived services cannot be published again.")) {
      return;
    }

    try {
      setActionLoading(id);
      setErrorMsg(null);
      await marketplaceService.deleteService(id);

      // Reload
      const data = await marketplaceService.getMyServices();
      setServices(data);
    } catch (err: any) {
      setErrorMsg("Failed to archive service.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "PAUSED":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "ARCHIVED":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      default:
        return "bg-surface-elevated border-border-custom text-text-sub";
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-transparent flex flex-col justify-center items-center text-text-main py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent text-text-main py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">My Creative Services</h1>
            <p className="text-text-sub text-xs mt-1">Manage and package your listings like marketplace gigs.</p>
          </div>
          <Link
            href="/freelancer/services/new"
            className="mt-4 sm:mt-0 px-4 py-2.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition shadow-lg shadow-primary"
          >
            Create New Service
          </Link>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Services List Grid */}
        <div className="space-y-4">
          {services.map((s) => {
            const coverImage = s.media?.find((m: any) => m.is_cover)?.media_url || s.media?.[0]?.media_url;
            return (
              <div 
                key={s.id} 
                className="bg-surface border border-border-custom rounded-2xl p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg hover:border-border-custom transition"
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {/* Cover Preview */}
                  <div className="w-20 h-16 rounded-lg bg-background border border-border-custom overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {coverImage ? (
                      <img src={coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-text-muted font-bold uppercase">No Cover</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm md:text-base font-bold text-text-main truncate max-w-xs sm:max-w-md">{s.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(s.status)}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-sub mt-1 line-clamp-1">{s.short_description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-text-muted font-medium">
                      <span>Packages: <strong className="text-text-sub">{s.packages?.length || 0}</strong></span>
                      <span>•</span>
                      <span>Starting Price: <strong className="text-primary">₹{parseInt(s.starting_price || 0).toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Views: <strong className="text-text-sub">0</strong></span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t border-border-custom pt-4 md:pt-0 md:border-t-0">
                  <Link
                    href={`/freelancer/services/${s.id}/edit`}
                    className="px-3 py-1.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub text-[10px] font-bold rounded-lg transition"
                  >
                    Edit
                  </Link>

                  {s.status === "PUBLISHED" && (
                    <Link
                      href={`/services/${s.id}`}
                      className="px-3 py-1.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub text-[10px] font-bold rounded-lg transition"
                    >
                      Preview
                    </Link>
                  )}

                  <button
                    disabled={actionLoading === s.id}
                    onClick={() => handlePauseToggle(s.id, s.status)}
                    className="px-3 py-1.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub text-[10px] font-bold rounded-lg transition"
                  >
                    {s.status === "PUBLISHED" ? "Pause" : "Publish"}
                  </button>

                  <button
                    disabled={actionLoading === s.id}
                    onClick={() => handleArchive(s.id)}
                    className="px-3 py-1.5 bg-background border border-border-custom hover:border-rose-900/30 hover:text-rose-400 text-rose-500 text-[10px] font-bold rounded-lg transition"
                  >
                    Archive
                  </button>
                </div>
              </div>
            );
          })}

          {services.length === 0 && (
            <div className="py-20 text-center text-text-muted border border-dashed border-border-custom rounded-3xl flex flex-col justify-center items-center">
              <span className="text-3xl mb-4">💼</span>
              <h3 className="font-bold text-text-main text-sm">Create Your First Service Listing</h3>
              <p className="text-xs text-text-sub mt-2 max-w-sm">
                Seed your digital packages to start pitching deliverables directly to clients.
              </p>
              <Link
                href="/freelancer/services/new"
                className="mt-6 px-5 py-2 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition"
              >
                Create Service
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
