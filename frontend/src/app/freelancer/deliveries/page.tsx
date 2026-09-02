"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { workspaceService } from "@/services/workspace.service";
import { getMediaUrl } from "@/lib/api";
import {
  FileText,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Inbox,
  ExternalLink,
  Clock,
  Download
} from "lucide-react";

type DeliveryFilter = "ALL" | "DRAFTS" | "FINAL" | "ACCEPTED" | "REVISIONS";

export default function FreelancerDeliveriesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [deliveriesMap, setDeliveriesMap] = useState<Record<number, any[]>>({});
  const [revisionsMap, setRevisionsMap] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DeliveryFilter>("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch Freelancer Bookings
      const bookingsData = await bookingService.getFreelancerBookings();
      setBookings(bookingsData);

      // Fetch Deliveries & Revisions for each booking in parallel
      const detailsPromises = bookingsData.map(async (b) => {
        try {
          const [delivs, revs] = await Promise.all([
            workspaceService.getDeliveries(b.id),
            workspaceService.getRevisions(b.id)
          ]);
          return {
            bookingId: b.id,
            deliveries: delivs,
            revisions: revs
          };
        } catch (err) {
          return {
            bookingId: b.id,
            deliveries: [],
            revisions: []
          };
        }
      });

      const resolvedDetails = await Promise.all(detailsPromises);
      
      const newDelivsMap: Record<number, any[]> = {};
      const newRevsMap: Record<number, any[]> = {};
      
      resolvedDetails.forEach((item) => {
        newDelivsMap[item.bookingId] = item.deliveries;
        newRevsMap[item.bookingId] = item.revisions;
      });

      setDeliveriesMap(newDelivsMap);
      setRevisionsMap(newRevsMap);
    } catch (err) {
      setErrorMsg("We couldn't load your deliveries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const getFriendlyDeliveryStatus = (d: any) => {
    const s = d.status;
    if (s === "APPROVED") return "Accepted";
    if (s === "REVISION_REQUESTED") return "Revision Requested";
    if (s === "PENDING") {
      return d.delivery_type === "FINAL" ? "Final In Review" : "Draft In Review";
    }
    return s.replace(/_/g, " ");
  };

  const getStatusBadgeStyle = (statusLabel: string) => {
    switch (statusLabel) {
      case "Draft In Review":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "Final In Review":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse";
      case "Accepted":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Revision Requested":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      default:
        return "bg-surface-elevated border-border-custom text-text-sub";
    }
  };

  // Build flat list of all deliveries
  const allDeliveriesList: any[] = [];
  bookings.forEach((b) => {
    const delivs = deliveriesMap[b.id] || [];
    delivs.forEach((d) => {
      allDeliveriesList.push({
        ...d,
        booking: b,
        revisions: (revisionsMap[b.id] || []).filter((r) => r.delivery_id === d.id)
      });
    });
  });

  const filteredDeliveries = allDeliveriesList.filter((d) => {
    if (activeFilter === "DRAFTS") return d.delivery_type === "DRAFT";
    if (activeFilter === "FINAL") return d.delivery_type === "FINAL";
    if (activeFilter === "ACCEPTED") return d.status === "APPROVED";
    if (activeFilter === "REVISIONS") return d.status === "REVISION_REQUESTED";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-full bg-transparent py-10 px-4 md:px-8 font-sans">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-8 bg-surface-elevated animate-pulse rounded-xl w-48"></div>
          <div className="h-32 bg-surface-elevated animate-pulse rounded-3xl"></div>
          <div className="h-32 bg-surface-elevated animate-pulse rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent py-10 px-4 md:px-8 font-sans text-text-main">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-main">Work Deliveries</h1>
            <p className="text-text-sub text-xs mt-1">
              Track project drafts, final files, and client revision requests.
            </p>
          </div>
          <Link
            href="/freelancer/bookings"
            className="px-4 py-2 bg-surface-elevated hover:bg-surface border border-border-custom text-xs font-bold text-text-main rounded-xl transition inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>View All Bookings</span>
          </Link>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border-custom pb-4">
          {[
            { id: "ALL", label: `All Deliveries (${allDeliveriesList.length})` },
            { id: "DRAFTS", label: "Drafts" },
            { id: "FINAL", label: "Final Files" },
            { id: "REVISIONS", label: "Revisions Requested" },
            { id: "ACCEPTED", label: "Accepted" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as DeliveryFilter)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-primary text-text-on-dark shadow-sm"
                  : "bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Deliveries List */}
        <div className="space-y-4">
          {filteredDeliveries.map((delivery) => {
            const statusLabel = getFriendlyDeliveryStatus(delivery);
            const badgeClass = getStatusBadgeStyle(statusLabel);

            return (
              <div
                key={delivery.id}
                className="bg-surface-elevated border border-border-custom/80 rounded-3xl p-6 shadow-sm hover:border-border-custom transition space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-custom/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold text-text-main">{delivery.title}</h2>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span>Booking: <strong className="text-text-sub font-semibold">{delivery.booking?.booking_number}</strong></span>
                      <span>•</span>
                      <span>Client: <strong className="text-text-sub font-semibold">{delivery.booking?.client?.full_name || "Verified Client"}</strong></span>
                      <span>•</span>
                      <span>Type: <strong className="text-text-sub font-semibold">{delivery.delivery_type} (v{delivery.version})</strong></span>
                    </div>
                  </div>

                  <Link
                    href={`/freelancer/bookings/${delivery.booking?.id}`}
                    className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-border-custom text-xs font-bold text-text-main rounded-xl transition flex items-center gap-1.5"
                  >
                    <span>Manage in Booking</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Delivery Notes */}
                {delivery.message && (
                  <p className="text-xs text-text-sub leading-relaxed whitespace-pre-line bg-surface/50 p-4 rounded-2xl border border-border-custom/40">
                    {delivery.message}
                  </p>
                )}

                {/* Attached Files & Links */}
                {delivery.files && delivery.files.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Attached Deliverables:</span>
                    <div className="flex flex-wrap gap-2">
                      {delivery.files.map((file: any) => (
                        <a
                          key={file.id}
                          href={getMediaUrl(file.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-border-custom text-xs text-primary font-semibold rounded-xl transition flex items-center gap-2"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{file.original_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revision Notes if Requested */}
                {delivery.revisions && delivery.revisions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {delivery.revisions.map((rev: any) => (
                      <div key={rev.id} className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Client Revision Requested: {rev.title}</span>
                        </div>
                        <p className="text-xs text-text-sub leading-relaxed">{rev.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer timestamp */}
                <div className="text-[10px] text-text-muted pt-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>Submitted on {new Date(delivery.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
                </div>
              </div>
            );
          })}

          {filteredDeliveries.length === 0 && (
            <div className="py-16 text-center bg-surface-elevated/40 border border-border-custom rounded-3xl space-y-3">
              <Inbox className="w-10 h-10 text-text-muted mx-auto" />
              <h3 className="text-sm font-bold text-text-main">No Deliveries Found</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                {activeFilter === "ALL"
                  ? "You have not submitted any project deliveries yet. Complete active booking assignments to upload delivery drafts."
                  : `No deliveries matching the "${activeFilter}" filter.`}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
