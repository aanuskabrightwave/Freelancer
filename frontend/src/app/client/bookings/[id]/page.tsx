"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { workspaceService } from "@/services/workspace.service";
import { paymentService } from "@/services/payment.service";
import { getMediaUrl } from "@/lib/api";
import {
  Calendar,
  MapPin,
  Shield,
  MessageSquare,
  Sparkles,
  CheckCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  User,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

function BookingDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  // Actions loading
  const [actionLoading, setActionLoading] = useState(false);

  // Replacement approval/decline modal and input states (Part 17-26)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Revision request states (Part 30, 31)
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionDesc, setRevisionDesc] = useState("");

  // Dispute states
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");

  async function loadDetails() {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await bookingService.getBookingDetails(id as string);
      setBooking(data);

      // Fetch payment summary
      try {
        const paySum = await paymentService.getPaymentSummary(id as string);
        setPaymentStatus(paySum.payment_status);
      } catch (err) {
        setPaymentStatus("UNPAID");
      }

      // Fetch deliveries from workspace
      try {
        const delivs = await workspaceService.getDeliveries(id as string);
        setDeliveries(delivs);
      } catch (err) {
        setDeliveries([]);
      }
    } catch (err: any) {
      setErrorMsg("We couldn't load this booking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && id) {
      loadDetails();
    }
  }, [user, id]);

  const handleOpenChat = () => {
    if (booking?.conversation_id) {
      router.push(`/client/messages?active=${booking.conversation_id}`);
    } else {
      router.push(`/client/messages`);
    }
  };

  const handleAcceptQuote = async () => {
    try {
      setActionLoading(true);
      await bookingService.acceptQuote(booking.id);
      await loadDetails();
      alert("Quote accepted successfully! Deposit payment is now required.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to accept quote.");
    } finally {
      setActionLoading(false);
    }
  };

  // Replacement Approval Submission (Part 20)
  const handleApproveReplacement = async () => {
    if (!booking?.latest_assignment_id) return;
    try {
      setActionLoading(true);
      await bookingService.respondToReplacement(booking.id, booking.latest_assignment_id, true);
      setShowApproveConfirm(false);
      await loadDetails();
      alert("Professional approved successfully.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to approve professional proposal.");
    } finally {
      setActionLoading(false);
    }
  };

  // Replacement Decline Submission (Part 20)
  const handleDeclineReplacement = async () => {
    if (!booking?.latest_assignment_id) return;
    try {
      setActionLoading(true);
      await bookingService.respondToReplacement(
        booking.id,
        booking.latest_assignment_id,
        false,
        declineReason.trim() || undefined
      );
      setShowDeclineConfirm(false);
      setDeclineReason("");
      await loadDetails();
      alert("Proposal declined. Our team will match another professional for you.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to decline professional proposal.");
    } finally {
      setActionLoading(false);
    }
  };

  // Deliveries Approval & Revision (Part 30, 31)
  const handleApproveFinalDelivery = async () => {
    if (!window.confirm("Confirm final delivery approval? This releases the escrow balance payment.")) {
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.approveFinalDelivery(booking.id);
      await loadDetails();
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
      await loadDetails();
      alert("Revision request submitted to Admin.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to request revision.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim() || !disputeDesc.trim()) {
      alert("Please fill in all dispute fields.");
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.openDispute(booking.id, disputeReason, disputeDesc);
      setShowDispute(false);
      setDisputeReason("");
      setDisputeDesc("");
      await loadDetails();
      alert("Dispute raised. Admin will review the details and contact you.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to raise dispute.");
    } finally {
      setActionLoading(false);
    }
  };

  // Client-Friendly Status Mapping (Part 6)
  const getClientFriendlyStatus = (b: any) => {
    const s = b.status;
    const payState = b.payment_completion_state;
    const assignStatus = b.latest_assignment_status;

    if (s === "CANCELLED") return "Cancelled";
    if (s === "REJECTED") return "Rejected";
    if (s === "COMPLETED") return "Completed";

    if (b.client_approval_required) {
      return "Your Approval Required";
    }

    if (s === "REQUESTED") {
      return "Awaiting Admin Review";
    }
    if (s === "MATCHING_IN_PROGRESS") {
      if (assignStatus === "OFFERED") {
        return "Professional Contacted";
      }
      return "Matching a Professional";
    }
    if (s === "CONFIRMED") {
      if (payState === "UNPAID") return "Deposit Due";
      return "Confirmed";
    }
    if (s === "IN_PROGRESS") {
      return "Work in Progress";
    }
    if (s === "DELIVERY_PENDING") {
      return "Admin Reviewing Work";
    }
    if (s === "RESCHEDULE_REQUESTED") {
      return "Reschedule Requested";
    }

    return s.replace(/_/g, " ");
  };

  const getStatusBadgeStyle = (statusLabel: string) => {
    switch (statusLabel) {
      case "Your Approval Required":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse";
      case "Awaiting Admin Review":
      case "Matching a Professional":
      case "Professional Contacted":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "Deposit Due":
      case "Balance Payment Due":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "Confirmed":
      case "Completed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Work in Progress":
        return "bg-primary/10 border-primary/20 text-primary";
      case "Admin Reviewing Work":
      case "Preparing Final Delivery":
      case "Delivery Ready":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "Cancelled":
      case "Rejected":
        return "bg-rose-950/40 border-rose-900/30 text-rose-300";
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

  if (!booking) {
    return (
      <div className="min-h-full bg-transparent text-text-sub flex justify-center items-center font-sans py-20">
        <div className="text-center space-y-4">
          <p>We couldn't load this booking.</p>
          <Link href="/client/bookings" className="text-xs text-primary font-bold uppercase tracking-wider hover:underline">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const friendlyStatus = getClientFriendlyStatus(booking);

  // Filter deliveries to only visible ones (Part 30)
  const visibleDeliveries = deliveries.filter((d: any) => d.shared_with_client_at !== null);

  // Status Timeline Helper Array (Part 13, 14)
  const timelineSteps = [
    { key: "SUBMITTED", label: "Booking Submitted", done: true },
    {
      key: "ADMIN_REVIEW",
      label: "Admin Review",
      done: booking.status !== "REQUESTED",
    },
    {
      key: "MATCHING",
      label: "Matching Professional",
      done: !["REQUESTED", "MATCHING_IN_PROGRESS"].includes(booking.status) || (booking.status === "MATCHING_IN_PROGRESS" && booking.latest_assignment_status === "OFFERED" && !booking.client_approval_required),
    },
    {
      key: "CONFIRMED",
      label: "Professional Confirmed",
      done: !["REQUESTED", "MATCHING_IN_PROGRESS"].includes(booking.status),
    },
    {
      key: "DEPOSIT",
      label: "Deposit Paid",
      done: ["DEPOSIT_PAID", "FULLY_PAID"].includes(booking.payment_completion_state),
    },
    {
      key: "WORK",
      label: "Work in Progress",
      done: ["DELIVERY_PENDING", "COMPLETED"].includes(booking.status),
    },
    {
      key: "DELIVERY",
      label: "Delivery Ready",
      done: booking.status === "COMPLETED" || visibleDeliveries.some((d) => d.status === "APPROVED"),
    },
    { key: "COMPLETED", label: "Completed", done: booking.status === "COMPLETED" },
  ];

  // Determine current active timeline index
  let activeStepIndex = 0;
  for (let i = timelineSteps.length - 1; i >= 0; i--) {
    if (timelineSteps[i].done) {
      activeStepIndex = i;
      break;
    }
  }

  return (
    <div className="min-h-full bg-transparent text-text-main py-12 px-4 md:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border-custom/50 pb-4">
          <div>
            <Link href="/client/bookings" className="text-xs text-primary font-black uppercase tracking-wider hover:underline flex items-center gap-1.5">
              ← Back to Bookings
            </Link>
            <h1 className="text-lg md:text-xl font-black mt-2 text-text-main flex items-center gap-3">
              <span>{booking.title}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(friendlyStatus)}`}>
                {friendlyStatus}
              </span>
            </h1>
            <p className="text-[10px] text-text-muted mt-1 font-mono uppercase tracking-wider">
              Booking Ref: {booking.booking_number} • Source: {booking.source_type.replace(/_/g, " ")} Booking
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleOpenChat}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message Admin</span>
            </button>
            {["REQUESTED", "CONFIRMED", "IN_PROGRESS"].includes(booking.status) && (
              <button
                onClick={() => setShowDispute(true)}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated text-rose-500 border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Raise Dispute
              </button>
            )}
          </div>
        </div>

        {/* Timeline Progress Section (Part 13, 14) */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-6">
          <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Progress Timeline</h3>
          <div className="grid grid-cols-2 md:grid-cols-8 gap-4 text-center">
            {timelineSteps.map((step, idx) => {
              const isDone = step.done;
              const isCurrent = idx === activeStepIndex;
              return (
                <div key={step.key} className="space-y-2 relative flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                    isDone 
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      : isCurrent
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-surface-elevated border-border-custom text-text-muted"
                  }`}>
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <span className={`text-[9px] font-black leading-tight tracking-tight uppercase block ${
                    isDone ? "text-text-main" : isCurrent ? "text-primary" : "text-text-muted"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns: Professional Proposed / Details */}
          <div className="lg:col-span-2 space-y-8">

            {/* Replacement Creator proposal section (Part 17-26) */}
            {booking.client_approval_required && booking.proposed_freelancer && (
              <div className="bg-gradient-to-br from-amber-950/20 to-surface border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 animate-in fade-in duration-200">
                <div className="flex gap-3 items-start text-amber-300">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">Professional Change Approval</h3>
                    <p className="text-[11px] text-amber-400 mt-1 leading-relaxed">
                      Our team has proposed a different professional for this booking. Please review the profile and confirm whether you'd like to continue with this professional.
                    </p>
                  </div>
                </div>

                {/* Proposed Professional Card */}
                <div className="bg-surface-elevated border border-border-custom rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-14 h-14 bg-surface border border-border-custom rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
                    {booking.proposed_freelancer.profile_photo_url ? (
                      <img
                        src={getMediaUrl(booking.proposed_freelancer.profile_photo_url)}
                        alt={booking.proposed_freelancer.user?.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-text-muted font-bold">No Photo</span>
                    )}
                  </div>
                  <div className="text-xs space-y-1.5 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-text-main text-sm">{booking.proposed_freelancer.user?.full_name}</h4>
                        <p className="text-text-sub text-[10px] uppercase font-bold text-primary">
                          {booking.proposed_freelancer.primary_profession?.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Link
                        href={`/freelancers/${booking.proposed_freelancer.id}`}
                        target="_blank"
                        className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="flex gap-4 text-[10px] text-text-muted font-semibold pt-1 border-t border-border-custom/50">
                      <span>Rating: {booking.proposed_freelancer.average_rating ? `${booking.proposed_freelancer.average_rating} ⭐` : "N/A"}</span>
                      <span>Location: {booking.proposed_freelancer.city || "Remote"}</span>
                    </div>
                  </div>
                </div>

                {/* Response Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowApproveConfirm(true)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-text-on-dark text-xs font-bold rounded-xl transition cursor-pointer text-center"
                  >
                    Approve Professional
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowDeclineConfirm(true)}
                    className="flex-1 py-2.5 bg-surface hover:bg-surface-elevated text-rose-400 border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer text-center"
                  >
                    Decline Professional
                  </button>
                </div>
              </div>
            )}

            {/* General Professional summary (Part 11) */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Professional Assignment Status</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Originally Selected */}
                <div className="bg-surface-elevated border border-border-custom/50 p-4 rounded-2xl space-y-3">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted block">Originally Selected</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-text-muted font-bold text-xs">
                      {booking.selected_freelancer?.profile_photo_url ? (
                        <img
                          src={getMediaUrl(booking.selected_freelancer.profile_photo_url)}
                          alt={booking.selected_freelancer.user?.full_name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-text-main text-xs">{booking.selected_freelancer?.user?.full_name || "N/A"}</h4>
                      <span className="text-[10px] text-text-sub block">{booking.selected_freelancer?.primary_profession?.replace(/_/g, " ") || "Creative Professional"}</span>
                    </div>
                  </div>
                </div>

                {/* Currently Assigned */}
                <div className="bg-surface-elevated border border-border-custom/50 p-4 rounded-2xl space-y-3">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted block">Assigned Professional</span>
                  {booking.freelancer ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-text-muted font-bold text-xs">
                        {booking.freelancer.profile_photo_url ? (
                          <img
                            src={getMediaUrl(booking.freelancer.profile_photo_url)}
                            alt={booking.freelancer.user?.full_name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-primary text-xs">{booking.freelancer.user?.full_name}</h4>
                        <span className="text-[10px] text-text-sub block">{booking.freelancer.primary_profession?.replace(/_/g, " ") || "Assigned Creator"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center h-10 text-[10px] text-text-sub/70 italic">
                      {booking.latest_assignment_status === "OFFERED"
                        ? "Contacted professional, awaiting acceptance"
                        : "Coordinator is reviewing matching creators"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Logistics */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Booking Logistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted block">Execution Date</span>
                  <p className="text-text-main mt-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span>{booking.scheduled_date ? booking.scheduled_date : "Not scheduled"}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted block">Venue / Address</span>
                  <p className="text-text-main mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span>{booking.booking_type === "REMOTE" ? "Remote Delivery" : booking.venue_name || booking.venue_address || "TBD"}</span>
                  </p>
                </div>
              </div>

              {booking.requirements_answers && Object.keys(booking.requirements_answers).length > 0 && (
                <div className="pt-4 border-t border-border-custom/50 space-y-3">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted block">Submitted Requirement Answers</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(booking.requirements_answers).map(([q, ans]: [string, any], idx) => (
                      <div key={idx} className="bg-surface-elevated/40 border border-border-custom/30 rounded-xl p-3 text-[10px]">
                        <span className="text-text-muted font-bold block">{q}</span>
                        <p className="text-text-main font-semibold mt-1 leading-relaxed">{String(ans)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.notes && (
                <div className="pt-4 border-t border-border-custom/50 text-[11px] space-y-1">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted block">Additional Notes</span>
                  <p className="text-text-sub leading-relaxed">{booking.notes}</p>
                </div>
              )}
            </div>

            {/* Deliveries & Revision logs (Part 30, 31) */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Fulfillment Deliveries</h3>

              {visibleDeliveries.length > 0 ? (
                <div className="space-y-6 divide-y divide-border-custom/50">
                  {visibleDeliveries.map((deliv, idx) => (
                    <div key={deliv.id} className={`space-y-4 ${idx > 0 ? "pt-6" : ""}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-black uppercase text-primary tracking-widest block">Version {deliv.version} • {deliv.delivery_type}</span>
                          <h4 className="font-extrabold text-text-main text-xs mt-0.5">{deliv.title}</h4>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                          deliv.status === "APPROVED"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : deliv.status === "REVISION_REQUESTED"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}>
                          {deliv.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      {deliv.message && (
                        <p className="text-xs text-text-sub bg-surface-elevated/40 border border-border-custom/50 p-3 rounded-xl italic">
                          "{deliv.message}"
                        </p>
                      )}

                      {/* Display Delivery Files */}
                      {deliv.delivery_files && deliv.delivery_files.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-text-muted uppercase">Shared Delivery Files</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {deliv.delivery_files.map((file: any) => (
                              <a
                                key={file.id}
                                href={getMediaUrl(file.file_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-surface hover:bg-surface-elevated border border-border-custom p-3 rounded-xl flex items-center gap-3 transition text-[10px] font-semibold text-text-main"
                              >
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <div className="truncate flex-1">
                                  <span className="block truncate">{file.original_name || "Attachment File"}</span>
                                  {file.file_size && (
                                    <span className="text-[8px] text-text-muted font-normal block mt-0.5">
                                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  )}
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions for active delivery */}
                      {deliv.status === "PENDING" && (
                        <div className="flex gap-2">
                          {deliv.delivery_type === "FINAL" ? (
                            <button
                              onClick={handleApproveFinalDelivery}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-text-on-dark text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              Approve Final Delivery
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-sub font-semibold">Preview delivery approved by Admin.</span>
                          )}

                          <button
                            onClick={() => {
                              setActiveDeliveryId(deliv.id);
                              setShowRevisionModal(true);
                            }}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-main border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Request Revision
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-text-muted italic bg-surface-elevated/40 border border-border-custom/50 rounded-2xl">
                  {booking.status === "DELIVERY_PENDING"
                    ? "Freelancer has submitted work. Admin is currently reviewing files before sharing with you."
                    : "Fulfillment files will appear here once submitted and verified by Admin."}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Payments / Action sidebar (Part 27, 28) */}
          <div className="space-y-6">

            {/* Payment Summary */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
              <span className="text-[10px] text-primary font-black uppercase tracking-wider block">Financial Summary</span>
              
              <div className="space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-text-sub">Total Agreed Price</span>
                  <span className="text-sm font-bold text-text-main">₹{Number(booking.agreed_amount).toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between items-center border-t border-border-custom/40 pt-2">
                  <span className="text-text-sub">Required Deposit</span>
                  <span className="text-text-main">₹{Number(booking.deposit_amount).toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between items-center border-t border-border-custom/40 pt-2">
                  <span className="text-text-sub">Deposit Paid Amount</span>
                  <span className={`font-bold ${Number(booking.deposit_paid_amount) > 0 ? "text-emerald-450" : "text-amber-500"}`}>
                    ₹{Number(booking.deposit_paid_amount).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-border-custom/40 pt-2">
                  <span className="text-text-sub">Remaining Balance Due</span>
                  <span className="text-text-main">₹{Number(booking.remaining_balance).toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between items-center border-t border-border-custom/40 pt-2">
                  <span className="text-text-sub">Total Paid to Date</span>
                  <span className="font-bold text-emerald-450">₹{Number(booking.total_paid).toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between items-center border-t border-border-custom/40 pt-2">
                  <span className="text-text-sub">Payment Status</span>
                  <span className="font-black uppercase tracking-wider text-[10px] text-primary">
                    {booking.payment_completion_state.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border-custom/50 space-y-2">
                
                {/* Accept Quote Action */}
                {booking.status === "PENDING_CONFIRMATION" && (
                  <button
                    disabled={actionLoading}
                    onClick={handleAcceptQuote}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider"
                  >
                    Accept Quote
                  </button>
                )}

                {/* Deposit Payment trigger (Part 28) */}
                {booking.status === "CONFIRMED" && booking.payment_completion_state === "UNPAID" && (
                  <Link
                    href={`/client/bookings/${booking.id}/payment`}
                    className="w-full block text-center py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider shadow-md"
                  >
                    Pay Deposit (₹{Number(booking.deposit_amount).toLocaleString("en-IN")})
                  </Link>
                )}

                {/* Balance Payment trigger */}
                {booking.payment_completion_state === "DEPOSIT_PAID" && Number(booking.remaining_balance) > 0 && (
                  <Link
                    href={`/client/bookings/${booking.id}/payment`}
                    className="w-full block text-center py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider shadow-md"
                  >
                    Pay Balance (₹{Number(booking.remaining_balance).toLocaleString("en-IN")})
                  </Link>
                )}
                
              </div>
            </div>

            {/* Platform notice coordinator */}
            <div className="bg-surface border border-border-custom rounded-3xl p-5 shadow-sm text-xs text-text-sub space-y-2 leading-relaxed">
              <Shield className="w-4 h-4 text-primary" />
              <p className="font-bold text-text-main">Platform Coordination Notice:</p>
              <p>
                Our administrators mediate all milestone tasks, deliverables, and conflict disputes directly. Private contact details are hidden to secure your contract execution.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Approve Proposed Professional Dialog Modal (Part 21) */}
      {showApproveConfirm && booking.proposed_freelancer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-custom max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-text-main uppercase tracking-wider">Approve Professional?</h3>
            <p className="text-xs text-text-sub leading-relaxed">
              You are approving <strong className="text-text-main">{booking.proposed_freelancer.user?.full_name}</strong> as the professional for this booking. Continue?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveReplacement}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-text-on-dark text-xs font-bold rounded-lg transition"
              >
                Approve Professional
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Proposed Professional Dialog Modal (Part 22) */}
      {showDeclineConfirm && booking.proposed_freelancer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-custom max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-text-main uppercase tracking-wider">Decline Professional?</h3>
            <div className="space-y-3">
              <p className="text-xs text-text-sub leading-relaxed">
                Why would you prefer another option? (Optional)
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={2}
                placeholder="Notes for the administrator coordinator..."
                className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setShowDeclineConfirm(false);
                  setDeclineReason("");
                }}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineReplacement}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-text-on-dark text-xs font-bold rounded-lg transition"
              >
                Decline Professional
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Request Form Modal Overlay */}
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
                  placeholder="e.g. Color balance adjust, trimming edits"
                  value={revisionTitle}
                  onChange={(e) => setRevisionTitle(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none"
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
                  className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-text-main resize-none focus:outline-none"
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

      {/* Raising Dispute Form Modal Overlay */}
      {showDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
          <form onSubmit={handleOpenDispute} className="bg-surface border border-border-custom max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 font-sans">
            <h3 className="font-bold text-sm text-rose-500 uppercase tracking-wider">Raise Contract Dispute</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1">Dispute Topic / Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Non-delivery, poor execution specs"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-text-muted mb-1">Description of Issues</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the issues in full for the coordinator..."
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-text-main resize-none focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDispute(false);
                  setDisputeReason("");
                  setDisputeDesc("");
                }}
                className="px-3.5 py-1.5 bg-background border border-border-custom rounded-lg text-text-sub text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-text-on-dark text-xs font-bold rounded-lg transition"
              >
                File Dispute
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default function BookingDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BookingDetailsContent />
    </Suspense>
  );
}
