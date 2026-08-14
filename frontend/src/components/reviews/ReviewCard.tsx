import React, { useState } from "react";
import StarRating from "./StarRating";
import { useAuth } from "@/context/AuthContext";
import { reviewService } from "@/services/review.service";

interface ReviewCardProps {
  review: any;
  freelancerMode?: boolean; // If true, displays Reply button
  clientMode?: boolean; // If true, displays Edit/Delete buttons
  onEdit?: (review: any) => void;
  onDeleteSuccess?: (id: number) => void;
  onReplySuccess?: (reviewId: number, responseText: string) => void;
}

export default function ReviewCard({
  review,
  freelancerMode = false,
  clientMode = false,
  onEdit,
  onDeleteSuccess,
  onReplySuccess,
}: ReviewCardProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState(review.response_obj?.response || "");
  const [submittingReply, setSubmittingReply] = useState(false);
  
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const formattedDate = new Date(review.created_at).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSubmittingReply(true);
      if (review.response_obj) {
        // Edit existing response
        await reviewService.editResponse(review.id, replyText);
      } else {
        // Submit new response
        await reviewService.submitResponse(review.id, replyText);
      }
      setShowReplyForm(false);
      if (onReplySuccess) onReplySuccess(review.id, replyText);
    } catch (err: any) {
      alert(err.message || "Failed to submit response.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to remove this review? This action cannot be undone.")) return;
    try {
      await reviewService.deleteReview(review.id);
      if (onDeleteSuccess) onDeleteSuccess(review.id);
    } catch (err: any) {
      alert(err.message || "Failed to remove review.");
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setReporting(true);
      await reviewService.reportReview(review.id, { reason: reportReason, details: reportDetails });
      alert("Thank you. The review has been reported and is queued for moderation.");
      setShowReport(false);
      setReportDetails("");
    } catch (err: any) {
      alert(err.message || "Failed to report review.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-850 rounded-3xl p-6 shadow-xl space-y-4">
      {/* Header section */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center text-indigo-400 font-bold uppercase">
            {review.client_name ? review.client_name[0] : "C"}
          </div>
          <div>
            <h4 className="text-xs font-black text-white">{review.client_name || "Verified Client"}</h4>
            <span className="text-[10px] text-slate-500 block mt-0.5">{formattedDate}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <StarRating rating={review.overall_rating} size="xs" />
            <span className="text-xs font-black text-white">{review.overall_rating.toFixed(1)}</span>
          </div>
          {review.is_verified_booking && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
              ✓ Verified Booking
            </span>
          )}
        </div>
      </div>

      {/* Review content */}
      <div className="space-y-2">
        {review.title && (
          <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">{review.title}</h5>
        )}
        <p className="text-xs text-slate-350 leading-relaxed whitespace-pre-line">{review.comment}</p>
      </div>

      {/* Sub-ratings Breakdown display */}
      {(review.quality_rating ||
        review.communication_rating ||
        review.professionalism_rating ||
        review.timeliness_rating ||
        review.value_rating) && (
        <div className="bg-slate-950/20 border border-slate-850/50 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-5 gap-3 text-[10px] text-slate-400">
          {review.quality_rating && (
            <div>
              <span className="text-slate-500 block">Quality</span>
              <strong className="text-white font-bold">{review.quality_rating} / 5</strong>
            </div>
          )}
          {review.communication_rating && (
            <div>
              <span className="text-slate-500 block">Communication</span>
              <strong className="text-white font-bold">{review.communication_rating} / 5</strong>
            </div>
          )}
          {review.professionalism_rating && (
            <div>
              <span className="text-slate-500 block">Professionalism</span>
              <strong className="text-white font-bold">{review.professionalism_rating} / 5</strong>
            </div>
          )}
          {review.timeliness_rating && (
            <div>
              <span className="text-slate-500 block">Timeliness</span>
              <strong className="text-white font-bold">{review.timeliness_rating} / 5</strong>
            </div>
          )}
          {review.value_rating && (
            <div>
              <span className="text-slate-500 block">Value</span>
              <strong className="text-white font-bold">{review.value_rating} / 5</strong>
            </div>
          )}
        </div>
      )}

      {/* Public Response by Freelancer */}
      {review.response_obj && !showReplyForm && (
        <div className="bg-indigo-950/10 border-l-2 border-indigo-500 p-4 rounded-r-2xl text-xs space-y-1">
          <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider block">
            Response from professional
          </span>
          <p className="text-slate-300 leading-relaxed">{review.response_obj.response}</p>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex justify-between items-center gap-4 pt-1 text-[11px] border-t border-slate-850 pt-3">
        <div className="flex gap-3">
          {user && user.role === "CLIENT" && clientMode && (
            <>
              <button
                onClick={() => onEdit && onEdit(review)}
                className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline cursor-pointer"
              >
                Edit Review
              </button>
              <button
                onClick={handleDelete}
                className="text-rose-500 font-bold hover:text-rose-400 hover:underline cursor-pointer"
              >
                Delete
              </button>
            </>
          )}

          {user && freelancerMode && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              {review.response_obj ? "Edit Public Response" : "Public Response"}
            </button>
          )}
        </div>

        {user && !clientMode && !freelancerMode && (
          <button
            onClick={() => setShowReport(!showReport)}
            className="text-slate-500 font-medium hover:text-rose-400 transition cursor-pointer"
          >
            Report review
          </button>
        )}
      </div>

      {/* Reply Form */}
      {showReplyForm && (
        <form onSubmit={handleReplySubmit} className="space-y-3 pt-2">
          <label className="block text-[10px] text-indigo-400 uppercase font-black">
            Your Public Response
          </label>
          <textarea
            rows={3}
            required
            placeholder="Type your polite public response..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowReplyForm(false)}
              className="px-3 py-1 bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReply}
              className="px-4 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg"
            >
              {submittingReply ? "Submitting..." : "Post Response"}
            </button>
          </div>
        </form>
      )}

      {/* Report Form modal inline */}
      {showReport && (
        <form onSubmit={handleReport} className="space-y-3 bg-slate-950/40 p-4 border border-slate-850 rounded-2xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-indigo-400 font-black uppercase">Report Review content</span>
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="text-xs text-slate-500 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1.5 text-xs text-white"
              >
                <option value="SPAM">Spam</option>
                <option value="HARASSMENT">Harassment</option>
                <option value="FALSE_INFORMATION">False Info</option>
                <option value="PERSONAL_INFORMATION">Private Details</option>
                <option value="ABUSIVE_LANGUAGE">Abusive Text</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Report details</label>
            <textarea
              rows={2}
              placeholder="Why are you reporting this review? Be specific..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={reporting}
            className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs"
          >
            {reporting ? "Submitting report..." : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
}
