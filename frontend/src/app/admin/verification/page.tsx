"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface DocItem {
  id: number;
  document_type: string;
  mime_type: string;
  status: string;
}

interface VerificationItem {
  id: number;
  freelancer_profile_id: number;
  full_name: string;
  status: string;
  submitted_at: string;
  admin_notes?: string;
  rejection_reason?: string;
  documents?: DocItem[];
}

export default function AdminVerificationPage() {
  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VerificationItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Actions modal state
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "RESUBMIT" | null>(null);
  const [actionReason, setActionReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function fetchQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<VerificationItem[]>("/admin/verifications");
      setQueue(res);
    } catch (err: any) {
      setError(err.message || "Failed to load verifications queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();
  }, []);

  const viewDetails = async (item: VerificationItem) => {
    setLoadingDetail(true);
    try {
      const res = await api.get<VerificationItem>(`/admin/verifications/${item.id}`);
      setSelectedRequest(res);
    } catch (err: any) {
      alert("Failed to load details for this verification request.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStartReview = async () => {
    if (!selectedRequest) return;
    try {
      const updated = await api.post<VerificationItem>(`/admin/verifications/${selectedRequest.id}/start-review`, {});
      setSelectedRequest({ ...selectedRequest, status: updated.status });
      setQueue(queue.map(q => q.id === selectedRequest.id ? { ...q, status: updated.status } : q));
    } catch (err: any) {
      alert(err.message || "Failed to start review.");
    }
  };

  const handleActionSubmit = async () => {
    if (!selectedRequest || !actionType) return;
    setSubmitting(true);
    try {
      let endpoint = `/admin/verifications/${selectedRequest.id}/approve`;
      const payload: Record<string, string> = {};

      if (actionType === "APPROVE") {
        payload.admin_notes = actionReason;
      } else if (actionType === "REJECT") {
        endpoint = `/admin/verifications/${selectedRequest.id}/reject`;
        payload.reason = actionReason;
      } else if (actionType === "RESUBMIT") {
        endpoint = `/admin/verifications/${selectedRequest.id}/request-resubmission`;
        payload.reason = actionReason;
      }

      await api.post(endpoint, payload);
      alert("Verification status updated successfully.");
      
      // Close details and refresh queue list
      setSelectedRequest(null);
      setActionType(null);
      setActionReason("");
      fetchQueue();
    } catch (err: any) {
      alert(err.message || "Failed to execute update.");
    } finally {
      setSubmitting(false);
    }
  };

  const getDocDownloadUrl = (docId: number) => {
    if (!selectedRequest) return "#";
    // Returns full private secure file fetch endpoint path
    return `http://localhost:8000/api/v1/admin/verifications/${selectedRequest.id}/documents/${docId}/download`;
  };

  return (
    <div className="p-8 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white">Identity Verifications Queue</h1>
        <p className="text-slate-400 text-sm mt-1">Review government IDs and award authenticity trust badges to creators.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading review verifications queue...</div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 text-red-400 p-4 rounded-xl">{error}</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl">
          Verification queue is currently empty. Excellent work!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Verification ({queue.length})</h3>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl divide-y divide-slate-850 overflow-hidden shadow-xl">
              {queue.map((item) => (
                <div
                  key={item.id}
                  onClick={() => viewDetails(item)}
                  className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-900/90 transition-colors ${
                    selectedRequest?.id === item.id ? "bg-slate-900/90 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-white text-base">{item.full_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Submitted: {new Date(item.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.status === "PENDING" ? "bg-yellow-950/60 border border-yellow-800 text-yellow-400" :
                      "bg-blue-950/60 border border-blue-800 text-blue-400"
                    }`}>
                      {item.status.replace("_", " ")}
                    </span>
                    <button className="text-blue-400 hover:text-blue-300 font-semibold text-xs">
                      Review Docs &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details & Actions Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Review Panel</h3>

            {loadingDetail ? (
              <div className="py-20 text-center text-slate-400">Loading document verification details...</div>
            ) : selectedRequest ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Applicant</span>
                  <h4 className="text-xl font-bold text-white">{selectedRequest.full_name}</h4>
                  <p className="text-xs text-slate-400 font-mono">Profile ID: #{selectedRequest.freelancer_profile_id}</p>
                  <p className="text-xs text-slate-400">Status: <strong className="text-white">{selectedRequest.status}</strong></p>
                </div>

                {/* Queue Transition to Review state */}
                {selectedRequest.status === "PENDING" && (
                  <button
                    onClick={handleStartReview}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
                  >
                    Start Documents Review
                  </button>
                )}

                {/* Secure Files Uploads List */}
                <div className="space-y-3">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Submitted Files</span>
                  {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRequest.documents.map((doc) => (
                        <div key={doc.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-white block">{doc.document_type.replace("_", " ")}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{doc.mime_type}</span>
                          </div>
                          {/* Secure File Fetch Link */}
                          <a
                            href={getDocDownloadUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-900 border border-slate-800 text-blue-400 hover:text-blue-300 font-semibold px-2.5 py-1 rounded text-xs transition-colors"
                          >
                            Open File
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No documents found attached to this verification claim.</p>
                  )}
                </div>

                {/* Decision Actions */}
                {selectedRequest.status !== "PENDING" && (
                  <div className="space-y-2 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setActionType("APPROVE")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
                    >
                      Approve & Verify Identity
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setActionType("RESUBMIT")}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-yellow-500 hover:text-yellow-400 font-semibold py-2 rounded-lg text-sm transition-colors text-center"
                      >
                        Ask Resubmit
                      </button>
                      <button
                        onClick={() => setActionType("REJECT")}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-red-500 hover:text-red-400 font-semibold py-2 rounded-lg text-sm transition-colors text-center"
                      >
                        Reject Request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-sm">
                Select a verification request from the list to preview documents.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Action Modal */}
      {actionType && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-white">
                {actionType === "APPROVE" ? "Approve Verification" :
                 actionType === "REJECT" ? "Reject Verification" :
                 "Request Files Resubmission"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Confirm decision for <strong className="text-slate-200">{selectedRequest.full_name}</strong>.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase">
                {actionType === "APPROVE" ? "Internal Notes (Optional)" : "Instruction / Reason Description"}
              </label>
              <textarea
                rows={4}
                placeholder={
                  actionType === "APPROVE" ? "All documents verified. Matches profile information." :
                  "Explain why documents are rejected or specify what replacement files are required..."
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={submitting}
                onClick={() => {
                  setActionType(null);
                  setActionReason("");
                }}
                className="bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submitting || (actionType !== "APPROVE" && !actionReason.trim())}
                onClick={handleActionSubmit}
                className={`text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors ${
                  actionType === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" :
                  actionType === "REJECT" ? "bg-red-600 hover:bg-red-700" :
                  "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                {submitting ? "Updating..." : "Submit Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
