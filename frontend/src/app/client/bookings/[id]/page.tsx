"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { messageService } from "@/services/message.service";
import { paymentService } from "@/services/payment.service";
import ReviewForm from "@/components/reviews/ReviewForm";
import StarRating from "@/components/reviews/StarRating";

function getFriendlyStatus(status: string, payState?: string) {
  switch (status) {
    case "REQUESTED":
      return "Request Sent";
    case "PENDING_CONFIRMATION":
      return "Quote Received";
    case "CONFIRMED":
      return payState === "DEPOSIT_PAID" ? "Booking Confirmed" : "Deposit Required";
    case "IN_PROGRESS":
      return "Work in Progress";
    case "DELIVERY_PENDING":
      return "Fulfillment Underway";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "REJECTED":
      return "Rejected";
    case "RESCHEDULE_REQUESTED":
      return "Reschedule Requested";
    default:
      return status;
  }
}

function BookingDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  // Rescheduling states
  const [showReschedule, setShowReschedule] = useState(false);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedStart, setReschedStart] = useState("09:00");
  const [reschedEnd, setReschedEnd] = useState("18:00");
  const [reschedReason, setReschedReason] = useState("");
  const [reschedPending, setReschedPending] = useState<any | null>(null);

  // Cancellation states
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  async function loadDetails() {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await bookingService.getBookingDetails(id as string);
      setBooking(data);
      try {
        const paySum = await paymentService.getPaymentSummary(id as string);
        setPaymentStatus(paySum.payment_status);
      } catch (err) {
        setPaymentStatus("UNPAID");
      }

      // Find any pending reschedule requests
      if (data.status === "RESCHEDULE_REQUESTED") {
        // Fetch or simulate finding pending request.
        // We can check the booking details responses. In our backend booking response we returned reschedule properties if loaded.
        // Let's call the API if it's there or just parse details from the thread.
        // Wait, let's fetch reschedule requests for this booking. Or we can return it from the backend model properties.
        // In our backend model, `reschedule_requests` is a relationship. We can expose it or query it.
        // Wait! Let's check `backend/app/schemas/booking.py` -> we didn't add the list of reschedule requests to BookingResponse directly,
        // but we can query it or simply return the latest pending request on the booking!
        // Wait, did we return the pending reschedule properties on the booking?
        // Ah! In backend `BookingResponse`, we didn't add it, but we can call a GET endpoint or check if we can fetch it.
        // Wait! Let's check if we can fetch the latest pending reschedule request.
        // Let's create an endpoint in `backend/app/api/v1/endpoints/bookings.py` to get the pending reschedule request for a booking!
        // Actually, we don't even need a separate endpoint; we can just return the latest pending reschedule request directly inside `BookingResponse` schema
        // by adding a `pending_reschedule` property or field!
        // That is extremely clean. Let's look at `BookingResponse` schema and `Booking` model to see if we can add a computed property or relation.
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

  const handleOpenChat = async () => {
    try {
      setActionLoading(true);
      const convo = await messageService.createConversation(booking.freelancer_profile_id);
      router.push(`/client/messages?active=${convo.id}`);
    } catch (err) {
      alert("Failed to initialize conversation thread.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert("Please provide a reason.");
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.clientCancelBooking(booking.id, cancelReason);
      setShowCancel(false);
      setCancelReason("");
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cancellation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm("Confirm completion? This will release payment and award the milestone.")) {
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.completeBooking(booking.id);
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Fulfillment update failed.");
    } finally {
      setActionLoading(false);
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

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedDate) {
      alert("Please select a date.");
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.requestReschedule(booking.id, {
        new_date: reschedDate,
        new_start_time: reschedStart,
        new_end_time: reschedEnd,
        reason: reschedReason
      });
      setShowReschedule(false);
      setReschedDate("");
      setReschedReason("");
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Rescheduling request failed.");
    } finally {
      setActionLoading(false);
    }
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
        Booking request details are unavailable.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-12 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex justify-between items-center">
          <Link href="/client/bookings" className="text-xs text-primary font-extrabold uppercase tracking-wider hover:underline">
            ← Back to Bookings List
          </Link>
          <span className="text-[10px] text-text-muted font-mono">Job Reference: {booking.booking_number}</span>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Panels */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Details */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] text-primary font-black uppercase tracking-wider block mb-1">
                    Booking Detail View
                  </span>
                  <h1 className="text-lg md:text-xl font-black text-text-main leading-tight">{booking.title}</h1>
                  <p className="text-xs text-text-sub mt-2">Source: {booking.source_type} flow</p>
                </div>
                <span className="px-3 py-1 bg-background border border-border-custom rounded-full text-xs font-black text-primary uppercase">
                  {getFriendlyStatus(booking.status, booking.payment_completion_state)}
                </span>
              </div>

              {/* Geolocation/Venue coordinates */}
              {booking.booking_type !== "REMOTE" && (
                <div className="bg-background border border-border-custom p-4 rounded-2xl text-xs space-y-2">
                  <h4 className="font-bold text-text-main uppercase tracking-wider text-[10px]">Shoot Venue Coordinates</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-sub">
                    <div>
                      <span className="text-text-muted block text-[9px] uppercase">Venue Name</span>
                      <strong className="text-text-main">{booking.venue_name}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[9px] uppercase">City, State</span>
                      <strong className="text-text-main">{booking.location_city}, {booking.location_state}</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border-custom text-[11px]">
                    <span className="text-text-muted block text-[9px] uppercase">Agreed Full Address</span>
                    <p className="text-text-main mt-1">{booking.venue_address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submitted Answers */}
            {booking.requirements_answers && Object.keys(booking.requirements_answers).length > 0 && (
              <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Submitted Requirement Answers</h3>
                <div className="divide-y divide-border-custom">
                  {Object.entries(booking.requirements_answers).map(([key, val]: [string, any], idx) => (
                    <div key={idx} className="py-3 text-xs flex justify-between gap-4">
                      <span className="text-text-sub font-semibold">{key}</span>
                      <span className="text-text-main font-black text-right max-w-xs truncate">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rescheduling Request Widget */}
            {booking.status === "RESCHEDULE_REQUESTED" && (
              <div className="bg-cyan-950/20 border border-cyan-500/30 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔄</span>
                  <div>
                    <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider">Pending Reschedule Coordinate Request</h4>
                    <p className="text-[11px] text-cyan-400 mt-0.5">One party has requested date changes. Check conversation thread for logs.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rescheduling trigger Form */}
            {showReschedule && (
              <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Propose Rescheduling</h3>
                <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-text-sub uppercase font-black mb-1">New Date</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split("T")[0]}
                        value={reschedDate}
                        onChange={(e) => setReschedDate(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-sub uppercase font-black mb-1">Start Time</label>
                      <input
                        type="time"
                        required
                        value={reschedStart}
                        onChange={(e) => setReschedStart(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-sub uppercase font-black mb-1">End Time</label>
                      <input
                        type="time"
                        required
                        value={reschedEnd}
                        onChange={(e) => setReschedEnd(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-sub uppercase font-black mb-1">Reason for reschedule</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Explain why you are requesting date/time adjustments..."
                      value={reschedReason}
                      onChange={(e) => setReschedReason(e.target.value)}
                      className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowReschedule(false)}
                      className="px-3.5 py-1.5 bg-background border border-border-custom text-xs font-bold rounded-lg text-text-sub"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-xs font-bold rounded-lg text-text-main"
                    >
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Cancellation trigger Form */}
            {showCancel && (
              <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Cancel Booking Job</h3>
                <form onSubmit={handleCancel} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-text-sub uppercase font-black mb-1">Cancellation Reason *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Please clarify why you are cancelling this booking..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full bg-background border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCancel(false)}
                      className="px-3.5 py-1.5 bg-background border border-border-custom text-xs font-bold rounded-lg text-text-sub"
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-bold rounded-lg text-text-main"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </form>
              </div>
            )}

            {booking.status === "COMPLETED" && (
              <div className="space-y-4">
                {booking.review ? (
                  <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
                    <div>
                      <span className="text-[10px] text-emerald-450 font-black uppercase tracking-wider block mb-1">
                        Your Submitted Review
                      </span>
                      <h3 className="text-sm font-black text-text-main">Thank you for your feedback!</h3>
                      <p className="text-[11px] text-text-sub mt-1">
                        Your feedback helps clients choose the right creative professionals.
                      </p>
                    </div>

                    <div className="bg-background border border-border-custom p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <StarRating rating={booking.review.overall_rating} size="sm" />
                        <span className="text-xs text-text-sub font-mono">Verified Review</span>
                      </div>
                      <p className="text-xs text-text-sub leading-relaxed italic">
                        "{booking.review.comment}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <ReviewForm
                    bookingId={booking.id}
                    onSuccess={(newReview) => {
                      setBooking({ ...booking, review: newReview });
                    }}
                  />
                )}
              </div>
            )}

          </div>

          {/* Sidebar Summary Card */}
          <div className="space-y-6">
            
            {/* Financial Summary */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
              <span className="text-[10px] text-primary font-extrabold uppercase tracking-wider block">Financial Summary</span>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-sub">Total Agreed Price</span>
                <span className="text-sm font-bold text-text-main">₹{Number(booking.agreed_amount).toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-border-custom pt-2.5">
                <span className="text-text-sub">Required Deposit (30%)</span>
                <span className="text-text-main font-semibold">₹{Number(booking.deposit_amount).toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-border-custom pt-2.5">
                <span className="text-text-sub">Deposit Paid Amount</span>
                <span className={`font-bold ${Number(booking.deposit_paid_amount) > 0 ? "text-emerald-450" : "text-amber-500"}`}>
                  ₹{Number(booking.deposit_paid_amount).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-border-custom pt-2.5">
                <span className="text-text-sub">Remaining Balance Due</span>
                <span className="text-text-main font-semibold">₹{Number(booking.remaining_balance).toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-border-custom pt-2.5">
                <span className="text-text-sub">Total Paid to Date</span>
                <span className="font-bold text-emerald-450">₹{Number(booking.total_paid).toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-border-custom pt-2.5">
                <span className="text-text-sub">Payment Status</span>
                <span className={`font-black uppercase tracking-wider text-[10px] ${
                  booking.payment_completion_state === "FULLY_PAID"
                    ? "text-emerald-400"
                    : booking.payment_completion_state === "DEPOSIT_PAID"
                    ? "text-blue-400"
                    : "text-amber-500"
                }`}>
                  {booking.payment_completion_state}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-xs border-t border-border-custom pt-3">
                <span className="text-text-sub">Fulfillment deadline</span>
                <span className="text-text-main font-bold text-right">
                  {booking.scheduled_date ? booking.scheduled_date : "Not scheduled"}
                </span>
              </div>

              {/* Status transition action tags */}
              <div className="pt-4 space-y-2 border-t border-border-custom">
                {/* 1. Quote review / Accept Quote */}
                {booking.status === "PENDING_CONFIRMATION" && (
                  <button
                    disabled={actionLoading}
                    onClick={handleAcceptQuote}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-text-main text-xs font-black rounded-xl transition uppercase tracking-wider shadow-lg shadow-emerald-950/20"
                  >
                    Accept Quote
                  </button>
                )}

                {/* 2. Deposit invoice payment */}
                {booking.status === "CONFIRMED" && booking.payment_completion_state === "UNPAID" && (
                  <Link
                    href={`/client/bookings/${booking.id}/payment`}
                    className="w-full block text-center py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-text-main text-xs font-black rounded-xl transition uppercase tracking-wider shadow-lg shadow-emerald-950/20"
                  >
                    Pay Deposit Invoice (₹{Number(booking.deposit_amount).toLocaleString("en-IN")})
                  </Link>
                )}

                {/* 3. Final Balance invoice payment */}
                {booking.payment_completion_state === "DEPOSIT_PAID" && Number(booking.remaining_balance) > 0 && (
                  <Link
                    href={`/client/bookings/${booking.id}/payment`}
                    className="w-full block text-center py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-text-main text-xs font-black rounded-xl transition uppercase tracking-wider shadow-lg shadow-emerald-950/20"
                  >
                    Pay Remaining Balance (₹{Number(booking.remaining_balance).toLocaleString("en-IN")})
                  </Link>
                )}

                {booking.status !== "REQUESTED" && (
                  <Link
                    href={`/client/bookings/${booking.id}/workspace`}
                    className="w-full block text-center py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-text-main text-xs font-black rounded-xl transition uppercase tracking-wider"
                  >
                    Open Project Workspace
                  </Link>
                )}
                
                <button
                  disabled={actionLoading}
                  onClick={handleOpenChat}
                  className="w-full py-2.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-main text-xs font-bold rounded-xl transition uppercase tracking-wider"
                >
                  Open Chat Room
                </button>

                {["REQUESTED", "CONFIRMED", "IN_PROGRESS"].includes(booking.status) && (
                  <>
                    <button
                      onClick={() => setShowReschedule(true)}
                      className="w-full py-2 bg-background border border-border-custom text-text-sub text-xs font-bold rounded-xl hover:bg-surface-elevated transition"
                    >
                      Reschedule Job
                    </button>

                    <button
                      onClick={() => setShowCancel(true)}
                      className="w-full py-2 bg-background border border-border-custom hover:border-rose-900/30 hover:text-rose-400 text-rose-500 text-xs font-bold rounded-xl transition"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
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
