"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { messageService } from "@/services/message.service";
import { paymentService } from "@/services/payment.service";
import { workspaceService } from "@/services/workspace.service";
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ChevronRight,
  Inbox,
  FileText,
  Plus,
  Trash,
  Paperclip,
  Link2
} from "lucide-react";

function BookingDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  // Interaction response states
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseType, setResponseType] = useState<"REJECT" | "COUNTER">("REJECT");
  const [reason, setReason] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNotes, setCounterNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showStartWorkConfirm, setShowStartWorkConfirm] = useState(false);

  // Deliveries list state
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);

  // Submission Form States
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [uploadedFileIds, setUploadedFileIds] = useState<number[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);
  const [shareLinkLabel, setShareLinkLabel] = useState("");
  const [shareLinkUrl, setShareLinkUrl] = useState("");
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const handleAcceptAssignment = async () => {
    if (!activeAssignment || submitting) return;
    const confirm = window.confirm("Are you sure you want to accept this assignment?");
    if (!confirm) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await bookingService.acceptAssignment(activeAssignment.id);
      await loadDetails();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to accept assignment offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectOrCounterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || submitting) return;

    if (!reason.trim()) {
      alert("Please provide a mandatory reason for decline/counter.");
      return;
    }

    let payload: any = {
      reason: reason.trim()
    };

    if (responseType === "COUNTER") {
      const amt = parseFloat(counterAmount);
      if (isNaN(amt) || amt <= 0) {
        alert("Please enter a valid counter offer amount.");
        return;
      }
      payload.counter_offer_amount = amt;
      if (counterNotes.trim()) {
        payload.counter_offer_notes = counterNotes.trim();
      }
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await bookingService.rejectAssignment(activeAssignment.id, payload);
      setShowResponseForm(false);
      setReason("");
      setCounterAmount("");
      setCounterNotes("");
      await loadDetails();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to decline or counter assignment offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validate size (e.g. 100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      alert("This file is too large. Safe upload limit is 100MB.");
      return;
    }

    const fileObj = { name: file.name, status: "uploading" };
    setUploadingFiles((prev) => [...prev, fileObj]);

    try {
      const res = await workspaceService.uploadFile(id as string, file, "FINAL_DELIVERY");
      setUploadedFiles((prev) => [...prev, res]);
      setUploadedFileIds((prev) => [...prev, res.id]);
      setUploadingFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, status: "done" } : f))
      );
    } catch (err) {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, status: "failed" } : f))
      );
      alert("We couldn't upload this file.");
    }
  };

  const handleAddLink = async () => {
    if (!shareLinkLabel.trim() || !shareLinkUrl.trim()) {
      alert("Please provide both a link label and url.");
      return;
    }
    if (!shareLinkUrl.startsWith("http://") && !shareLinkUrl.startsWith("https://")) {
      alert("Please enter a valid URL beginning with http:// or https://");
      return;
    }

    try {
      setSubmitting(true);
      const res = await workspaceService.shareLink(id as string, shareLinkLabel.trim(), shareLinkUrl.trim());
      setSharedLinks((prev) => [...prev, res]);
      setShareLinkLabel("");
      setShareLinkUrl("");
    } catch (err) {
      alert("Failed to share link.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDeliveryToAdmin = async () => {
    if (!submitTitle.trim()) {
      alert("Please enter a submission title.");
      return;
    }
    if (uploadedFileIds.length === 0 && !submitNotes.trim() && sharedLinks.length === 0) {
      alert("Please provide either uploaded files, external links, or descriptive notes.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await workspaceService.submitDelivery(id as string, {
        delivery_type: "FINAL",
        title: submitTitle.trim(),
        message: submitNotes.trim(),
        file_ids: uploadedFileIds
      });
      setShowSubmitConfirm(false);
      setSubmitTitle("");
      setSubmitNotes("");
      setUploadedFileIds([]);
      setUploadedFiles([]);
      setUploadingFiles([]);
      setSharedLinks([]);
      await loadDetails();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "We couldn't submit your work.");
      setShowSubmitConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFile = async (fileId: number) => {
    try {
      await workspaceService.deleteFile(id as string, fileId);
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
      setUploadedFileIds((prev) => prev.filter((fid) => fid !== fileId));
    } catch (err) {
      alert("Failed to remove file.");
    }
  };

  async function loadDetails() {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const [bookingData, assignmentsList] = await Promise.all([
        bookingService.getBookingDetails(id as string),
        bookingService.getFreelancerAssignments().catch(() => [])
      ]);
      
      setBooking(bookingData);
      
      // Find active assignment offer for this booking
      const match = assignmentsList.find((a: any) => a.booking_id === bookingData.id);
      setActiveAssignment(match || null);

      try {
        const paySum = await paymentService.getPaymentSummary(id as string);
        setPaymentStatus(paySum.payment_status);
      } catch (err) {
        setPaymentStatus("UNPAID");
      }

      try {
        const deliveriesList = await workspaceService.getDeliveries(bookingData.id);
        setDeliveries(deliveriesList);
      } catch (err) {
        setDeliveries([]);
      }

      try {
        const revisionsList = await workspaceService.getRevisions(bookingData.id);
        setRevisions(revisionsList);
      } catch (err) {
        setRevisions([]);
      }
    } catch (err: any) {
      setErrorMsg("Failed to retrieve booking request details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && id) {
      loadDetails();
    }
  }, [user, id]);

  // Direct Freelancer ↔ Admin chat room navigation (Part 12)
  const handleOpenAdminChat = async () => {
    if (!booking || chatLoading) return;
    try {
      setChatLoading(true);
      setErrorMsg(null);
      
      const conversations = await messageService.getConversations();
      // Scopes only FREELANCER_ADMIN conversation for this booking
      const existingConvo = conversations.find(
        (c: any) => c.conversation_type === "FREELANCER_ADMIN" && c.booking_id === booking.id
      );

      if (existingConvo) {
        router.push(`/freelancer/messages?active=${existingConvo.id}`);
      } else {
        setErrorMsg("Admin-mediated messaging channel is not created yet.");
      }
    } catch (err: any) {
      setErrorMsg("Failed to open coordination chat with Admin.");
    } finally {
      setChatLoading(false);
    }
  };

  // Status Badge Mapper (Part 6)
  const getFriendlyAssignmentStatus = (status: string, hasCounter: boolean) => {
    switch (status) {
      case "OFFERED":
        return { label: "Awaiting Your Response", style: "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold animate-pulse" };
      case "REJECTED":
        return hasCounter
          ? { label: "Counter Sent", style: "bg-blue-500/10 border-blue-500/30 text-blue-400" }
          : { label: "Declined", style: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
      case "ACCEPTED":
        return { label: "Waiting for Client Approval", style: "bg-purple-500/10 border-purple-500/30 text-purple-400" };
      case "CONFIRMED":
        return { label: "Confirmed", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
      default:
        return { label: status.replace(/_/g, " "), style: "bg-surface-elevated border-border-custom text-text-sub" };
    }
  };

  const getFriendlyBookingStatus = (b: any) => {
    const s = b.status;
    const payState = b.payment_completion_state;
    const hasActiveRev = revisions.some((r: any) => r.status === "OPEN" || r.status === "IN_PROGRESS");

    if (s === "CONFIRMED") {
      return payState === "UNPAID"
        ? { label: "Waiting for Client Deposit", style: "bg-rose-500/10 border-rose-500/30 text-rose-450 font-bold" }
        : { label: "Ready to Start", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse" };
    }
    if (s === "IN_PROGRESS") {
      return hasActiveRev
        ? { label: "Revision Required", style: "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse font-bold" }
        : { label: "In Progress", style: "bg-primary/10 border-primary/20 text-primary font-bold" };
    }
    if (s === "DELIVERY_PENDING") {
      return { label: "Submitted to Admin", style: "bg-blue-500/10 border-blue-500/30 text-blue-400" };
    }
    if (s === "COMPLETED") {
      return { label: "Completed", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-450" };
    }
    if (s === "CANCELLED" || s === "REJECTED") {
      return { label: "Cancelled", style: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
    }
    return { label: s.replace(/_/g, " "), style: "bg-surface-elevated border-border-custom text-text-sub" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background text-text-sub flex justify-center items-center">
        Booking details are unavailable.
      </div>
    );
  }

  const hasAssignmentOffer = activeAssignment !== null;
  const assignmentStatus = hasAssignmentOffer 
    ? getFriendlyAssignmentStatus(activeAssignment.status, activeAssignment.counter_offer_amount !== null)
    : null;
  const bookingStatus = getFriendlyBookingStatus(booking);

  const offeredPayout = hasAssignmentOffer 
    ? activeAssignment.offered_payout_amount 
    : booking.agreed_amount;

  const isDepositPaid = booking.payment_completion_state !== "UNPAID";
  const activeRevision = revisions.find((r: any) => r.status === "OPEN" || r.status === "IN_PROGRESS");

  return (
    <div className="min-h-screen bg-background text-text-main py-12 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex justify-between items-center">
          <Link
            href="/freelancer/bookings"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-sub hover:text-text-main transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Bookings</span>
          </Link>
          <span className="text-[10px] text-text-muted font-mono font-bold">Booking #{booking.booking_number}</span>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Header Block */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <span className="text-[10px] text-primary font-black uppercase tracking-wider block mb-1">
                Fulfillment Workspace
              </span>
              <h1 className="text-lg md:text-xl font-black text-text-main leading-tight">{booking.title}</h1>
              {booking.client?.full_name && (
                <p className="text-xs text-text-sub mt-2 font-semibold">
                  Coordinated for: <span className="text-text-main font-extrabold">{booking.client?.full_name}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${bookingStatus.style}`}>
                Booking: {bookingStatus.label}
              </span>
              {hasAssignmentOffer && (
                <span className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${assignmentStatus?.style}`}>
                  Assignment: {assignmentStatus?.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Panels */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Job Requirements (Part 10) */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Job Requirements</h3>
              
              <div className="space-y-4 text-xs text-text-sub font-semibold">
                {booking.notes && (
                  <div className="p-3.5 bg-background border border-border-custom/50 rounded-2xl text-[11px] leading-relaxed italic text-text-sub">
                    "{booking.notes}"
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-text-muted text-[9px] uppercase tracking-wider block">Service Category</span>
                    <strong className="text-text-main text-xs">{booking.service?.title || "Creative Production"}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted text-[9px] uppercase tracking-wider block">Agreed Budget Payout</span>
                    <strong className="text-text-main text-xs">₹{Number(offeredPayout).toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                {booking.booking_type !== "REMOTE" && (
                  <div className="pt-3 border-t border-border-custom/30 space-y-2">
                    <span className="text-text-muted text-[9px] uppercase tracking-wider block">Venue Details</span>
                    <strong className="text-text-main block">{booking.venue_name}</strong>
                    <p className="text-text-muted font-normal">{booking.venue_address}</p>
                    {booking.location_city && (
                      <p className="text-text-main font-bold">
                        {booking.location_city}, {booking.location_state || ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submitted Answers */}
            {booking.requirements_answers && Object.keys(booking.requirements_answers).length > 0 && (
              <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Requirement Questionnaire</h3>
                <div className="divide-y divide-border-custom/40">
                  {Object.entries(booking.requirements_answers).map(([key, val]: [string, any], idx) => (
                    <div key={idx} className="py-3 text-xs flex justify-between gap-4 font-semibold">
                      <span className="text-text-sub">{key}</span>
                      <span className="text-text-main text-right max-w-xs truncate">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Counter Offer History (Part 23) */}
            {hasAssignmentOffer && activeAssignment.counter_offer_amount !== null && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl space-y-2 text-xs">
                <h4 className="font-extrabold text-blue-300 uppercase tracking-wider text-[10px]">Your Prior Counter Offer</h4>
                <div className="space-y-1.5 font-semibold">
                  <p className="text-text-main">
                    Amount: <strong className="text-blue-450">₹{Number(activeAssignment.counter_offer_amount).toLocaleString("en-IN")}</strong>
                  </p>
                  {activeAssignment.counter_offer_notes && (
                    <p className="text-text-sub italic">"{activeAssignment.counter_offer_notes}"</p>
                  )}
                  <p className="text-[9px] text-text-muted">
                    Response Date: {new Date(activeAssignment.responded_at || "").toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Action Sidebar Controls */}
          <div className="space-y-6">
            
            {/* Offer / Assignment Section (Part 11) */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
              <span className="text-[10px] text-primary font-black uppercase tracking-wider block">Fulfillment Action Area</span>
              
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-text-sub">Execution Date</span>
                  <span className="text-text-main font-bold text-right">
                    {booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString("en-IN") : "Flexible Schedule"}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-border-custom/30 pt-3">
                  <span className="text-text-sub">Payout Amount</span>
                  <span className="text-sm font-black text-primary">₹{Number(offeredPayout).toLocaleString("en-IN")}</span>
                </div>

                {/* Deposit Gating alerts (Part 16 & 19) */}
                {booking.status === "CONFIRMED" && !isDepositPaid && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold p-3 rounded-xl flex items-start gap-2 mb-2 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Waiting for Client Deposit. You cannot start work yet.</span>
                  </div>
                )}

                {/* Action Buttons Section */}
                <div className="pt-4 space-y-2 border-t border-border-custom/30">
                                   {hasAssignmentOffer && activeAssignment.status === "OFFERED" && (
                    <div className="space-y-4">
                      {!showResponseForm ? (
                        <div className="space-y-2">
                          <button
                            onClick={handleAcceptAssignment}
                            disabled={submitting}
                            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider disabled:opacity-50"
                          >
                            {submitting ? "Processing..." : "Accept Assignment"}
                          </button>
                          <button
                            onClick={() => setShowResponseForm(true)}
                            disabled={submitting}
                            className="w-full py-2 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub text-xs font-bold rounded-xl transition uppercase tracking-wider"
                          >
                            Reject / Counter Offer
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleRejectOrCounterSubmit} className="space-y-3.5 border border-border-custom/60 rounded-2xl p-4 bg-background/50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <h4 className="text-[10px] text-text-main font-bold uppercase tracking-wider">Decline or Negotiate</h4>
                          
                          {/* Response type toggler */}
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-elevated rounded-xl">
                            <button
                              type="button"
                              onClick={() => setResponseType("REJECT")}
                              className={`py-1 text-[10px] font-black uppercase rounded-lg transition ${
                                responseType === "REJECT" ? "bg-background text-rose-450 border border-border-custom shadow-sm" : "text-text-muted hover:text-text-main"
                              }`}
                            >
                              Just Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => setResponseType("COUNTER")}
                              className={`py-1 text-[10px] font-black uppercase rounded-lg transition ${
                                responseType === "COUNTER" ? "bg-background text-blue-450 border border-border-custom shadow-sm" : "text-text-muted hover:text-text-main"
                              }`}
                            >
                              Counter Offer
                            </button>
                          </div>

                          {/* Mandatory Decline / Counter Reason */}
                          <div>
                            <label className="block text-[8px] text-text-muted uppercase font-bold mb-1">
                              Reason * (Mandatory decline justification)
                            </label>
                            <textarea
                              rows={2}
                              required
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder={
                                responseType === "COUNTER" 
                                  ? "Provide context for this renegotiation..." 
                                  : "Why are you declining this booking assignment..."
                              }
                              className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
                            />
                          </div>

                          {/* Counter Offer Specifics */}
                          {responseType === "COUNTER" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                              <div>
                                <label className="block text-[8px] text-text-muted uppercase font-bold mb-1">
                                  Counter Offer Amount (₹) *
                                </label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={counterAmount}
                                  onChange={(e) => setCounterAmount(e.target.value)}
                                  placeholder="e.g. 35000"
                                  className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] text-text-muted uppercase font-bold mb-1">
                                  Counter Notes (Optional)
                                </label>
                                <textarea
                                  rows={2}
                                  value={counterNotes}
                                  onChange={(e) => setCounterNotes(e.target.value)}
                                  placeholder="Any additional schedule details..."
                                  className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main resize-none focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {/* Submit Actions */}
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => {
                                setShowResponseForm(false);
                                setReason("");
                                setCounterAmount("");
                                setCounterNotes("");
                              }}
                              className="px-3 py-1.5 bg-background border border-border-custom text-[10px] font-bold rounded-lg text-text-sub hover:bg-surface-elevated transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submitting}
                              className={`px-4.5 py-1.5 text-[10px] font-black uppercase rounded-lg text-text-on-dark transition ${
                                responseType === "COUNTER" 
                                  ? "bg-blue-600 hover:bg-blue-500" 
                                  : "bg-rose-600 hover:bg-rose-500"
                              }`}
                            >
                              {submitting ? "Sending..." : "Submit Response"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Client Approval Pending (Part 15) */}
                  {hasAssignmentOffer && activeAssignment.status === "ACCEPTED" && booking.status !== "CONFIRMED" && (
                    <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold p-3.5 rounded-xl text-center leading-relaxed">
                      You accepted this assignment. Waiting for Client approval.
                    </div>
                  )}

                  {/* Ready to Start status view (Part 17 & 8) */}
                  {booking.status === "CONFIRMED" && isDepositPaid && (
                    <div className="space-y-2">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold p-3 rounded-xl text-center leading-relaxed font-sans">
                        Assignment Confirmed & Deposit Verified. Ready to Start.
                      </div>
                      <button
                        onClick={() => setShowStartWorkConfirm(true)}
                        disabled={submitting}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider disabled:opacity-50"
                      >
                        {submitting ? "Starting..." : "Start Work"}
                      </button>
                    </div>
                  )}

                  {/* Work in Progress status view (Part 14, 15, 34) */}
                  {booking.status === "IN_PROGRESS" && (
                    <div className="space-y-4">
                      {activeRevision ? (
                        <>
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] font-bold p-3 rounded-xl text-center leading-relaxed font-sans animate-pulse">
                            Revision Required
                          </div>

                          {/* Revision Request Details Section (Part 4 & 5) */}
                          <div className="bg-surface-elevated/40 border border-border-custom/60 rounded-2xl p-4 space-y-3 text-xs font-semibold text-text-sub font-sans">
                            <span className="text-[8px] text-rose-450 uppercase tracking-wider block font-black">
                              Revision Request
                            </span>
                            <div className="text-text-main font-extrabold text-sm">
                              {activeRevision.title}
                            </div>
                            <div className="bg-background border border-border-custom/50 rounded-xl p-3 text-[10px] font-normal text-text-sub leading-relaxed whitespace-pre-wrap">
                              {activeRevision.description}
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-text-muted font-bold border-t border-border-custom/40 pt-2.5">
                              <span>Round: #{revisions.indexOf(activeRevision) + 1}</span>
                              <span>Requested: {new Date(activeRevision.created_at).toLocaleDateString("en-IN")}</span>
                            </div>

                            {activeRevision.status === "OPEN" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setSubmitting(true);
                                    await workspaceService.startRevisionWork(activeRevision.id);
                                    await loadDetails();
                                  } catch (err) {
                                    alert("Failed to acknowledge revision request.");
                                  } finally {
                                    setSubmitting(false);
                                  }
                                }}
                                disabled={submitting}
                                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-text-on-dark text-[10px] font-black uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                              >
                                {submitting ? "Processing..." : "Acknowledge & Start Revision"}
                              </button>
                            )}
                          </div>

                          {/* Submit Revised Work Form (Part 10, 15, 16) */}
                          {activeRevision.status === "IN_PROGRESS" && (
                            <div className="border border-border-custom/80 rounded-2xl p-4 space-y-4 bg-surface-elevated/20 font-sans">
                              <span className="font-extrabold block text-text-main text-[11px] uppercase tracking-wider">
                                Submit Revised Work
                              </span>
                              <p className="text-[10px] text-text-muted">
                                Upload your corrected assets and notes addressing the requested feedback.
                              </p>

                              <div className="space-y-3">
                                <div>
                                  <label className="block text-[8px] text-text-muted uppercase font-bold mb-1">
                                    Revision Title *
                                  </label>
                                  <input
                                    type="text"
                                    value={submitTitle}
                                    onChange={(e) => setSubmitTitle(e.target.value)}
                                    placeholder="e.g. Revised Photos - Round 1"
                                    className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[8px] text-text-muted uppercase font-bold mb-1">
                                    Revision Notes *
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={submitNotes}
                                    onChange={(e) => setSubmitNotes(e.target.value)}
                                    placeholder="Explain the changes you made based on the revision request."
                                    className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
                                  />
                                </div>

                                {/* Files and links uploader */}
                                <div className="space-y-2">
                                  <label className="block text-[8px] text-text-muted uppercase font-bold">
                                    Updated Files
                                  </label>
                                  <div className="flex items-center justify-center border border-dashed border-border-custom/80 rounded-xl p-4 hover:bg-surface-elevated/40 transition cursor-pointer relative">
                                    <input
                                      type="file"
                                      onChange={handleFileUpload}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    <div className="text-center text-xs text-text-sub space-y-1">
                                      <Plus className="w-4 h-4 mx-auto text-text-muted" />
                                      <span>Upload Corrected Asset file</span>
                                    </div>
                                  </div>

                                  {uploadedFiles.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      {uploadedFiles.map((file) => (
                                        <div key={file.id} className="flex justify-between items-center bg-background border border-border-custom/50 rounded-lg p-2 text-xs font-semibold">
                                          <span className="truncate text-text-sub">{file.original_name}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveFile(file.id)}
                                            className="text-text-muted hover:text-rose-450 p-1"
                                          >
                                            <Trash className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!submitTitle.trim()) {
                                    alert("Please enter a submission title.");
                                    return;
                                  }
                                  if (!submitNotes.trim()) {
                                    alert("Please enter revision notes.");
                                    return;
                                  }
                                  setShowSubmitConfirm(true);
                                }}
                                disabled={submitting || uploadingFiles.some((f) => f.status === "uploading")}
                                className="w-full py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider disabled:opacity-50"
                              >
                                Submit Revised Work
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold p-3 rounded-xl text-center leading-relaxed font-sans">
                            Work in Progress
                          </div>
                          {booking.started_at && (
                            <div className="bg-surface-elevated/40 border border-border-custom/50 rounded-2xl p-3.5 text-xs text-text-sub font-semibold space-y-1.5">
                              <span className="text-text-muted text-[9px] uppercase tracking-wider block">Started At</span>
                              <span className="text-text-main font-bold block">
                                {new Date(booking.started_at).toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                          
                          {/* Live Work Submission Form (Part 2, 5, 14, 15) */}
                          <div className="border border-border-custom/80 rounded-2xl p-4 space-y-4 bg-surface-elevated/20">
                            <span className="font-extrabold block text-text-main text-[11px] uppercase tracking-wider">
                              Work Submission
                            </span>
                            <p className="text-[10px] text-text-muted font-sans">
                              Submit your completed work to our team for coordinator review.
                            </p>

                            <div className="space-y-3 font-sans">
                              <div>
                                <label className="block text-[8px] text-text-muted uppercase font-bold mb-1">
                                  Submission Title *
                                </label>
                                <input
                                  type="text"
                                  value={submitTitle}
                                  onChange={(e) => setSubmitTitle(e.target.value)}
                                  placeholder="e.g. Final High-Res Photos Submission"
                                  className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] text-text-muted uppercase font-bold mb-1">
                                  Submission Notes / Message (Optional)
                                </label>
                                <textarea
                                  rows={3}
                                  value={submitNotes}
                                  onChange={(e) => setSubmitNotes(e.target.value)}
                                  placeholder="Describe what you completed, important details, and anything our team should review."
                                  className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main resize-none focus:outline-none focus:border-primary"
                                />
                              </div>

                              {/* File Uploader (Part 7 & 12) */}
                              <div className="space-y-2">
                                <label className="block text-[8px] text-text-muted uppercase font-bold">
                                  Files
                                </label>
                                <div className="flex items-center justify-center border border-dashed border-border-custom/80 rounded-xl p-4 hover:bg-surface-elevated/40 transition cursor-pointer relative">
                                  <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  />
                                  <div className="text-center text-xs text-text-sub space-y-1">
                                    <Plus className="w-4 h-4 mx-auto text-text-muted" />
                                    <span>Upload Completed Asset file</span>
                                    <p className="text-[9px] text-text-muted">Sane limit up to 100MB per file</p>
                                  </div>
                                </div>

                                {/* Uploaded Files list (Part 13) */}
                                {uploadedFiles.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    {uploadedFiles.map((file) => (
                                      <div key={file.id} className="flex justify-between items-center bg-background border border-border-custom/50 rounded-lg p-2 text-xs font-semibold">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                          <span className="truncate text-text-sub">{file.original_name}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveFile(file.id)}
                                          className="text-text-muted hover:text-rose-450 p-1 transition"
                                          title="Remove file"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Uploading Files list status */}
                                {uploadingFiles.length > 0 && (
                                  <div className="space-y-1.5">
                                    {uploadingFiles.map((f, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-background border border-border-custom/40 rounded-lg p-2 text-[10px] text-text-muted">
                                        <span className="truncate">{f.name}</span>
                                        <span className="text-[9px] uppercase font-black shrink-0">
                                          {f.status === "uploading" ? "Uploading..." : f.status === "done" ? "Uploaded" : "Failed"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Link Sharing (Part 10 & 11) */}
                              <div className="space-y-2 border-t border-border-custom/40 pt-3">
                                <label className="block text-[8px] text-text-muted uppercase font-bold">
                                  Add Cloud Delivery Link
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={shareLinkLabel}
                                    onChange={(e) => setShareLinkLabel(e.target.value)}
                                    placeholder="Label (e.g. Google Drive)"
                                    className="bg-background border border-border-custom rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={shareLinkUrl}
                                    onChange={(e) => setShareLinkUrl(e.target.value)}
                                    placeholder="URL (https://...)"
                                    className="bg-background border border-border-custom rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleAddLink}
                                  className="w-full py-1.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub text-[10px] font-black uppercase rounded-lg transition"
                                >
                                  Share External Link
                                </button>

                                {/* Shared Links display */}
                                {sharedLinks.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    {sharedLinks.map((link) => (
                                      <div key={link.id} className="flex items-center gap-1.5 bg-background border border-border-custom/40 rounded-lg p-2 text-xs text-text-sub font-semibold">
                                        <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline hover:text-primary">
                                          {link.label}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Submit Button Trigger Confirmation Modal (Part 15 & 16) */}
                            <button
                              type="button"
                              onClick={() => {
                                  if (!submitTitle.trim()) {
                                    alert("Please enter a submission title.");
                                    return;
                                  }
                                  setShowSubmitConfirm(true);
                                }}
                              disabled={submitting || uploadingFiles.some((f) => f.status === "uploading")}
                              className="w-full py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider disabled:opacity-50"
                            >
                              Submit for Review
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Submitted to Admin State view (Part 20 & 26) */}
                  {booking.status === "DELIVERY_PENDING" && (
                    <div className="space-y-4">
                      <div className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold p-3 rounded-xl text-center leading-relaxed font-sans">
                        Submitted to Admin
                      </div>
                      
                      <div className="bg-surface-elevated border border-border-custom/80 rounded-2xl p-4 space-y-3 text-xs font-semibold text-text-sub font-sans">
                        <span className="text-[8px] text-text-muted uppercase tracking-wider block font-bold">Submission Received</span>
                        <p className="text-[10px] text-text-muted leading-relaxed font-normal">
                          Our team is currently reviewing your submitted deliverables. We'll let you know if any revision changes are required.
                        </p>
                        
                        {deliveries.length > 0 && (
                          <div className="space-y-2.5 pt-2.5 border-t border-border-custom/40">
                            <span className="text-[8px] text-text-muted uppercase tracking-wider block font-bold">Submitted Details</span>
                            <div className="text-text-main font-bold">Title: {deliveries[0].title}</div>
                            {deliveries[0].message && (
                              <div className="bg-background border border-border-custom/40 rounded-xl p-2.5 text-[10px] font-normal text-text-sub whitespace-pre-wrap">
                                {deliveries[0].message}
                              </div>
                            )}
                            <div className="text-[9px] text-text-muted font-mono font-bold">
                              Submitted At: {new Date(deliveries[0].submitted_at).toLocaleString("en-IN")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    disabled={chatLoading}
                    onClick={handleOpenAdminChat}
                    className="w-full py-2 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub hover:text-text-main text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message Coordinator</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* Start Work Confirmation Modal Dialog (Part 9 & 40) */}
        {showStartWorkConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-surface border border-border-custom max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
              <div>
                <h3 className="text-sm font-black text-text-main uppercase tracking-wider">Start Work?</h3>
                <p className="text-text-sub text-xs mt-1 leading-relaxed">
                  You’re about to begin work on this booking. Once started, the booking status will update to In Progress.
                </p>
              </div>

              <div className="bg-background border border-border-custom/60 p-4 rounded-2xl text-xs space-y-2.5 font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Booking Reference</span>
                  <span className="text-text-main font-mono font-bold">{booking.booking_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Shoot Date</span>
                  <span className="text-text-main font-bold">
                    {booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString("en-IN") : "Flexible"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-text-muted">Venue</span>
                  <span className="text-text-main font-bold truncate">{booking.venue_name || "Coordinated Location"}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border-custom/40 pt-2.5">
                  <span className="text-text-muted">Agreed Payout</span>
                  <span className="text-xs font-black text-primary">₹{Number(offeredPayout).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowStartWorkConfirm(false)}
                  className="px-4 py-2 bg-background border border-border-custom text-xs font-bold rounded-xl text-text-sub hover:bg-surface-elevated transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      setErrorMsg(null);
                      await bookingService.startBooking(booking.id);
                      setShowStartWorkConfirm(false);
                      await loadDetails();
                    } catch (err: any) {
                      setErrorMsg(err.response?.data?.detail || "We couldn't start this job. Please try again.");
                      setShowStartWorkConfirm(false);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? "Starting..." : "Start Work"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Submit Work Confirmation Modal Dialog (Part 16) */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-surface border border-border-custom max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
              <div>
                <h3 className="text-sm font-black text-text-main uppercase tracking-wider">Submit work for review?</h3>
                <p className="text-text-sub text-xs mt-1 leading-relaxed font-sans">
                  Your files, links, and notes will be sent to our marketplace team for review. They will not be shared with the Client automatically.
                </p>
              </div>

              <div className="flex gap-2 justify-end font-sans">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowSubmitConfirm(false)}
                  className="px-4 py-2 bg-background border border-border-custom text-xs font-bold rounded-xl text-text-sub hover:bg-surface-elevated transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitDeliveryToAdmin}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FreelancerBookingDetailsPage() {
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
