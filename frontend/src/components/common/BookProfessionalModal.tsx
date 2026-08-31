"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { bookingService } from "@/services/booking.service";
import { getMediaUrl } from "@/lib/api";
import { X, Calendar, MapPin, Sparkles, Shield, CheckCircle } from "lucide-react";

interface BookProfessionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancer: {
    id: number;
    full_name: string;
    primary_profession?: string;
    city?: string;
    state?: string;
    profile_photo_url?: string | null;
  };
  service?: {
    id: number;
    title: string;
    requirements?: {
      id: number;
      question: string;
      field_type: string;
      is_required: boolean;
    }[];
  } | null;
  activePackage?: {
    id: number;
    package_type: string;
    price: string | number;
  } | null;
}

export default function BookProfessionalModal({
  isOpen,
  onClose,
  freelancer,
  service = null,
  activePackage = null,
}: BookProfessionalModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  // Form states
  const [scheduledDate, setScheduledDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [requirementDescription, setRequirementDescription] = useState("");
  const [budget, setBudget] = useState(
    activePackage ? String(activePackage.price) : ""
  );
  const [reqAnswers, setReqAnswers] = useState<Record<string, string>>({});

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Focus trap & Escape close listeners
  useEffect(() => {
    if (!isOpen) return;

    // Reset state on open
    setScheduledDate("");
    setVenueName("");
    setRequirementDescription("");
    setBudget(activePackage ? String(activePackage.price) : "");
    setErrors({});
    setSubmitError(null);
    setSuccessData(null);

    // Initialize requirements
    const initialAnswers: Record<string, string> = {};
    if (service?.requirements) {
      service.requirements.forEach((req) => {
        initialAnswers[String(req.id)] = "";
      });
    }
    setReqAnswers(initialAnswers);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activePackage, service]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!scheduledDate) {
      newErrors.scheduled_date = "Please select a booking date.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(scheduledDate);
      if (selected < today) {
        newErrors.scheduled_date = "Booking date cannot be in the past.";
      }
    }

    if (!venueName.trim()) {
      newErrors.venue_name = "Venue or location name is required.";
    }

    if (!service && !requirementDescription.trim()) {
      newErrors.requirement_description = "Please tell us about your requirements.";
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      newErrors.budget = "Please enter a valid budget greater than zero.";
    }

    // Validate requirements (Part 14)
    if (service?.requirements) {
      service.requirements.forEach((req) => {
        if (req.is_required && !reqAnswers[String(req.id)]?.trim()) {
          newErrors[`req_${req.id}`] = `"${req.question}" is required.`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: any = {
        selected_freelancer_profile_id: freelancer.id,
        scheduled_date: scheduledDate,
        venue_name: venueName.trim(),
        requirement_description: requirementDescription.trim() || (service ? `Service booking: ${service.title}` : ""),
        budget: parseFloat(budget),
        booking_type: "REMOTE",
        requirements_answers: reqAnswers,
      };

      if (service) {
        payload.service_id = service.id;
      }
      if (activePackage) {
        payload.service_package_id = activePackage.id;
      }

      const res = await bookingService.createBooking(payload);
      setSuccessData(res);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.detail || "We couldn't submit your booking request. Please check the details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getProfessionLabel = (profession?: string) => {
    if (!profession) return "Creative Professional";
    return profession.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xs">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="bg-surface border border-border-custom max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] font-sans text-text-main animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-custom/50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Book Professional</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-elevated text-text-sub hover:text-text-main rounded-full transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {successData ? (
            /* Success confirmation screen (Part 19) */
            <div className="text-center space-y-6 py-4 animate-in fade-in duration-200">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base">Booking request submitted</h4>
                <p className="text-text-sub text-xs mt-2 leading-relaxed max-w-sm mx-auto">
                  Your request has been sent for review. You can track its status from Bookings and communicate with our team through Messages.
                </p>
              </div>

              {/* Booking Summary details */}
              <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 text-left text-xs font-semibold space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between border-b border-border-custom/30 pb-2">
                  <span className="text-text-muted">Booking Reference</span>
                  <span className="text-primary font-mono">{successData.booking_number}</span>
                </div>
                <div className="flex justify-between border-b border-border-custom/30 pb-2">
                  <span className="text-text-muted">Selected Professional</span>
                  <span className="text-text-main">{freelancer.full_name}</span>
                </div>
                <div className="flex justify-between border-b border-border-custom/30 pb-2">
                  <span className="text-text-muted">Booking Date</span>
                  <span className="text-text-main">{new Date(scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Current Status</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/30 text-amber-300 text-[9px] uppercase tracking-wider font-bold">
                    Awaiting Admin Review
                  </span>
                </div>
              </div>

              {/* Action Buttons (Part 20) */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 max-w-sm mx-auto">
                <button
                  onClick={() => {
                    onClose();
                    router.push("/client/bookings");
                  }}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-xl transition cursor-pointer text-center"
                >
                  View Booking
                </button>
                <button
                  onClick={() => {
                    onClose();
                    router.push("/client/messages");
                  }}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface-elevated text-text-main border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer text-center"
                >
                  Message Admin
                </button>
              </div>
            </div>
          ) : (
            /* Booking input form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="p-4 bg-rose-955/35 border border-rose-900/50 text-rose-200 text-xs rounded-xl font-medium">
                  {submitError}
                </div>
              )}

              {/* Summary Area (Part 6) */}
              <div className="bg-surface-elevated border border-border-custom p-4 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-surface border border-border-custom rounded-xl overflow-hidden flex items-center justify-center">
                  {freelancer.profile_photo_url ? (
                    <img
                      src={getMediaUrl(freelancer.profile_photo_url)}
                      alt={freelancer.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-text-muted font-bold">No Photo</span>
                  )}
                </div>
                <div className="text-xs">
                  <span className="text-[9px] uppercase tracking-widest font-black text-text-muted block">
                    Selected Professional
                  </span>
                  <h4 className="font-extrabold text-text-main text-xs mt-0.5">{freelancer.full_name}</h4>
                  <p className="text-text-sub text-[10px] mt-0.5">
                    {getProfessionLabel(freelancer.primary_profession)}
                    {freelancer.city && ` • ${freelancer.city}`}
                  </p>
                </div>
              </div>

              {/* Optional Service / Package Context */}
              {service && (
                <div className="bg-surface-elevated/40 border border-border-custom/50 px-4 py-3 rounded-2xl text-[10px] font-medium text-text-sub">
                  Booking Service: <span className="text-text-main font-bold">{service.title}</span>
                  {activePackage && (
                    <span className="block mt-1">
                      Package: <span className="text-primary font-extrabold uppercase">{activePackage.package_type}</span> (₹{parseInt(String(activePackage.price)).toLocaleString()})
                    </span>
                  )}
                </div>
              )}

              {/* Form Input fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Picker (Part 8) */}
                <div className="space-y-2">
                  <label htmlFor="scheduled_date" className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                    Booking Date
                  </label>
                  <input
                    id="scheduled_date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted font-medium"
                  />
                  {errors.scheduled_date && (
                    <p className="text-rose-400 text-[10px] font-bold">{errors.scheduled_date}</p>
                  )}
                </div>

                {/* Venue / Location (Part 9) */}
                <div className="space-y-2">
                  <label htmlFor="venue_name" className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                    Venue / Location
                  </label>
                  <input
                    id="venue_name"
                    type="text"
                    placeholder="Event venue, city, or online"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted font-medium"
                  />
                  {errors.venue_name && (
                    <p className="text-rose-400 text-[10px] font-bold">{errors.venue_name}</p>
                  )}
                </div>
              </div>

              {/* Requirements Description (Part 10) - only for direct bookings */}
              {!service && (
                <div className="space-y-2">
                  <label htmlFor="requirement_description" className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                    Tell us about your requirement
                  </label>
                  <textarea
                    id="requirement_description"
                    rows={4}
                    placeholder="Explain event details, specific requirements, duration, deliverables, etc."
                    value={requirementDescription}
                    onChange={(e) => setRequirementDescription(e.target.value)}
                    className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted resize-none font-medium"
                  />
                  {errors.requirement_description && (
                    <p className="text-rose-400 text-[10px] font-bold">{errors.requirement_description}</p>
                  )}
                </div>
              )}

              {/* Service custom requirements questions */}
              {service?.requirements && service.requirements.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider border-b border-border-custom pb-2">
                    Service Questions
                  </h4>
                  {service.requirements.map((req) => (
                    <div key={req.id} className="space-y-2">
                      <label htmlFor={`req_${req.id}`} className="block text-[10px] font-black text-text-sub">
                        {req.question} {req.is_required && <span className="text-rose-400">*</span>}
                      </label>
                      {req.field_type === "TEXTAREA" ? (
                        <textarea
                          id={`req_${req.id}`}
                          rows={3}
                          value={reqAnswers[String(req.id)] || ""}
                          onChange={(e) => setReqAnswers((prev) => ({ ...prev, [String(req.id)]: e.target.value }))}
                          className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted resize-none font-medium"
                        />
                      ) : (
                        <input
                          id={`req_${req.id}`}
                          type={req.field_type === "NUMBER" ? "number" : req.field_type === "DATE" ? "date" : "text"}
                          value={reqAnswers[String(req.id)] || ""}
                          onChange={(e) => setReqAnswers((prev) => ({ ...prev, [String(req.id)]: e.target.value }))}
                          className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted font-medium"
                        />
                      )}
                      {errors[`req_${req.id}`] && (
                        <p className="text-rose-400 text-[10px] font-bold">{errors[`req_${req.id}`]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Budget (Part 11) */}
              <div className="space-y-2">
                <label htmlFor="budget" className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                  Your Budget (₹)
                </label>
                <input
                  id="budget"
                  type="number"
                  placeholder="Budget in INR"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  disabled={!!activePackage}
                  className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted font-medium disabled:opacity-60"
                />
                {errors.budget && (
                  <p className="text-rose-400 text-[10px] font-bold">{errors.budget}</p>
                )}
              </div>

              {/* Coordinator notice block (Part 36) */}
              <div className="bg-surface-elevated/40 border border-border-custom/50 rounded-2xl p-4 flex gap-3 items-start text-[10px] font-medium text-text-sub leading-relaxed">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  After you submit, our team will review your request and coordinate the professional before payment is required.
                </p>
              </div>

              {/* Submit trigger (Part 15) */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-text-on-dark text-xs font-bold rounded-full transition shadow-sm text-center cursor-pointer"
              >
                {submitting ? "Submitting Booking..." : "Submit Booking Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
