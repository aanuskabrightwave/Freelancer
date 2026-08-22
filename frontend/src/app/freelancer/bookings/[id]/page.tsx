"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { messageService } from "@/services/message.service";
import { paymentService } from "@/services/payment.service";

function BookingDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rescheduling states
  const [showReschedule, setShowReschedule] = useState(false);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedStart, setReschedStart] = useState("09:00");
  const [reschedEnd, setReschedEnd] = useState("18:00");
  const [reschedReason, setReschedReason] = useState("");
  const [pendingReschedule, setPendingReschedule] = useState<any | null>(null);

  // Cancellation / Rejection states
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

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

      if (data.status === "RESCHEDULE_REQUESTED") {
        try {
          const resched = await bookingService.getPendingReschedule(data.id);
          setPendingReschedule(resched);
        } catch (e) {
          // No active pending reschedule found
          setPendingReschedule(null);
        }
      } else {
        setPendingReschedule(null);
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
    if (!booking) return;
    try {
      setActionLoading(true);
      const conversations = await messageService.getConversations();
      const existingConvo = conversations.find(
        (c: any) => c.client_id === booking.client_id && c.freelancer_id === user?.id
      );

      if (existingConvo) {
        router.push(`/freelancer/messages?active=${existingConvo.id}`);
      } else {
        const convo = await messageService.createConversation({ client_id: booking.client_id });
        router.push(`/freelancer/messages?active=${convo.id}`);
      }
    } catch (err) {
      alert("Failed to initialize conversation thread.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      await bookingService.acceptBooking(booking.id);
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to accept booking request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await bookingService.rejectBooking(booking.id, declineReason);
      setShowDecline(false);
      setDeclineReason("");
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to decline request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      setActionLoading(true);
      await bookingService.startBooking(booking.id);
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start job.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivery = async () => {
    try {
      setActionLoading(true);
      await bookingService.markDeliveryPending(booking.id);
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update fulfillment status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert("Please provide a reason.");
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.freelancerCancelBooking(booking.id, cancelReason);
      setShowCancel(false);
      setCancelReason("");
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cancellation failed.");
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
      alert(err.response?.data?.detail || "Rescheduling proposal failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondReschedule = async (accept: boolean) => {
    if (!pendingReschedule) return;
    try {
      setActionLoading(true);
      await bookingService.respondReschedule(booking.id, pendingReschedule.id, accept);
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Reschedule response failed. Check conflicting slots.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex justify-center items-center">
        Booking details are unavailable.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex justify-between items-center">
          <Link href="/freelancer/bookings" className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider hover:underline">
            ← Back to Bookings List
          </Link>
          <span className="text-[10px] text-slate-500 font-mono font-bold">Reference ID: {booking.booking_number}</span>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Panels */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider block mb-1">
                    Fulfillment Dashboard
                  </span>
                  <h1 className="text-lg md:text-xl font-black text-white leading-tight">{booking.title}</h1>
                  <p className="text-xs text-slate-400 mt-2">Client User: {booking.client?.full_name}</p>
                </div>
                <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs font-black text-indigo-400 uppercase">
                  {booking.status}
                </span>
              </div>

              {/* Geolocation/Venue coordinates */}
              {booking.booking_type !== "REMOTE" && (
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-xs space-y-2">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Shoot Venue Coordinates</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Venue Name</span>
                      <strong className="text-white">{booking.venue_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">City, State</span>
                      <strong className="text-white">{booking.location_city}, {booking.location_state}</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-900 text-[11px]">
                    <span className="text-slate-500 block text-[9px] uppercase">Agreed Full Address</span>
                    <p className="text-slate-200 mt-1">{booking.venue_address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submitted Answers */}
            {booking.requirements_answers && Object.keys(booking.requirements_answers).length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Submitted Requirement Answers</h3>
                <div className="divide-y divide-slate-855">
                  {Object.entries(booking.requirements_answers).map(([key, val]: [string, any], idx) => (
                    <div key={idx} className="py-3 text-xs flex justify-between gap-4">
                      <span className="text-slate-400 font-semibold">{key}</span>
                      <span className="text-slate-100 font-black text-right max-w-xs truncate">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rescheduling Request Widget */}
            {booking.status === "RESCHEDULE_REQUESTED" && pendingReschedule && (
              <div className="bg-cyan-950/20 border border-cyan-500/30 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔄</span>
                  <div>
                    <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider">Pending Reschedule Coordinate Request</h4>
                    <p className="text-[11px] text-cyan-400 mt-0.5">
                      Requested by: <strong className="text-white">{pendingReschedule.requested_by}</strong>
                    </p>
                    <p className="text-xs text-slate-200 mt-2">
                      Proposed Date: <strong className="text-white">{pendingReschedule.new_date} ({pendingReschedule.new_start_time.substring(0,5)} - {pendingReschedule.new_end_time.substring(0,5)})</strong>
                    </p>
                    {pendingReschedule.reason && (
                      <p className="text-[11px] text-slate-400 italic mt-1">Reason: "{pendingReschedule.reason}"</p>
                    )}
                  </div>
                </div>

                {pendingReschedule.requested_by === "CLIENT" && (
                  <div className="flex gap-2 pt-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleRespondReschedule(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition"
                    >
                      Accept Reschedule
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleRespondReschedule(false)}
                      className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-855 transition"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {pendingReschedule.requested_by === "FREELANCER" && (
                  <p className="text-[10px] text-cyan-400 italic">Waiting for client response.</p>
                )}
              </div>
            )}

            {/* Rescheduling proposal Form */}
            {showReschedule && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Propose Rescheduling</h3>
                <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">New Date</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split("T")[0]}
                        value={reschedDate}
                        onChange={(e) => setReschedDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Start Time</label>
                      <input
                        type="time"
                        required
                        value={reschedStart}
                        onChange={(e) => setReschedStart(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">End Time</label>
                      <input
                        type="time"
                        required
                        value={reschedEnd}
                        onChange={(e) => setReschedEnd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Reason for reschedule</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Explain why you are proposing date/time adjustments..."
                      value={reschedReason}
                      onChange={(e) => setReschedReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowReschedule(false)}
                      className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-xs font-bold rounded-lg text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white"
                    >
                      Submit Proposal
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Decline Request Modal Form */}
            {showDecline && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Decline Booking Request</h3>
                <form onSubmit={handleDeclineSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Decline Reason (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Provide details about why you cannot take this job request..."
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDecline(false)}
                      className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-xs font-bold rounded-lg text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-bold rounded-lg text-white"
                    >
                      Confirm Decline
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Cancellation trigger Form */}
            {showCancel && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cancel gig job</h3>
                <form onSubmit={handleCancelSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Cancellation Reason *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Please clarify why you are cancelling this confirmed booking..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCancel(false)}
                      className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-xs font-bold rounded-lg text-slate-400"
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-bold rounded-lg text-white"
                    >
                      Cancel Job
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* Sidebar Summary Card */}
          <div className="space-y-6">
            
            {/* Financial Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">Income details</span>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Income</span>
                <span className="text-sm font-bold text-white">₹{parseInt(booking.agreed_amount).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs border-t border-slate-850 pt-3">
                <span className="text-slate-400">Execution Date</span>
                <span className="text-slate-200 font-bold text-right">
                  {booking.scheduled_date ? booking.scheduled_date : "Not scheduled"}
                </span>
              </div>

               {/* Status transition action tags */}
              <div className="pt-4 space-y-2 border-t border-slate-850">
                {booking.status === "CONFIRMED" && paymentStatus !== "CAPTURED" && Number(booking.agreed_amount) > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold py-2.5 px-3 rounded-xl flex items-start gap-2 mb-2 leading-relaxed">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Awaiting Client Payment. You cannot start work yet.</span>
                  </div>
                )}
                {booking.status !== "REQUESTED" && (
                  <Link
                    href={`/freelancer/bookings/${booking.id}/workspace`}
                    className="w-full block text-center py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                  >
                    Open Project Workspace
                  </Link>
                )}
                <button
                  disabled={actionLoading}
                  onClick={handleOpenChat}
                  className="w-full py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-200 text-xs font-bold rounded-xl transition uppercase tracking-wider"
                >
                  Open Chat Room
                </button>

                {booking.status === "REQUESTED" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={handleAccept}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition uppercase tracking-wider"
                    >
                      Accept
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => setShowDecline(true)}
                      className="py-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded-xl transition uppercase tracking-wider"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {booking.status === "CONFIRMED" && (
                  <>
                    <button
                      disabled={actionLoading}
                      onClick={handleStart}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider animate-pulse"
                    >
                      Start Work Job
                    </button>
                    <button
                      onClick={() => setShowReschedule(true)}
                      className="w-full py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-850 transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setShowCancel(true)}
                      className="w-full py-2 bg-slate-950 border border-slate-850 hover:border-rose-900/30 hover:text-rose-400 text-rose-500 text-xs font-bold rounded-xl transition"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}

                {booking.status === "IN_PROGRESS" && (
                  <>
                    <button
                      disabled={actionLoading}
                      onClick={handleMarkDelivery}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                    >
                      Deliver Output
                    </button>
                    <button
                      onClick={() => setShowReschedule(true)}
                      className="w-full py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-850 transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setShowCancel(true)}
                      className="w-full py-2 bg-slate-950 border border-slate-850 hover:border-rose-900/30 hover:text-rose-400 text-rose-500 text-xs font-bold rounded-xl transition"
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

export default function FreelancerBookingDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BookingDetailsContent />
    </Suspense>
  );
}
