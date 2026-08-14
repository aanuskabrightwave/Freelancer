"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { marketplaceService } from "@/services/service.service";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { messageService } from "@/services/message.service";

const SERVICE_TYPE_LABELS = {
  ON_SITE: "On-Site Delivery",
  REMOTE: "Remote Delivery",
  HYBRID: "Hybrid Delivery"
};

export default function ServiceDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [service, setService] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePkgType, setActivePkgType] = useState<"BASIC" | "STANDARD" | "PREMIUM">("BASIC");
  
  // Media Viewer active image
  const [activeMediaUrl, setActiveMediaUrl] = useState<string>("");

  // Auth & Booking Checkout States
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reqAnswers, setReqAnswers] = useState<Record<string, string>>({});
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleCheckoutClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role === "FREELANCER") {
      alert("Freelancers cannot book services. Please log in as a Client.");
      return;
    }
    router.push(`/services/${service.id}/book?package=${activePkgType}`);
  };

  const handleContactClick = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      setBookingLoading(true);
      const convo = await messageService.createConversation(service.freelancer.id);
      router.push(`/client/messages?active=${convo.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start conversation.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate) {
      setBookingError("Please select a date and time for execution.");
      return;
    }
    try {
      setBookingLoading(true);
      setBookingError(null);
      const activePackage = service.packages?.find((p: any) => p.package_type === activePkgType);
      
      const payload = {
        service_id: service.id,
        service_package_id: activePackage.id,
        booking_date: new Date(bookingDate).toISOString(),
        notes,
        requirements_answers: reqAnswers
      };

      await bookingService.createBooking(payload);
      setShowCheckout(false);
      router.push("/client/bookings");
    } catch (err: any) {
      setBookingError(err.response?.data?.detail || "Failed to process booking reservation.");
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    async function loadServiceDetail() {
      if (!id) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await marketplaceService.getPublicService(id as string);
        setService(data);
        
        // Find default cover or first image
        const cover = data.media?.find((m: any) => m.is_cover) || data.media?.[0];
        if (cover) {
          setActiveMediaUrl(cover.media_url);
        }

        // Set default active package
        if (data.packages && data.packages.length > 0) {
          setActivePkgType(data.packages[0].package_type);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setErrorMsg("This service listing is not available or has been paused by the owner.");
        } else {
          setErrorMsg("Failed to retrieve service listing details.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadServiceDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (errorMsg || !service) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-md shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Service Not Accessible</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMsg || "Could not retrieve details."}</p>
          <button
            onClick={() => router.push("/services")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const activePackage = service.packages?.find((p: any) => p.package_type === activePkgType);
  const mediaImages = service.media?.filter((m: any) => m.media_type === "IMAGE") || [];
  const mediaVideos = service.media?.filter((m: any) => m.media_type === "EXTERNAL_VIDEO" || m.media_type === "VIDEO") || [];

  // Gather unique deliverables labels across all enabled packages to build comparison matrix
  const deliverableLabels: string[] = [];
  service.packages?.forEach((p: any) => {
    p.deliverables?.forEach((d: any) => {
      if (!deliverableLabels.includes(d.label)) {
        deliverableLabels.push(d.label);
      }
    });
  });

  const getDeliverableValue = (pkgType: string, label: string) => {
    const pkg = service.packages?.find((p: any) => p.package_type === pkgType);
    if (!pkg) return "-";
    const deliv = pkg.deliverables?.find((d: any) => d.label === label);
    return deliv ? deliv.value : "—";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      
      {/* Cover Banner */}
      <div className="h-48 md:h-64 w-full bg-slate-900 relative overflow-hidden">
        {activeMediaUrl ? (
          <img src={activeMediaUrl} alt="" className="w-full h-full object-cover opacity-60 filter blur-sm" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 opacity-60"></div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-20 relative z-10">
        
        {/* Main Details card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="min-w-0">
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
              {service.subcategory?.name || service.category?.name || "Creative Service"}
            </span>
            <h1 className="text-xl md:text-3xl font-black text-white mt-3 leading-tight">{service.title}</h1>
            
            {/* Freelancer details link */}
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                {service.freelancer?.profile_photo_url ? (
                  <img src={service.freelancer.profile_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px]">P</div>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Offered by{" "}
                  <Link 
                    href={`/freelancers/${service.freelancer?.id}`}
                    className="text-indigo-400 font-bold hover:underline"
                  >
                    {service.freelancer?.full_name}
                  </Link>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{service.freelancer?.professional_title}</p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto border-t border-slate-800 lg:border-t-0 pt-4 lg:pt-0 flex flex-col items-start lg:items-end gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Starting Rate</span>
            <span className="text-2xl font-black text-white">₹{parseInt(service.starting_price || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Details and Sidebar row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Detailed Content Columns */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Media Gallery Viewer */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl">
              <div className="aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-850">
                {activeMediaUrl ? (
                  <img src={activeMediaUrl} alt="Showcase Preview" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-600 font-bold uppercase">No Active Preview</span>
                )}
              </div>

              {/* Thumbnails list */}
              <div className="flex gap-2 overflow-x-auto mt-4 pb-2">
                {mediaImages.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMediaUrl(m.media_url)}
                    className={`w-20 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition ${
                      activeMediaUrl === m.media_url ? "border-indigo-500" : "border-slate-850"
                    }`}
                  >
                    <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                
                {mediaVideos.map((v: any) => (
                  <a
                    key={v.id}
                    href={v.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-20 h-14 rounded-lg bg-slate-950 border-2 border-slate-850 flex-shrink-0 flex flex-col items-center justify-center text-[9px] text-indigo-400 font-bold"
                  >
                    <span>📺 VIDEO</span>
                    <span className="text-[7px] text-slate-600 truncate max-w-full px-1">{v.media_url}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <h2 className="text-base font-extrabold text-white mb-4">Service Description</h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{service.description}</p>
            </div>

            {/* Package Comparison Table (Only render if has packages) */}
            {service.packages && service.packages.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl overflow-hidden">
                <h2 className="text-base font-extrabold text-white mb-6">Compare Packages</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold">
                        <th className="py-3 pr-4">Scope deliverables</th>
                        <th className="py-3 px-4 text-center">BASIC</th>
                        {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                          <th className="py-3 px-4 text-center">STANDARD</th>
                        )}
                        {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                          <th className="py-3 px-4 text-center">PREMIUM</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      
                      {/* Price row */}
                      <tr className="text-white font-bold">
                        <td className="py-3 pr-4 font-extrabold">Price</td>
                        <td className="py-3 px-4 text-center text-indigo-400 font-black">
                          ₹{parseInt(service.packages.find((p: any) => p.package_type === "BASIC")?.price || 0).toLocaleString()}
                        </td>
                        {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                          <td className="py-3 px-4 text-center text-indigo-400 font-black">
                            ₹{parseInt(service.packages.find((p: any) => p.package_type === "STANDARD")?.price || 0).toLocaleString()}
                          </td>
                        )}
                        {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                          <td className="py-3 px-4 text-center text-indigo-400 font-black">
                            ₹{parseInt(service.packages.find((p: any) => p.package_type === "PREMIUM")?.price || 0).toLocaleString()}
                          </td>
                        )}
                      </tr>

                      {/* Deliverables comparison matrix */}
                      {deliverableLabels.map((label, idx) => (
                        <tr key={idx} className="text-slate-300">
                          <td className="py-3 pr-4 font-medium">{label}</td>
                          <td className="py-3 px-4 text-center font-bold">{getDeliverableValue("BASIC", label)}</td>
                          {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                            <td className="py-3 px-4 text-center font-bold">{getDeliverableValue("STANDARD", label)}</td>
                          )}
                          {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                            <td className="py-3 px-4 text-center font-bold">{getDeliverableValue("PREMIUM", label)}</td>
                          )}
                        </tr>
                      ))}

                      {/* Delivery days row */}
                      <tr className="text-slate-400">
                        <td className="py-3 pr-4 font-semibold">Delivery Time</td>
                        <td className="py-3 px-4 text-center font-bold">
                          {service.packages.find((p: any) => p.package_type === "BASIC")?.delivery_time_days} Days
                        </td>
                        {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                          <td className="py-3 px-4 text-center font-bold">
                            {service.packages.find((p: any) => p.package_type === "STANDARD")?.delivery_time_days} Days
                          </td>
                        )}
                        {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                          <td className="py-3 px-4 text-center font-bold">
                            {service.packages.find((p: any) => p.package_type === "PREMIUM")?.delivery_time_days} Days
                          </td>
                        )}
                      </tr>

                      {/* Revisions row */}
                      <tr className="text-slate-400">
                        <td className="py-3 pr-4 font-semibold">Revisions</td>
                        <td className="py-3 px-4 text-center font-bold">
                          {service.packages.find((p: any) => p.package_type === "BASIC")?.revisions}
                        </td>
                        {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                          <td className="py-3 px-4 text-center font-bold">
                            {service.packages.find((p: any) => p.package_type === "STANDARD")?.revisions}
                          </td>
                        )}
                        {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                          <td className="py-3 px-4 text-center font-bold">
                            {service.packages.find((p: any) => p.package_type === "PREMIUM")?.revisions}
                          </td>
                        )}
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Client Requirements Read-only prompts */}
            {service.requirements && service.requirements.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <h2 className="text-base font-extrabold text-white mb-4">Required From Client (Before Booking)</h2>
                <div className="space-y-3">
                  {service.requirements.map((r: any, idx: number) => (
                    <div key={r.id || idx} className="bg-slate-950 border border-slate-850 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[8px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 mr-3 uppercase font-extrabold">{r.field_type}</span>
                        <span className="text-slate-300 font-bold">{r.question}</span>
                      </div>
                      {r.is_required && <span className="text-rose-400 text-[10px] font-medium">*Required</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Checkout & Booking Widget Sidebar */}
          <div className="space-y-6">
            
            {/* Packages active card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              
              {/* Package selector tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850 text-[10px]">
                {service.packages?.map((p: any) => {
                  const type = p.package_type;
                  return (
                    <button
                      key={type}
                      onClick={() => setActivePkgType(type)}
                      className={`py-1.5 rounded-lg font-black transition uppercase ${
                        activePkgType === type ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              {activePackage ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-white truncate max-w-[150px]">{activePackage.name}</h3>
                    <span className="text-lg font-black text-indigo-400">
                      ₹{parseInt(activePackage.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{activePackage.description}</p>
                  
                  <div className="flex justify-between text-[10px] text-slate-500 border-t border-b border-slate-850 py-3">
                    <span>⏳ {activePackage.delivery_time_days} Days Delivery</span>
                    <span>🔄 {activePackage.revisions} Revisions</span>
                  </div>

                  {/* Deliverables details */}
                  <div className="space-y-2">
                    {activePackage.deliverables?.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">{d.label}</span>
                        <span className="text-slate-200 font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions (Enabled) */}
                  <div className="space-y-2 pt-4">
                    <button
                      onClick={handleCheckoutClick}
                      disabled={bookingLoading}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition shadow-lg shadow-indigo-600/20 text-center"
                    >
                      Continue (₹{parseInt(activePackage.price).toLocaleString()})
                    </button>
                    <button
                      onClick={handleContactClick}
                      disabled={bookingLoading}
                      className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-slate-200 text-xs font-black rounded-xl border border-slate-800 transition text-center"
                    >
                      Contact Freelancer
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-500 block text-center">Package details unavailable.</span>
              )}

            </div>

            {/* Travel Radius specifics */}
            {service.service_type !== "REMOTE" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-xs space-y-4">
                <h3 className="font-extrabold text-white text-sm">Location Logistics</h3>
                <div className="space-y-2 text-slate-400">
                  <div className="flex justify-between">
                    <span>Base City</span>
                    <span className="text-slate-200 font-bold">{service.city}, {service.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Travel Coverage</span>
                    <span className="text-slate-200 font-bold">
                      {service.travel_available ? `Willing (Radius: ${service.service_radius_km || 25} km)` : "Local Only"}
                    </span>
                  </div>
                  {service.travel_available && service.travel_fee && (
                    <div className="flex justify-between border-t border-slate-850 pt-2">
                      <span>Travel Surcharge</span>
                      <span className="text-indigo-400 font-bold">₹{parseInt(service.travel_fee)}/km</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCheckout(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg font-bold"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-white border-b border-slate-800 pb-4 mb-6">
              Book {service.title}
            </h2>

            {bookingError && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Package Chosen
                </label>
                <div className="bg-slate-950 border border-slate-850 px-4 py-3 rounded-xl flex justify-between items-center">
                  <span className="text-sm font-bold text-white uppercase">{activePkgType} Package</span>
                  <span className="text-indigo-400 font-black">₹{parseInt(activePackage.price).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Scheduled Execution Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition"
                />
              </div>

              {/* Dynamic Requirements Answers Fields */}
              {service.requirements && service.requirements.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">
                    Requirements from Client
                  </h3>
                  {service.requirements.map((req: any) => (
                    <div key={req.id}>
                      <label className="block text-xs text-slate-300 font-bold mb-2">
                        {req.question} {req.is_required && <span className="text-rose-400 font-bold">*</span>}
                      </label>
                      
                      {req.field_type === "TEXTAREA" ? (
                        <textarea
                          required={req.is_required}
                          value={reqAnswers[String(req.id)] || ""}
                          onChange={(e) => setReqAnswers(prev => ({ ...prev, [String(req.id)]: e.target.value }))}
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition resize-none"
                        />
                      ) : (
                        <input
                          type={req.field_type === "NUMBER" ? "number" : req.field_type === "DATE" ? "date" : "text"}
                          required={req.is_required}
                          value={reqAnswers[String(req.id)] || ""}
                          onChange={(e) => setReqAnswers(prev => ({ ...prev, [String(req.id)]: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Provide any location instructions or details..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 disabled:text-indigo-400 text-white text-sm font-black rounded-xl transition shadow-lg shadow-indigo-600/20 text-center"
              >
                {bookingLoading ? "Processing Booking..." : `Confirm Booking (₹${parseInt(activePackage.price).toLocaleString()})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
