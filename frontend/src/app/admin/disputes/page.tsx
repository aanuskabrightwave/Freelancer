"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface MessageItem {
  id: number;
  sender_name: string;
  message: string;
  is_internal_admin_note: boolean;
  created_at: string;
}

interface EvidenceItem {
  id: number;
  uploader_name: string;
  file_path: string;
  mime_type: string;
  description?: string;
  created_at: string;
}

interface DisputeItem {
  id: number;
  dispute_number: string;
  booking_number: string;
  opened_by: string;
  against: string;
  reason: string;
  description: string;
  status: string;
  priority: string;
  assigned_admin?: string | null;
  resolution_type?: string | null;
  resolution_notes?: string | null;
  opened_at: string;
  messages?: MessageItem[];
  evidence?: EvidenceItem[];
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New message state
  const [replyText, setReplyText] = useState<string>("");
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [postingMessage, setPostingMessage] = useState<boolean>(false);

  // Resolution state
  const [resType, setResType] = useState<string>("");
  const [resNotes, setResNotes] = useState<string>("");
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [submittingResolution, setSubmittingResolution] = useState<boolean>(false);

  async function fetchDisputes() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DisputeItem[]>("/admin/disputes");
      setDisputes(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dispute resolution queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDisputes();
  }, []);

  const loadDetails = async (item: DisputeItem) => {
    setLoadingDetail(true);
    try {
      const res = await api.get<DisputeItem>(`/admin/disputes/${item.id}`);
      setSelectedDispute(res);
      // Reset reply/resolution states
      setReplyText("");
      setIsInternalNote(false);
      setResType("");
      setResNotes("");
      setPartialAmount("");
    } catch (err: any) {
      alert("Failed to load details for this dispute ticket.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDispute) return;
    try {
      const updated = await api.post<DisputeItem>(`/admin/disputes/${selectedDispute.id}/assign`, {});
      alert("Ticket assigned successfully.");
      loadDetails(selectedDispute);
      fetchDisputes();
    } catch (err: any) {
      alert(err.message || "Failed to assign dispute.");
    }
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !replyText.trim()) return;
    setPostingMessage(true);
    try {
      await api.post(`/admin/disputes/${selectedDispute.id}/message`, {
        message: replyText,
        is_internal_admin_note: isInternalNote
      });
      setReplyText("");
      // Reload message thread
      loadDetails(selectedDispute);
    } catch (err: any) {
      alert(err.message || "Failed to post message.");
    } finally {
      setPostingMessage(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !resType || !resNotes.trim()) return;
    setSubmittingResolution(true);
    try {
      const payload: Record<string, any> = {
        resolution_type: resType,
        resolution_notes: resNotes
      };
      if (resType === "PARTIAL_REFUND") {
        if (!partialAmount.trim()) {
          alert("Partial refund amount is required.");
          setSubmittingResolution(false);
          return;
        }
        payload.partial_refund_amount = parseFloat(partialAmount);
      }

      await api.post(`/admin/disputes/${selectedDispute.id}/resolve`, payload);
      alert("Dispute ticket resolved successfully.");
      setSelectedDispute(null);
      fetchDisputes();
    } catch (err: any) {
      alert(err.message || "Failed to resolve dispute.");
    } finally {
      setSubmittingResolution(false);
    }
  };

  return (
    <div className="p-8 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white">Dispute Resolution Center</h1>
        <p className="text-slate-400 text-sm mt-1">Review conflicts, manage participant conversations, and execute refunds.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading dispute pipeline...</div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 text-red-400 p-4 rounded-xl">{error}</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl">
          No dispute tickets open at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List queue */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Disputes ({disputes.length})</h3>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl divide-y divide-slate-850 overflow-hidden shadow-xl">
              {disputes.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadDetails(item)}
                  className={`p-4 cursor-pointer hover:bg-slate-900/90 transition-colors space-y-2 ${
                    selectedDispute?.id === item.id ? "bg-slate-900/90 border-l-4 border-red-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-slate-200 text-xs">{item.dispute_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.status === "RESOLVED" || item.status === "CLOSED" ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400" :
                      item.status === "OPEN" ? "bg-red-950/60 border border-red-800 text-red-400" :
                      "bg-yellow-950/60 border border-yellow-800 text-yellow-400"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white truncate">Booking: {item.booking_number}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">Claimant: {item.opened_by}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket detail & timeline thread */}
          <div className="lg:col-span-2 space-y-6">
            {loadingDetail ? (
              <div className="py-20 text-center text-slate-400 bg-slate-900/40 border border-slate-850 rounded-xl">
                Loading dispute messages timeline thread...
              </div>
            ) : selectedDispute ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Meta details panel */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs font-mono text-red-400 font-semibold">{selectedDispute.dispute_number}</span>
                      <h2 className="text-xl font-bold text-white mt-1">Disputed Booking: {selectedDispute.booking_number}</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Opened: {new Date(selectedDispute.opened_at).toLocaleString()} | Claimant: {selectedDispute.opened_by} vs Defendant: {selectedDispute.against}
                      </p>
                    </div>
                    <div>
                      {selectedDispute.assigned_admin ? (
                        <span className="text-xs bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-slate-300">
                          Assignee: {selectedDispute.assigned_admin}
                        </span>
                      ) : (
                        <button
                          onClick={handleAssign}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors"
                        >
                          Assign to Me
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Dispute Claim Description</span>
                    <p className="text-sm bg-slate-950 border border-slate-850 p-3 rounded-lg text-slate-300 leading-relaxed">
                      {selectedDispute.description}
                    </p>
                  </div>
                </div>

                {/* Timeline Messages Thread */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Conversation & Activity Timeline</h3>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {selectedDispute.messages && selectedDispute.messages.length > 0 ? (
                      selectedDispute.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl border text-sm space-y-1 max-w-[85%] ${
                            msg.is_internal_admin_note
                              ? "bg-amber-950/20 border-amber-900/60 text-amber-300 ml-auto"
                              : "bg-slate-950 border-slate-850 text-slate-300"
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span className="font-bold">{msg.sender_name} {msg.is_internal_admin_note && "(Internal Note)"}</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="leading-relaxed">{msg.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">No messages recorded on this dispute ticket timeline.</p>
                    )}
                  </div>

                  {/* Reply Form */}
                  {selectedDispute.status !== "RESOLVED" && selectedDispute.status !== "CLOSED" && (
                    <form onSubmit={handlePostMessage} className="space-y-3 pt-4 border-t border-slate-800">
                      <textarea
                        rows={2}
                        placeholder="Type reply message or internal record note..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-650"
                      />
                      <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-xs text-amber-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            className="bg-slate-950 border-slate-850 text-amber-500 rounded focus:ring-0 focus:ring-offset-0"
                          />
                          Save as Internal Admin Note
                        </label>
                        <button
                          type="submit"
                          disabled={postingMessage || !replyText.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs disabled:opacity-50 transition-colors"
                        >
                          {postingMessage ? "Posting..." : "Post Reply"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Resolution panel */}
                {selectedDispute.status !== "RESOLVED" && selectedDispute.status !== "CLOSED" && (
                  <form onSubmit={handleResolveSubmit} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                    <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 text-red-400">Resolution Settlement Panel</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-bold uppercase">Resolution Type</label>
                        <select
                          value={resType}
                          onChange={(e) => setResType(e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
                          required
                        >
                          <option value="">Select Resolution</option>
                          <option value="FULL_REFUND">Full Refund</option>
                          <option value="PARTIAL_REFUND">Partial Refund</option>
                          <option value="RELEASE_TO_FREELANCER">Release To Freelancer</option>
                          <option value="BOOKING_CANCELLED">Cancel Booking</option>
                          <option value="NO_ACTION">No Action / Dismiss</option>
                        </select>
                      </div>

                      {resType === "PARTIAL_REFUND" && (
                        <div className="flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
                          <label className="text-xs text-slate-400 font-bold uppercase">Refund Amount (INR)</label>
                          <input
                            type="number"
                            placeholder="Amount in Rupees"
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase">Resolution Notes / Explanations</label>
                      <textarea
                        rows={3}
                        placeholder="Detail settlement decisions or reasoning (this is sent to participants)..."
                        value={resNotes}
                        onChange={(e) => setResNotes(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-slate-650"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingResolution || !resType || !resNotes.trim()}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
                    >
                      {submittingResolution ? "Processing Resolution..." : "Execute Resolution Settlement"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-sm bg-slate-900/40 border border-slate-850 rounded-xl">
                Select a dispute ticket from the pipeline side menu to review claimant statements and messages.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
