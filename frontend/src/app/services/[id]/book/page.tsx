"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { availabilityService } from "@/services/availability.service";
import { marketplaceService } from "@/services/service.service";

function BookServiceContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pkgType = searchParams.get("package") || "BASIC";

  const { user } = useAuth();
  
  const [service, setService] = useState<any | null>(null);
  const [activePackage, setActivePackage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  
  // Location (ON_SITE / HYBRID)
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [notes, setNotes] = useState("");
  const [reqAnswers, setReqAnswers] = useState<Record<string, string>>({});
  
  // Checking availability states
  const [availChecked, setAvailChecked] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availReason, setAvailReason] = useState<string | null>(null);
  
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    async function loadDetails() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await marketplaceService.getPublicService(id as string);
        setService(data);
        
        // Find matching package
        const pkg = data.packages?.find((p: any) => p.package_type === pkgType) || data.packages?.[0];
        setActivePackage(pkg);

        // Prepopulate city/state from service
        setCity(data.city || "");
        setState(data.state || "");

        // Initialize requirements answers
        const initialAnswers: Record<string, string> = {};
        data.requirements?.forEach((req: any) => {
          initialAnswers[String(req.id)] = "";
        });
        setReqAnswers(initialAnswers);
      } catch (err) {
        setErrorMsg("Failed to retrieve service listing details.");
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [id, pkgType]);

  const handleCheckAvailability = async () => {
    if (!scheduledDate) {
      alert("Please select a date first.");
      return;
    }
    try {
      setAvailLoading(true);
      setAvailReason(null);
      
      const check = await availabilityService.checkPublicAvailability(
        service.freelancer.id,
        scheduledDate,
        startTime,
        endTime
      );
      
      setIsAvailable(check.available);
      setAvailChecked(true);
      if (!check.available) {
        setAvailReason("Conflict detected. Freelancer is unavailable during these hours.");
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to query availability coordinates.");
    } finally {
      setAvailLoading(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role === "FREELANCER") {
      alert("Freelancers cannot book services.");
      return;
    }

    try {
      setSubmitLoading(true);
      setErrorMsg(null);

      const payload = {
        service_id: service.id,
        service_package_id: activePackage.id,
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        venue_name: service.service_type !== "REMOTE" ? venueName : undefined,
        location_city: service.service_type !== "REMOTE" ? city : undefined,
        location_state: service.service_type !== "REMOTE" ? state : undefined,
        venue_address: service.service_type !== "REMOTE" ? venueAddress : undefined,
        notes,
        requirements_answers: reqAnswers
      };

      await bookingService.createBooking(payload);
      router.push("/client/bookings");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Booking failed. Re-verify coordinates and availability slot.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!service || !activePackage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex justify-center items-center">
        Service listing packages details are unavailable.
      </div>
    );
  }

  const isPhysical = service.service_type !== "REMOTE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8 font-sans">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Booking Entry Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <h1 className="text-xl md:text-2xl font-black text-white mb-2">Book Creative Service</h1>
            <p className="text-xs text-slate-400">Provide schedule details and complete requirement questions.</p>

            {errorMsg && (
              <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="mt-8 space-y-6">
              
              {/* Row 1: Date & Time Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Execution Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={scheduledDate}
                    onChange={(e) => {
                      setScheduledDate(e.target.value);
                      setAvailChecked(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setAvailChecked(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setAvailChecked(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition"
                  />
                </div>
              </div>

              {/* Check Availability Trigger (Required for physical) */}
              {isPhysical && (
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="text-xs">
                    <h4 className="font-bold text-white mb-1">Availability Check</h4>
                    <p className="text-slate-400">Ensure the freelancer schedule has no overlaps.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {availChecked && (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                        isAvailable ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}>
                        {isAvailable ? "Available" : "Conflict Blocked"}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={availLoading}
                      onClick={handleCheckAvailability}
                      className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition"
                    >
                      {availLoading ? "Checking..." : "Verify Slot"}
                    </button>
                  </div>
                </div>
              )}

              {/* Physical Location specifications */}
              {isPhysical && (
                <div className="space-y-4 pt-2 border-t border-slate-850">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Agreed Event Venue Location
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Venue Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Radisson Blu Hall"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">State *</label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Full Venue Address *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Street number, landmark details..."
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Requirements Questionnaire answers */}
              {service.requirements && service.requirements.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-850">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Required Information from Freelancer
                  </h3>
                  
                  {service.requirements.map((req: any) => (
                    <div key={req.id}>
                      <label className="block text-[11px] text-slate-300 font-bold mb-2">
                        {req.question} {req.is_required && <span className="text-rose-400 font-bold">*</span>}
                      </label>
                      <textarea
                        required={req.is_required}
                        rows={2}
                        value={reqAnswers[String(req.id)] || ""}
                        onChange={(e) => setReqAnswers(prev => ({ ...prev, [String(req.id)]: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Additional notes */}
              <div className="pt-2 border-t border-slate-850">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide any additional layout coordinates or instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Submit trigger */}
              <button
                type="submit"
                disabled={submitLoading || (isPhysical && !isAvailable)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 disabled:text-indigo-400 text-white text-xs font-black rounded-xl transition shadow-lg shadow-indigo-600/20 text-center uppercase tracking-wider"
              >
                {submitLoading ? "Submitting Booking Request..." : `Submit Booking Request (₹${parseInt(activePackage.price).toLocaleString()})`}
              </button>

            </form>
          </div>
        </div>

        {/* Right Side: Service / Package Details Summary sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-850 pb-4">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block mb-1">
                Selected listing
              </span>
              <h2 className="text-sm font-bold text-white leading-snug">{service.title}</h2>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                Fulfillment: {service.service_type}
              </p>
            </div>

            <div className="border-b border-slate-850 pb-4">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block mb-1">
                Package
              </span>
              <h3 className="text-xs font-black text-white uppercase">{activePackage.name} ({activePackage.package_type})</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{activePackage.description}</p>
            </div>

            <div className="border-b border-slate-850 pb-4">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block mb-2">
                Deliverables Included
              </span>
              <div className="space-y-1.5">
                {activePackage.deliverables?.map((d: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">{d.label}</span>
                    <span className="text-slate-200 font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Agreed Rate</span>
              <span className="text-lg font-black text-indigo-400">
                ₹{parseInt(activePackage.price).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function BookServicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BookServiceContent />
    </Suspense>
  );
}
