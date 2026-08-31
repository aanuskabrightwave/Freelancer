"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, getMediaUrl } from "@/lib/api";

interface UserMiniOut {
  id: number;
  full_name: string;
  email: string;
}

interface FreelancerMiniOut {
  id: number;
  user_id: number;
  professional_title: string;
  full_name: string;
}

interface BookingAssignmentOut {
  id: number;
  status: string;
  assignment_round: number;
  offered_payout_amount: string;
  decline_reason: string | null;
  counter_offer_amount: string | null;
  counter_offer_notes: string | null;
  is_replacement: boolean;
  client_approval_required: boolean;
  client_approval_status: string;
  client_approval_notes: string | null;
  created_at: string;
  responded_at: string | null;
  freelancer_profile?: {
    id: number;
    full_name: string;
  };
}

interface PaymentSummaryOut {
  payment_completion_state: string;
  deposit_amount: string;
  deposit_paid_amount: string;
  remaining_balance: string;
  total_paid: string;
}

interface BookingDetail {
  id: number;
  booking_number: string;
  title: string | null;
  description: string | null;
  source_type: string;
  booking_type: string;
  status: string;
  agreed_amount: string;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  venue_name: string | null;
  venue_address: string | null;
  notes: string | null;
  admin_notes: string | null;
  is_admin_managed: boolean;
  created_at: string;
  client: UserMiniOut | null;
  selected_freelancer: FreelancerMiniOut | null;
  freelancer: FreelancerMiniOut | null;
  selected_freelancer_profile_id: number | null;
  freelancer_profile_id: number | null;
  payment_summary: PaymentSummaryOut | null;
  assignments: BookingAssignmentOut[];
}

interface MessageOut {
  id: number;
  sender: {
    id: number;
    full_name: string;
    role: string;
  };
  content: string;
  created_at: string;
}

interface ConvoListItem {
  id: number;
  conversation_type: string;
  booking_id: number | null;
  client: UserMiniOut;
  freelancer: FreelancerMiniOut | null;
}

interface FreelancerSearchItem {
  id: number;
  user_id: number;
  full_name: string;
  professional_title: string;
  city: string;
  average_rating: number | null;
  starting_price: string | null;
  profile_photo_url: string | null;
  verification_status: string;
}

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Review states
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Assignment Modal & Search states
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [professionFilter, setProfessionFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [freelancersList, setFreelancersList] = useState<FreelancerSearchItem[]>([]);
  const [loadingFreelancers, setLoadingFreelancers] = useState<boolean>(false);

  // Assignment Creation states
  const [selectedCreator, setSelectedCreator] = useState<FreelancerSearchItem | null>(null);
  const [offeredPayout, setOfferedPayout] = useState<string>("");
  const [assignmentNotes, setAssignmentNotes] = useState<string>("");
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);

  // Messaging states
  const [conversations, setConversations] = useState<ConvoListItem[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<BookingDetail>(`/admin/bookings/${id}`);
      setBooking(data);
      if (data.admin_notes) {
        setReviewNotes(data.admin_notes);
      }

      // Fetch conversations linked to this booking
      const convoData = await api.get<ConvoListItem[]>("/admin/conversations", {
        params: { booking_id: String(id) }
      });
      setConversations(convoData);
      if (convoData.length > 0) {
        setSelectedConvoId(convoData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "We couldn't load booking details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  // Load message logs when selected conversation changes
  useEffect(() => {
    async function loadMessages() {
      if (!selectedConvoId) return;
      setMessagesLoading(true);
      try {
        const data = await api.get<any>(`/messages/conversations/${selectedConvoId}`);
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Error loading chat messages:", err);
      } finally {
        setMessagesLoading(false);
      }
    }
    loadMessages();
  }, [selectedConvoId]);

  // Search Freelancers from real Directory API
  const fetchFreelancers = async () => {
    setLoadingFreelancers(true);
    try {
      const params: Record<string, string> = { page_size: "100" };
      if (professionFilter) params["profession"] = professionFilter;
      if (cityFilter.trim()) params["city"] = cityFilter.trim();

      const data = await api.get<FreelancerSearchItem[]>("/freelancers", { params });
      setFreelancersList(data);
    } catch (err) {
      console.error("Error fetching creators directory:", err);
    } finally {
      setLoadingFreelancers(false);
    }
  };

  useEffect(() => {
    if (searchModalOpen) {
      fetchFreelancers();
    }
  }, [searchModalOpen, professionFilter, cityFilter]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvoId || !newMessage.trim()) return;
    try {
      const sent = await api.post<any>(`/messages/conversations/${selectedConvoId}/messages`, {
        content: newMessage.trim()
      });
      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleStartReview = async () => {
    if (!id || submittingReview) return;
    setSubmittingReview(true);
    try {
      await api.post(`/admin/bookings/${id}/review`, {
        admin_notes: reviewNotes.trim()
      });
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to start review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Assign Creator Trigger
  const handleAssignFreelancer = async () => {
    if (!id || !selectedCreator || assigning) return;
    setAssigning(true);
    try {
      await api.post(`/admin/bookings/${id}/assign`, {
        freelancer_profile_id: selectedCreator.id,
        offered_payout_amount: parseFloat(offeredPayout) || null,
        admin_notes: assignmentNotes.trim()
      });
      setConfirmModalOpen(false);
      setSearchModalOpen(false);
      setSelectedCreator(null);
      setOfferedPayout("");
      setAssignmentNotes("");
      await fetchDetail();
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        alert("This booking was updated. Refreshing the latest status.");
        await fetchDetail();
      } else {
        alert(err.message || "Failed to assign professional creator.");
      }
    } finally {
      setAssigning(false);
    }
  };

  const openAssignModalForCreator = (creator: FreelancerSearchItem) => {
    setSelectedCreator(creator);
    // Auto-calculate suggested offered payout amount (default 75% of agreed amount)
    const suggested = booking?.agreed_amount
      ? (parseFloat(booking.agreed_amount) * 0.75).toFixed(0)
      : "0";
    setOfferedPayout(suggested);
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(typeof val === "string" ? parseFloat(val || "0") : val);
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "N/A";
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  // Filter in memory by matching name / title
  const filteredCreators = freelancersList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.professional_title && c.professional_title.toLowerCase().includes(q))
    );
  });

  const activeAssignment = booking?.assignments?.find((a) => a.status === "OFFERED");
  const declinedAssignmentWithCounter = booking?.assignments?.find(
    (a) => a.status === "DECLINED" && a.counter_offer_amount !== null
  );

  if (loading) {
    return <div className="p-8 text-center text-xs text-text-muted">Loading booking details...</div>;
  }

  if (error || !booking) {
    return (
      <div className="p-8 text-center text-xs text-rose-400 bg-rose-950/20 border border-rose-900 rounded-3xl">
        {error || "Booking not found."}
      </div>
    );
  }

  const clientChat = conversations.find((c) => c.conversation_type === "CLIENT_ADMIN");
  const creatorChat = conversations.find((c) => c.conversation_type === "FREELANCER_ADMIN");

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-custom pb-6">
        <div>
          <Link href="/admin/bookings" className="text-text-muted hover:text-primary text-xs font-semibold">
            ← Back to Booking Inbox
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              Booking {booking.booking_number}
            </h1>
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {booking.status.replace(/_/g, " ").toLowerCase()}
            </span>
            <span className="text-[10px] bg-surface border border-border-custom text-text-sub px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {booking.source_type}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Booking Details & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Booking Summary Card */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3">
              Booking Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Client</span>
                <p className="text-text-main font-semibold">{booking.client?.full_name}</p>
                <p className="text-text-sub font-medium">{booking.client?.email}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Selected Professional</span>
                <p className="text-text-main font-semibold">
                  {booking.selected_freelancer?.full_name || <span className="italic text-text-muted">Not specified</span>}
                </p>
                {booking.selected_freelancer && (
                  <p className="text-text-sub font-medium">{booking.selected_freelancer.professional_title}</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Assigned Professional</span>
                {booking.freelancer?.full_name ? (
                  <>
                    <p className="text-text-main font-semibold">{booking.freelancer.full_name}</p>
                    <p className="text-text-sub font-medium">{booking.freelancer.professional_title}</p>
                  </>
                ) : (
                  <div>
                    <span className="text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider inline-block">
                      Not assigned
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Event Schedule</span>
                <p className="text-text-main font-semibold">{formatDate(booking.scheduled_date)}</p>
                <p className="text-text-sub font-medium">
                  {booking.start_time || "N/A"} - {booking.end_time || "N/A"} ({booking.timezone})
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Venue Location</span>
                <p className="text-text-main font-semibold">{booking.venue_name || "Remote / Digital"}</p>
                <p className="text-text-sub font-medium">{booking.venue_address || booking.location_city}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Financial Budget</span>
                <p className="text-text-main font-semibold">Agreed: {formatCurrency(booking.agreed_amount)}</p>
                {booking.payment_summary && (
                  <p className="text-text-sub font-medium">Paid status: {booking.payment_summary.payment_completion_state}</p>
                )}
              </div>
            </div>
          </div>

          {/* Requirement Brief description */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3">
              Requirement Description
            </h3>
            <div className="text-xs space-y-4 font-medium">
              <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider block">
                Brief Information
              </span>
              <p className="text-text-main bg-surface/50 border border-border-custom/50 p-4 rounded-2xl whitespace-pre-wrap leading-relaxed">
                {booking.notes || booking.description || "No specific requirement brief provided."}
              </p>
            </div>
          </div>

          {/* Counter Offer Panel (Part 15) */}
          {declinedAssignmentWithCounter && (
            <div className="bg-purple-950/20 border border-purple-900/40 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-purple-900/30">
                <div>
                  <h4 className="text-sm font-bold text-purple-200">Active Counter Offer</h4>
                  <p className="text-[10px] text-purple-300 mt-0.5">Freelancer rejected original rate and proposed a counter-offer.</p>
                </div>
                <span className="text-[9px] bg-purple-900/30 border border-purple-800/40 text-purple-300 px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                  Pending Negotiation
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-semibold text-purple-200 pt-2">
                <div>
                  <span className="text-purple-300 text-[10px] uppercase font-bold block mb-1">Original Offer</span>
                  <p className="text-sm">{formatCurrency(declinedAssignmentWithCounter.offered_payout_amount)}</p>
                </div>
                <div>
                  <span className="text-purple-300 text-[10px] uppercase font-bold block mb-1">Freelancer Counter</span>
                  <p className="text-sm text-primary font-bold">{formatCurrency(declinedAssignmentWithCounter.counter_offer_amount!)}</p>
                </div>
                <div>
                  <span className="text-purple-300 text-[10px] uppercase font-bold block mb-1">Budget Difference</span>
                  <p className="text-sm">
                    {formatCurrency(
                      parseFloat(declinedAssignmentWithCounter.counter_offer_amount!) -
                      parseFloat(declinedAssignmentWithCounter.offered_payout_amount)
                    )}
                  </p>
                </div>
              </div>

              {declinedAssignmentWithCounter.counter_offer_notes && (
                <div className="text-xs bg-purple-950/50 p-4 border border-purple-900/30 rounded-2xl">
                  <span className="text-purple-300 text-[9px] uppercase font-bold block mb-1">Counter Notes:</span>
                  <p className="text-purple-100 italic">"{declinedAssignmentWithCounter.counter_offer_notes}"</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => {
                    const match = booking.assignments.find((a) => a.id === declinedAssignmentWithCounter.id);
                    if (match) {
                      // Set creator directly
                      setSelectedCreator({
                        id: booking.selected_freelancer?.id || 0, // Fallback profile ID
                        user_id: 0,
                        full_name: booking.selected_freelancer?.full_name || "Creator",
                        professional_title: booking.selected_freelancer?.professional_title || "",
                        city: booking.location_city || "",
                        average_rating: 5,
                        starting_price: "0",
                        profile_photo_url: null,
                        verification_status: "VERIFIED"
                      });
                      setOfferedPayout(declinedAssignmentWithCounter.counter_offer_amount!);
                      setConfirmModalOpen(true);
                    }
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                >
                  Reassign / Send Revised Offer
                </button>
                <button
                  onClick={() => setSearchModalOpen(true)}
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated text-purple-200 border border-purple-800/40 text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                >
                  Choose Another Freelancer
                </button>
                {creatorChat && (
                  <button
                    onClick={() => setSelectedConvoId(creatorChat.id)}
                    className="px-4 py-2 bg-surface hover:bg-surface-elevated text-purple-300 border border-purple-800/30 text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                  >
                    Message Freelancer
                  </button>
                )}
                {clientChat && (
                  <button
                    onClick={() => setSelectedConvoId(clientChat.id)}
                    className="px-4 py-2 bg-surface hover:bg-surface-elevated text-purple-300 border border-purple-800/30 text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                  >
                    Message Client
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Replacement Approval Banner (Part 17) */}
          {booking.assignments?.some((a) => a.is_replacement && a.client_approval_status === "PENDING" && a.status === "ACCEPTED") && (
            <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-3xl p-6 space-y-3">
              <h4 className="text-sm font-bold text-indigo-200 uppercase tracking-wider">Client Replacement Approval Required</h4>
              <p className="text-xs text-indigo-300 font-medium">
                The replacement creator accepted this assignment. We are currently awaiting Client approval to finalize the booking.
              </p>
              <div className="flex gap-4 text-xs font-semibold pt-2 text-indigo-200">
                <div>
                  <span className="text-[10px] text-indigo-300 uppercase block mb-1">Candidate</span>
                  <p>{booking.freelancer?.full_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-300 uppercase block mb-1">Client Approval</span>
                  <p className="text-primary">Awaiting Response</p>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-300 uppercase block mb-1">Freelancer Response</span>
                  <p>ACCEPTED</p>
                </div>
              </div>
            </div>
          )}

          {/* Assignment History Cards (Part 12) */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3">
              Assignment History Logs
            </h3>
            {booking.assignments && booking.assignments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-custom text-text-sub font-bold uppercase tracking-wider text-[9px] bg-surface/30">
                      <th className="py-2.5 px-3">Round</th>
                      <th className="py-2.5 px-3">Creator Candidate</th>
                      <th className="py-2.5 px-3">Offer Amount</th>
                      <th className="py-2.5 px-3">Sent Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Client Approval</th>
                      <th className="py-2.5 px-3">Response Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/30 font-medium">
                    {booking.assignments.map((assignment, index) => (
                      <tr key={assignment.id} className="hover:bg-surface/20">
                        <td className="py-3 px-3 text-text-main font-bold">Round #{assignment.assignment_round}</td>
                        <td className="py-3 px-3">
                          <p className="text-text-main font-semibold">
                            {assignment.freelancer_profile?.full_name || "Creator candidate"}
                          </p>
                          {assignment.is_replacement && (
                            <span className="text-[8px] bg-purple-950 text-purple-300 border border-purple-900 px-1 py-0.2 rounded font-bold uppercase">
                              Replacement
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-text-main font-bold">
                          {formatCurrency(assignment.offered_payout_amount)}
                        </td>
                        <td className="py-3 px-3 text-text-sub">{formatDate(assignment.created_at)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            assignment.status === "OFFERED"
                              ? "bg-amber-950/40 text-amber-300 border border-amber-900/30"
                              : assignment.status === "ACCEPTED"
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/30"
                              : "bg-rose-950/40 text-rose-300 border border-rose-900/30"
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-text-sub font-semibold">
                          {assignment.client_approval_status === "PENDING" ? (
                            <span className="text-amber-500">Pending</span>
                          ) : assignment.client_approval_status === "APPROVED" ? (
                            <span className="text-emerald-500">Approved</span>
                          ) : assignment.client_approval_status === "REJECTED" ? (
                            <span className="text-rose-500">Rejected</span>
                          ) : (
                            <span className="text-text-muted">Not Required</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-text-sub">
                          {assignment.decline_reason && (
                            <p className="text-[10px] text-rose-300 italic">Declined: "{assignment.decline_reason}"</p>
                          )}
                          {assignment.counter_offer_amount && (
                            <p className="text-[10px] text-amber-300 font-bold">Countered: {formatCurrency(assignment.counter_offer_amount)}</p>
                          )}
                          {!assignment.decline_reason && !assignment.counter_offer_amount && (
                            <span>{assignment.responded_at ? "Accepted Offer" : "Waiting Response"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-text-sub text-xs bg-surface/20 border border-dashed border-border-custom rounded-3xl">
                No assignment rounds have been launched yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status Actions & Recipient Safety Chats */}
        <div className="space-y-8">
          
          {/* Admin Controls Panel */}
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3 font-semibold">
              Admin Actions Console
            </h3>

            {/* Requested Status Stage */}
            {booking.status === "REQUESTED" && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="bg-amber-950/20 border border-amber-900/30 text-amber-200 p-4 rounded-2xl">
                  <p>Booking is waiting for coordinator quality review.</p>
                </div>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Review observations/pricing details..."
                  className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-2xl p-3 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted"
                ></textarea>
                <button
                  onClick={handleStartReview}
                  disabled={submittingReview}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition-all cursor-pointer"
                >
                  Start Review & Open Matching
                </button>
              </div>
            )}

            {/* Matching Stage */}
            {booking.status === "MATCHING_IN_PROGRESS" && (
              <div className="space-y-3 text-xs font-semibold">
                <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-2xl">
                  <p>Professional assignment matching is currently active.</p>
                </div>
                {!activeAssignment ? (
                  <button
                    onClick={() => setSearchModalOpen(true)}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition-all cursor-pointer"
                  >
                    Assign Freelancer
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full py-2.5 bg-surface text-text-muted border border-border-custom text-xs font-bold rounded-full cursor-not-allowed"
                    >
                      Offer Sent (Round #{activeAssignment.assignment_round})
                    </button>
                    <p className="text-[10px] text-text-muted italic text-center">
                      Awaiting response from candidate profile.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirmed Stage */}
            {booking.status === "CONFIRMED" && (
              <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 p-4 rounded-2xl text-xs font-semibold space-y-1">
                <p className="font-bold">Booking Finalized & Confirmed</p>
                <p className="text-[10px] text-text-sub">Monitor client deposit payment status in financial tab.</p>
              </div>
            )}

            {/* In Progress Stage */}
            {booking.status === "IN_PROGRESS" && (
              <div className="bg-teal-950/20 border border-teal-900/30 text-teal-300 p-4 rounded-2xl text-xs font-semibold space-y-1">
                <p className="font-bold">Work is In Progress</p>
                <p className="text-[10px] text-text-sub">Monitor delivery dates or freelancer milestone notifications.</p>
              </div>
            )}
          </div>

          {/* Payment Summary Box */}
          {booking.payment_summary && (
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4 text-xs font-semibold">
              <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-3">
                Payment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-sub font-medium">Deposit Stage</span>
                  <span className="text-text-main font-bold uppercase">
                    {booking.payment_summary.deposit_paid_amount === "0.00" ? (
                      <span className="text-rose-400">UNPAID</span>
                    ) : (
                      <span className="text-emerald-400">PAID</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-sub font-medium">Remaining Balance</span>
                  <span className="text-text-main">{formatCurrency(booking.payment_summary.remaining_balance)}</span>
                </div>
                <div className="flex justify-between border-t border-border-custom/50 pt-2 text-sm">
                  <span className="text-text-main font-bold">Total Paid</span>
                  <span className="text-primary font-bold">{formatCurrency(booking.payment_summary.total_paid)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Visually Distinct Recipient Safety Mediated Chats (Part 18, 19) */}
          {conversations.length > 0 && (
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-text-main border-b border-border-custom/50 pb-2">
                Mediated Communication
              </h3>

              {/* Tabs with Recipient Safety Segments */}
              <div className="flex flex-col gap-2 font-semibold">
                {clientChat && (
                  <button
                    onClick={() => setSelectedConvoId(clientChat.id)}
                    className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left border transition-all cursor-pointer ${
                      selectedConvoId === clientChat.id
                        ? "bg-primary/20 text-primary border-primary/30 ring-1 ring-primary/45"
                        : "bg-surface text-text-sub border-border-custom hover:bg-surface-elevated"
                    }`}
                  >
                    <span className="text-[8px] opacity-75 block text-text-muted mb-0.5">CLIENT THREAD</span>
                    Client: {booking.client?.full_name}
                  </button>
                )}

                {creatorChat ? (
                  <button
                    onClick={() => setSelectedConvoId(creatorChat.id)}
                    className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left border transition-all cursor-pointer ${
                      selectedConvoId === creatorChat.id
                        ? "bg-indigo-950/45 text-indigo-300 border-indigo-900/50 ring-1 ring-indigo-900/50"
                        : "bg-surface text-text-sub border-border-custom hover:bg-surface-elevated"
                    }`}
                  >
                    <span className="text-[8px] opacity-75 block text-text-muted mb-0.5">CREATOR THREAD</span>
                    Freelancer: {booking.freelancer?.full_name || booking.selected_freelancer?.full_name || "Creator"}
                  </button>
                ) : (
                  <div className="p-3 bg-surface/30 border border-border-custom/50 rounded-xl text-[10px] text-text-muted italic text-center font-medium">
                    No Freelancer conversation started yet.
                  </div>
                )}
              </div>

              {/* Chat Thread logs */}
              {selectedConvoId ? (
                <div className="space-y-4 flex flex-col h-72">
                  <div className="flex-1 overflow-y-auto bg-surface/50 border border-border-custom p-4 rounded-2xl space-y-3 min-h-0">
                    {messagesLoading ? (
                      <div className="text-center py-4 text-text-muted text-[10px]">Loading logs...</div>
                    ) : messages.length > 0 ? (
                      messages.map((msg) => {
                        const isAdmin = msg.sender.role === "ADMIN";
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] ${
                              isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                            }`}
                          >
                            <span className="text-[8px] text-text-muted mb-0.5">
                              {msg.sender.full_name} • {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                            </span>
                            <div
                              className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${
                                isAdmin
                                  ? "bg-primary/20 text-primary border border-primary/30 rounded-tr-none"
                                  : "bg-surface-elevated text-text-main border border-border-custom rounded-tl-none"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-text-muted text-[10px] italic">
                        No messages in this chat yet.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type mediated message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-grow bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted font-medium"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              ) : (
                <div className="py-8 text-center text-text-sub text-xs">
                  Select a mediated conversation thread.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Freelancer Assignment Directory Search Modal (Part 7, 8) */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-border-custom rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border-custom pb-4">
              <div>
                <h3 className="text-lg font-bold text-text-main">Assign Professional Creator</h3>
                <p className="text-xs text-text-sub">Search and select professional creators from public directory.</p>
              </div>
              <button
                onClick={() => {
                  setSearchModalOpen(false);
                  setSelectedCreator(null);
                }}
                className="text-text-sub hover:text-text-main font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Search by name or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <select
                value={professionFilter}
                onChange={(e) => setProfessionFilter(e.target.value)}
                className="bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">All Professions</option>
                <option value="PHOTOGRAPHER">Photographer</option>
                <option value="VIDEOGRAPHER">Videographer</option>
                <option value="EDITOR">Editor</option>
                <option value="DJ">DJ / Sound Mixer</option>
                <option value="DECORATOR">Decorator</option>
              </select>
              <input
                type="text"
                placeholder="Filter by city..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Directory List */}
            <div className="flex-grow overflow-y-auto min-h-0 space-y-3 bg-surface/50 border border-border-custom p-4 rounded-2xl">
              {loadingFreelancers ? (
                <div className="text-center py-12 text-xs text-text-muted">Loading directory profile items...</div>
              ) : filteredCreators.length > 0 ? (
                filteredCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="bg-surface-elevated border border-border-custom/80 hover:border-primary/50 p-4 rounded-2xl flex justify-between items-center gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface border border-border-custom overflow-hidden flex items-center justify-center text-xs font-bold text-text-muted">
                        {creator.profile_photo_url ? (
                          <img src={getMediaUrl(creator.profile_photo_url)} alt={creator.full_name} className="w-full h-full object-cover" />
                        ) : (
                          creator.full_name[0]
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-text-main">{creator.full_name}</h4>
                          <span className={`text-[8px] px-1.5 py-0.1 border rounded uppercase tracking-wider font-bold ${
                            creator.verification_status === "VERIFIED"
                              ? "bg-emerald-950/45 border-emerald-800/40 text-emerald-400"
                              : "bg-surface border-border-custom text-text-muted"
                          }`}>
                            {creator.verification_status}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-sub font-semibold">{creator.professional_title}</p>
                        <p className="text-[9px] text-text-muted mt-0.5">Location: {creator.city} • Rating: {creator.average_rating || "N/A"} ★</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {creator.starting_price && (
                        <p className="text-[10px] font-bold text-text-main mb-1.5">From {formatCurrency(creator.starting_price)}</p>
                      )}
                      <button
                        onClick={() => openAssignModalForCreator(creator)}
                        className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                      >
                        Select Creator
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-xs text-text-muted italic">
                  No professional profiles match your query filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Input & Confirmation Modal (Part 9, 10, 11) */}
      {selectedCreator && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-border-custom rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Confirm Assignment Offer</h3>
              <p className="text-xs text-text-sub mt-0.5">Please specify payout and verify rules before dispatching offer.</p>
            </div>

            {/* Candidate summary */}
            <div className="bg-surface p-4 border border-border-custom rounded-2xl text-xs font-semibold space-y-2">
              <div className="flex justify-between">
                <span className="text-text-sub">Candidate:</span>
                <span className="text-text-main">{selectedCreator.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-sub">Profession:</span>
                <span className="text-text-main">{selectedCreator.professional_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-sub">Location:</span>
                <span className="text-text-main">{selectedCreator.city}</span>
              </div>
            </div>

            {/* Warning rules same vs replacement checks */}
            {booking.selected_freelancer_profile_id === selectedCreator.id ? (
              <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-center">
                ✓ Original Client Selection (No Client Approval Required)
              </div>
            ) : (
              <div className="bg-amber-955/20 border border-amber-900/30 text-amber-300 p-4 rounded-2xl text-[11px] font-medium leading-relaxed space-y-1">
                <p className="font-bold text-[10px] uppercase tracking-wide">⚠️ Replacement Creator Chosen</p>
                <p className="text-text-sub">This professional is different from the Client's original selection. Client approval will be required before the replacement can become active.</p>
              </div>
            )}

            {/* Financial input */}
            <div className="space-y-1 text-xs">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Offered Payout Rate (₹)</label>
              <input
                type="number"
                value={offeredPayout}
                onChange={(e) => setOfferedPayout(e.target.value)}
                placeholder="Enter offered payout amount..."
                className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-2xl px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Internal Admin Notes</label>
              <textarea
                rows={2}
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Enter internal logic, notes, or terms..."
                className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-2xl p-3 focus:ring-1 focus:ring-primary focus:outline-none"
              ></textarea>
            </div>

            {/* Interactive Confirm Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedCreator(null)}
                className="flex-1 py-2.5 border border-border-custom hover:bg-surface text-text-main text-xs font-bold rounded-full transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignFreelancer}
                disabled={assigning}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {assigning ? "Sending..." : "Send Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
