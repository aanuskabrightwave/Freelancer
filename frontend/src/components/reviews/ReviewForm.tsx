import React, { useState } from "react";
import StarRating from "./StarRating";
import { reviewService } from "@/services/review.service";

interface ReviewFormProps {
  bookingId: number | string;
  onSuccess: (newReview: any) => void;
}

export default function ReviewForm({ bookingId, onSuccess }: ReviewFormProps) {
  const [overall, setOverall] = useState(5);
  const [quality, setQuality] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [professionalism, setProfessionalism] = useState<number | null>(null);
  const [timeliness, setTimeliness] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.length < 20) {
      setErrorMsg("Your review comment must be at least 20 characters long.");
      return;
    }
    if (comment.length > 3000) {
      setErrorMsg("Your review comment cannot exceed 3000 characters.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const payload: any = {
        overall_rating: overall,
        comment,
      };

      if (quality !== null) payload.quality_rating = quality;
      if (communication !== null) payload.communication_rating = communication;
      if (professionalism !== null) payload.professionalism_rating = professionalism;
      if (timeliness !== null) payload.timeliness_rating = timeliness;
      if (value !== null) payload.value_rating = value;
      if (title.trim()) payload.title = title.trim();

      const newReview = await reviewService.submitReview(bookingId, payload);
      onSuccess(newReview);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit your review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
    >
      <div>
        <span className="text-[10px] text-primary font-black uppercase tracking-wider block mb-1">
          Share Your Experience
        </span>
        <h2 className="text-lg font-black text-text-main">How was your booking experience?</h2>
        <p className="text-xs text-text-sub mt-1">
          Your feedback helps other clients find verified creative professionals.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Ratings Categories Grid */}
      <div className="space-y-4">
        {/* Overall Rating (Mandatory) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background p-4 border border-border-custom rounded-2xl">
          <div>
            <span className="text-xs font-black text-text-main uppercase tracking-wide block">Overall Experience *</span>
            <span className="text-[10px] text-text-muted mt-0.5 block">Required rating score</span>
          </div>
          <StarRating rating={overall} interactive size="lg" onChange={setOverall} />
        </div>

        {/* Detailed Ratings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-background border border-border-custom p-4 rounded-2xl flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-text-sub">Quality of Work</span>
            <StarRating
              rating={quality || 0}
              interactive
              size="sm"
              onChange={(v) => setQuality(v === 0 ? null : v)}
            />
          </div>

          <div className="bg-background border border-border-custom p-4 rounded-2xl flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-text-sub">Communication</span>
            <StarRating
              rating={communication || 0}
              interactive
              size="sm"
              onChange={(v) => setCommunication(v === 0 ? null : v)}
            />
          </div>

          <div className="bg-background border border-border-custom p-4 rounded-2xl flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-text-sub">Professionalism</span>
            <StarRating
              rating={professionalism || 0}
              interactive
              size="sm"
              onChange={(v) => setProfessionalism(v === 0 ? null : v)}
            />
          </div>

          <div className="bg-background border border-border-custom p-4 rounded-2xl flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-text-sub">Timeliness</span>
            <StarRating
              rating={timeliness || 0}
              interactive
              size="sm"
              onChange={(v) => setTimeliness(v === 0 ? null : v)}
            />
          </div>

          <div className="bg-background border border-border-custom p-4 rounded-2xl flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-text-sub">Value for Money</span>
            <StarRating
              rating={value || 0}
              interactive
              size="sm"
              onChange={(v) => setValue(v === 0 ? null : v)}
            />
          </div>
        </div>
      </div>

      {/* Review Details */}
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-[10px] text-text-sub uppercase font-black mb-1">
            Review Title (Optional)
          </label>
          <input
            type="text"
            maxLength={150}
            placeholder="Summarize your review experience..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-muted focus:border-primary focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-[10px] text-text-sub uppercase font-black mb-1">
            Tell us about your experience * (min 20 chars)
          </label>
          <textarea
            rows={4}
            required
            minLength={20}
            maxLength={3000}
            placeholder="Aarav Sharma and his team were professional, arrived on time and delivered beautiful wedding photographs..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main placeholder-text-muted focus:border-primary focus:outline-none resize-none transition"
          />
          <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
            <span>Minimum 20 characters</span>
            <span className={comment.length < 20 ? "text-rose-500" : "text-emerald-500"}>
              {comment.length} / 3000
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-text-main text-xs font-black rounded-xl transition uppercase tracking-wider shadow-lg shadow-indigo-950/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting Review..." : "Submit Review"}
      </button>
    </form>
  );
}
