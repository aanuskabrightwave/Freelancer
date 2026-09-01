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
  MessageSquare,
  ChevronRight,
  Inbox,
  ArrowRight,
  ExternalLink,
  Download,
  Clock,
  Sparkles,
  HelpCircle
} from "lucide-react";

type DeliveryFilter = "ALL" | "DRAFTS" | "FINAL" | "ACCEPTED";

export default function ClientDeliveriesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [deliveriesMap, setDeliveriesMap] = useState<Record<number, any[]>>({});
  const [revisionsMap, setRevisionsMap] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DeliveryFilter>("ALL");

  // Actions loading
  const [actionLoading, setActionLoading] = useState(false);

  // Revision Modal States
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionDesc, setRevisionDesc] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Fetch Client Bookings
      const bookingsData = await bookingService.getClientBookings();
      setBookings(bookingsData);

      // 2. Fetch Deliveries & Revisions for each booking in parallel
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

  // Delivery Status Mapping (Part 4)
  const getFriendlyDeliveryStatus = (d: any) => {
    const s = d.status;
    if (s === "APPROVED") return "Accepted";
    if (s === "REVISION_REQUESTED") return "Revision Requested";
    if (s === "PENDING") {
      return d.delivery_type === "FINAL" ? "Final Delivery Ready" : "Draft Available";
    }
    return s.replace(/_/g, " ");
  };

  const getStatusBadgeStyle = (statusLabel: string) => {
    switch (statusLabel) {
      case "Draft Available":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "Final Delivery Ready":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse";
      case "Accepted":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Revision Requested":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      default:
        return "bg-surface-elevated border-border-custom text-text-sub";
    }
  };

  // Actions: Acceptance & Revision (Part 17, 20)
  const handleApproveFinalDelivery = async (bookingId: number) => {
    if (!window.confirm("Confirm final delivery approval? This releases the escrow balance payment.")) {
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.approveFinalDelivery(bookingId);
      await loadData();
      alert("Fulfillment delivery approved successfully.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Approval update failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeliveryId || !revisionTitle.trim() || !revisionDesc.trim()) {
      alert("Please fill in all revision details.");
      return;
    }
    try {
      setActionLoading(true);
      await workspaceService.requestRevision(activeDeliveryId, {
        title: revisionTitle.trim(),
        description: revisionDesc.trim(),
      });
      setShowRevisionModal(false);
      setRevisionTitle("");
      setRevisionDesc("");
      await loadData();
      alert("Revision request submitted to Admin.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to request revision.");
    } finally {
      setActionLoading(false);
    }
  };

  // Flatten and filter shared deliveries (Part 5, 6)
  const allSharedDeliveries: any[] = [];
  bookings.forEach((b) => {
    const bookingDelivs = deliveriesMap[b.id] || [];
    // CRITICAL: Filter only shared deliveries
    const sharedDelivs = bookingDelivs.filter((d) => d.shared_with_client_at !== null);
    
    sharedDelivs.forEach((d) => {
      allSharedDeliveries.push({
        ...d,
        booking: b
      });
    });
  });

  // Sort by date desc
  allSharedDeliveries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredDeliveries = allSharedDeliveries.filter((d) => {
    const friendly = getFriendlyDeliveryStatus(d);
    if (activeFilter === "ALL") return true;
    if (activeFilter === "DRAFTS" && d.delivery_type === "PREVIEW") return true;
    if (activeFilter === "FINAL" && d.delivery_type === "FINAL") return true;
    if (activeFilter === "ACCEPTED" && friendly === "Accepted") return true;
    return false;
  });

  const getEmptyStateMessage = () => {
    if (activeFilter === "DRAFTS") return "No drafts or preview packages shared yet.";
    if (activeFilter === "FINAL") return "No final delivery packages released yet.";
    if (activeFilter === "ACCEPTED") return "No accepted deliveries on record.";
    return "No drafts or completed work shared by our team yet.";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 md:px-8 font-sans">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="bg-surface border border-border-custom rounded-3xl p-6 h-32 flex flex-col justify-between">
            <div className="w-1/3 h-5 bg-surface-elevated rounded"></div>
            <div className="w-1/2 h-3 bg-surface-elevated rounded"></div>
          </div>
          <div className="h-48 bg-surface rounded-3xl border border-border-custom"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Panel */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">Deliveries & Drafts</h1>
            <p className="text-text-sub text-xs mt-1">
              Review drafts shared by our team and access your final completed work.
            </p>
          </div>
          <Link
            href="/client/dashboard"
            className="text-xs uppercase tracking-widest font-bold text-text-sub hover:text-primary flex items-center gap-2 group transition"
          >
            Dashboard →
          </Link>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab Filters (Part 3) */}
        <div className="flex gap-2 pb-2 overflow-x-auto border-b border-border-custom scrollbar-thin">
          {(["ALL", "DRAFTS", "FINAL", "ACCEPTED"] as DeliveryFilter[]).map((filter) => {
            const count = allSharedDeliveries.filter((d) => {
              const friendly = getFriendlyDeliveryStatus(d);
              if (filter === "ALL") return true;
              if (filter === "DRAFTS" && d.delivery_type === "PREVIEW") return true;
              if (filter === "FINAL" && d.delivery_type === "FINAL") return true;
              if (filter === "ACCEPTED" && friendly === "Accepted") return true;
              return false;
            }).length;

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                  activeFilter === filter
                    ? "bg-primary text-text-on-dark border-primary shadow-sm"
                    : "bg-surface hover:bg-surface-elevated text-text-sub border-border-custom"
                }`}
              >
                <span>{filter === "ALL" ? "All Deliveries" : filter === "DRAFTS" ? "Drafts" : filter === "FINAL" ? "Final Delivery" : "Accepted"}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    activeFilter === filter ? "bg-text-on-dark/20 text-text-on-dark" : "bg-surface-elevated text-text-muted"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Shared Deliveries List */}
        <div className="space-y-6">
          {filteredDeliveries.map((delivery) => {
            const friendlyStatus = getFriendlyDeliveryStatus(delivery);
            const b = delivery.booking;
            const assignedName = b.freelancer?.full_name || b.freelancer?.user?.full_name || "Assigned Specialist";
            const balanceUnpaid = b.payment_completion_state === "DEPOSIT_PAID" && Number(b.remaining_balance) > 0;

            return (
              <div
                key={delivery.id}
                className="bg-surface border border-border-custom rounded-3xl p-6 shadow-md space-y-6 hover:border-border-custom/80 transition duration-150"
              >
                {/* Card Header metadata */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom/40 pb-4">
                  <div>
                    <span className="text-[10px] text-text-muted font-mono font-bold block">{b.booking_number}</span>
                    <h3 className="font-extrabold text-sm text-text-main mt-0.5">{b.title}</h3>
                    <p className="text-[9px] text-text-sub font-semibold mt-1">
                      Assigned Professional: <span className="text-text-main font-bold">{assignedName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-text-muted font-semibold">
                      Shared: {new Date(delivery.shared_with_client_at).toLocaleDateString("en-IN")}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(friendlyStatus)}`}>
                      {friendlyStatus}
                    </span>
                  </div>
                </div>

                {/* Delivery Messages */}
                {delivery.message && (
                  <div className="text-xs text-text-sub bg-surface-elevated/40 border border-border-custom/50 p-4 rounded-2xl italic leading-relaxed">
                    <span className="text-[9px] font-bold text-text-muted block not-italic uppercase mb-1">Coordinator Message</span>
                    "{delivery.message}"
                  </div>
                )}

                {/* Shared Files Grid */}
                {delivery.delivery_files && delivery.delivery_files.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Shared File Attachments</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {delivery.delivery_files.map((file: any) => (
                        <a
                          key={file.id}
                          href={getMediaUrl(file.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-surface hover:bg-surface-elevated border border-border-custom p-3.5 rounded-2xl flex items-center gap-3 transition text-xs font-semibold text-text-main"
                        >
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div className="truncate flex-1">
                            <span className="block truncate">{file.original_name || "Shared File"}</span>
                            {file.file_size && (
                              <span className="text-[9px] text-text-muted font-normal block mt-0.5">
                                {(file.file_size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                          </div>
                          <Download className="w-4 h-4 text-text-muted shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action CTA Buttons */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-border-custom/40">
                  
                  {/* Balance Payment Notice Prerequisite */}
                  {delivery.delivery_type === "FINAL" && balanceUnpaid && delivery.status === "PENDING" && (
                    <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs mb-2">
                      <div className="flex gap-2 items-center">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Balance payment is due before approving final delivered work.</span>
                      </div>
                      <Link
                        href={`/client/bookings/${b.id}/payment`}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-text-on-dark font-bold rounded-xl transition cursor-pointer text-center shrink-0"
                      >
                        Pay Balance
                      </Link>
                    </div>
                  )}

                  {delivery.status === "PENDING" && (
                    <>
                      {delivery.delivery_type === "FINAL" && (
                        <button
                          disabled={actionLoading || balanceUnpaid}
                          onClick={() => handleApproveFinalDelivery(b.id)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-elevated disabled:text-text-muted text-text-on-dark text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Accept Final Delivery
                        </button>
                      )}
                      
                      <button
                        disabled={actionLoading}
                        onClick={() => {
                          setActiveDeliveryId(delivery.id);
                          setActiveBookingId(b.id);
                          setShowRevisionModal(true);
                        }}
                        className="px-5 py-2.5 bg-surface hover:bg-surface-elevated text-text-main border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Request Revision
                      </button>
                    </>
                  )}
                </div>

                {/* Revision logs for this booking (Part 12) */}
                {revisionsMap[b.id] && revisionsMap[b.id].length > 0 && (
                  <div className="bg-surface-elevated/20 border border-border-custom/50 rounded-2xl p-4 space-y-3">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Revision Logs History</span>
                    <div className="space-y-3 divide-y divide-border-custom/30 text-[10px]">
                      {revisionsMap[b.id].map((rev, idx) => (
                        <div key={rev.id} className={`space-y-1.5 ${idx > 0 ? "pt-3" : ""}`}>
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-text-main">{rev.title}</span>
                            <span className="text-primary uppercase tracking-widest text-[8px]">{rev.status}</span>
                          </div>
                          <p className="text-text-sub leading-relaxed font-medium">{rev.description}</p>
                          <span className="text-[8px] text-text-muted block">
                            Requested: {new Date(rev.created_at).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}

          {filteredDeliveries.length === 0 && (
            /* Empty State Panel (Part 32) */
            <div className="py-24 text-center text-text-muted border border-dashed border-border-custom rounded-3xl flex flex-col justify-center items-center space-y-4">
              <Inbox className="w-10 h-10 text-text-muted" />
              <div>
                <h3 className="font-bold text-text-main text-sm">No Deliveries Found</h3>
                <p className="text-xs text-text-sub mt-1 max-w-xs mx-auto leading-relaxed">
                  {getEmptyStateMessage()}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Revision Request Dialog Modal (Part 20) */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <form onSubmit={handleRequestRevision} className="bg-surface border border-border-custom max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-text-main uppercase tracking-wider">Request Revision</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1">Revision Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Colour balance adjust, trimming edits"
                  value={revisionTitle}
                  onChange={(e) => setRevisionTitle(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1">Details & Instructions</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain exactly what adjustments are required..."
                  value={revisionDesc}
                  onChange={(e) => setRevisionDesc(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionTitle("");
                  setRevisionDesc("");
                }}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-lg transition"
              >
                Submit Revision Request
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
