"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getMediaUrl } from "@/lib/api";
import { marketplaceService } from "@/services/service.service";
import { useAuth } from "@/context/AuthContext";
import { bookingService } from "@/services/booking.service";
import { messageService } from "@/services/message.service";
import Container from "@/components/ui/Container";

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
    setShowCheckout(true);
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
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (errorMsg || !service) {
    return (
      <div className="min-h-screen bg-background text-text-main flex flex-col justify-center items-center px-6">
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-8 text-center max-w-md shadow-sm">
          <h2 className="text-xl font-semibold text-text-main mb-2">Service Not Accessible</h2>
          <p className="text-text-sub text-sm mb-6">{errorMsg || "Could not retrieve details."}</p>
          <button
            onClick={() => router.push("/services")}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition cursor-pointer"
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
    <div className="min-h-screen bg-background text-text-main font-sans pb-24">
      
      {/* Cover Banner */}
      <div className="h-48 md:h-64 w-full bg-dark relative overflow-hidden">
        {activeMediaUrl ? (
          <img src={getMediaUrl(activeMediaUrl)} alt="" className="w-full h-full object-cover opacity-60 filter blur-sm" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-dark to-dark-soft opacity-60"></div>
        )}
      </div>

      <Container className="-mt-20 relative z-10">
        
        {/* Main Details card */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 shadow-sm mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="min-w-0 space-y-3">
            <span className="px-3.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
              {service.subcategory?.name || service.category?.name || "Creative Service"}
            </span>
            <h1 className="text-xl md:text-3xl font-semibold text-text-main leading-tight">{service.title}</h1>
            
            {/* Freelancer details link */}
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-surface border border-border-custom overflow-hidden">
                {service.freelancer?.profile_photo_url ? (
                  <img src={getMediaUrl(service.freelancer.profile_photo_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted">P</div>
                )}
              </div>
              <div>
                <p className="text-xs text-text-sub">
                  Offered by{" "}
                  <Link 
                    href={`/freelancers/${service.freelancer?.id}`}
                    className="text-primary font-bold hover:underline"
                  >
                    {service.freelancer?.full_name}
                  </Link>
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">{service.freelancer?.professional_title}</p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto border-t border-border-custom/50 lg:border-t-0 pt-4 lg:pt-0 flex flex-col items-start lg:items-end gap-1.5">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Starting Rate</span>
            <span className="text-3xl font-bold text-text-main">₹{parseInt(service.starting_price || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Details and Sidebar row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Detailed Content Columns */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Media Gallery Viewer */}
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-4 md:p-6 shadow-sm">
              <div className="aspect-[16/9] w-full rounded-2xl bg-surface overflow-hidden flex items-center justify-center border border-border-custom/60">
                {activeMediaUrl ? (
                  <img src={getMediaUrl(activeMediaUrl)} alt="Showcase Preview" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-text-muted font-bold uppercase">No Active Preview</span>
                )}
              </div>

              {/* Thumbnails list */}
              <div className="flex gap-2 overflow-x-auto mt-4 pb-2">
                {mediaImages.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMediaUrl(m.media_url)}
                    className={`w-20 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition cursor-pointer ${
                      activeMediaUrl === m.media_url ? "border-primary" : "border-border-custom"
                    }`}
                  >
                    <img src={getMediaUrl(m.media_url)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                
                {mediaVideos.map((v: any) => (
                  <a
                    key={v.id}
                    href={v.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-20 h-14 rounded-lg bg-surface border-2 border-border-custom flex-shrink-0 flex flex-col items-center justify-center text-[9px] text-primary font-bold"
                  >
                    <span>📺 VIDEO</span>
                    <span className="text-[7px] text-text-muted truncate max-w-full px-1">{v.media_url}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-text-main mb-4 uppercase tracking-wider text-[11px]">Service Description</h2>
              <p className="text-text-sub text-sm leading-relaxed whitespace-pre-line font-normal">{service.description}</p>
            </div>

            {/* Package Comparison Table */}
            {service.packages && service.packages.length > 0 && (
              <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden">
                <h2 className="text-base font-semibold text-text-main mb-6 uppercase tracking-wider text-[11px]">Compare Packages</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-custom text-text-sub font-bold">
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
                    <tbody className="divide-y divide-border-custom/50">
                      
                      <tr className="text-text-main font-bold">
                        <td className="py-3 pr-4 font-semibold">Price</td>
                        <td className="py-3 px-4 text-center text-primary font-bold text-sm">
                          ₹{parseInt(service.packages.find((p: any) => p.package_type === "BASIC")?.price || 0).toLocaleString()}
                        </td>
                        {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                          <td className="py-3 px-4 text-center text-primary font-bold text-sm">
                            ₹{parseInt(service.packages.find((p: any) => p.package_type === "STANDARD")?.price || 0).toLocaleString()}
                          </td>
                        )}
                        {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                          <td className="py-3 px-4 text-center text-primary font-bold text-sm">
                            ₹{parseInt(service.packages.find((p: any) => p.package_type === "PREMIUM")?.price || 0).toLocaleString()}
                          </td>
                        )}
                      </tr>

                      {deliverableLabels.map((label, idx) => (
                        <tr key={idx} className="text-text-sub font-medium">
                          <td className="py-3 pr-4">{label}</td>
                          <td className="py-3 px-4 text-center">{getDeliverableValue("BASIC", label)}</td>
                          {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                            <td className="py-3 px-4 text-center">{getDeliverableValue("STANDARD", label)}</td>
                          )}
                          {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                            <td className="py-3 px-4 text-center">{getDeliverableValue("PREMIUM", label)}</td>
                          )}
                        </tr>
                      ))}

                      <tr className="text-text-muted font-medium">
                        <td className="py-3 pr-4">Delivery Time</td>
                        <td className="py-3 px-4 text-center">
                          {service.packages.find((p: any) => p.package_type === "BASIC")?.delivery_time_days} Days
                        </td>
                        {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                          <td className="py-3 px-4 text-center">
                            {service.packages.find((p: any) => p.package_type === "STANDARD")?.delivery_time_days} Days
                          </td>
                        )}
                        {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                          <td className="py-3 px-4 text-center">
                            {service.packages.find((p: any) => p.package_type === "PREMIUM")?.delivery_time_days} Days
                          </td>
                        )}
                      </tr>

                      <tr className="text-text-muted font-medium">
                        <td className="py-3 pr-4">Revisions</td>
                        <td className="py-3 px-4 text-center">
                          {service.packages.find((p: any) => p.package_type === "BASIC")?.revisions}
                        </td>
                        {service.packages.some((p: any) => p.package_type === "STANDARD") && (
                          <td className="py-3 px-4 text-center">
                            {service.packages.find((p: any) => p.package_type === "STANDARD")?.revisions}
                          </td>
                        )}
                        {service.packages.some((p: any) => p.package_type === "PREMIUM") && (
                          <td className="py-3 px-4 text-center">
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
              <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 shadow-sm">
                <h2 className="text-base font-semibold text-text-main mb-4 uppercase tracking-wider text-[11px]">Required From Client (Before Booking)</h2>
                <div className="space-y-3">
                  {service.requirements.map((r: any, idx: number) => (
                    <div key={r.id || idx} className="bg-surface border border-border-custom px-4 py-3 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[8px] bg-surface-elevated border border-border-custom px-2 py-0.5 rounded text-text-muted mr-3 uppercase font-bold">{r.field_type}</span>
                        <span className="text-text-main font-semibold">{r.question}</span>
                      </div>
                      {r.is_required && <span className="text-rose-600 text-[10px] font-semibold">*Required</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Checkout & Booking Widget Sidebar */}
          <div className="space-y-6">
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6">
              <div className="grid grid-cols-3 gap-1 bg-surface p-1 rounded-xl border border-border-custom text-[10px]">
                {service.packages?.map((p: any) => {
                  const type = p.package_type;
                  return (
                    <button
                      key={type}
                      onClick={() => setActivePkgType(type)}
                      className={`py-2 rounded-lg font-bold transition uppercase cursor-pointer ${
                        activePkgType === type ? "bg-primary text-text-on-dark shadow-sm" : "text-text-muted hover:text-text-sub"
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
                    <h3 className="text-sm font-semibold text-text-main truncate max-w-[150px]">{activePackage.name}</h3>
                    <span className="text-lg font-bold text-primary">
                      ₹{parseInt(activePackage.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-text-sub leading-relaxed font-normal">{activePackage.description}</p>
                  
                  <div className="flex justify-between text-[10px] text-text-muted border-t border-b border-border-custom/50 py-3 font-semibold">
                    <span>⏳ {activePackage.delivery_time_days} Days Delivery</span>
                    <span>🔄 {activePackage.revisions} Revisions</span>
                  </div>

                  <div className="space-y-2">
                    {activePackage.deliverables?.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">{d.label}</span>
                        <span className="text-text-sub font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-4">
                    <button
                      onClick={handleCheckoutClick}
                      disabled={bookingLoading}
                      className="w-full py-3 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition shadow-sm text-center cursor-pointer"
                    >
                      Continue (₹{parseInt(activePackage.price).toLocaleString()})
                    </button>
                    <button
                      onClick={handleContactClick}
                      disabled={bookingLoading}
                      className="w-full py-3 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-full transition text-center cursor-pointer"
                    >
                      Contact Freelancer
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-text-muted block text-center">Package details unavailable.</span>
              )}
            </div>

            {service.service_type !== "REMOTE" && (
              <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm text-xs space-y-4">
                <h3 className="font-semibold text-text-main text-sm">Location Logistics</h3>
                <div className="space-y-2 text-text-sub font-medium">
                  <div className="flex justify-between">
                    <span>Base City</span>
                    <span className="text-text-main font-bold">{service.city}, {service.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Travel Coverage</span>
                    <span className="text-text-main font-bold">
                      {service.travel_available ? `Willing (Radius: ${service.service_radius_km || 25} km)` : "Local Only"}
                    </span>
                  </div>
                  {service.travel_available && service.travel_fee && (
                    <div className="flex justify-between border-t border-border-custom/50 pt-2">
                      <span>Travel Surcharge</span>
                      <span className="text-primary font-bold">₹{parseInt(service.travel_fee)}/km</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-elevated border border-border-custom rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-sm relative max-h-[90vh] overflow-y-auto text-text-main">
            <button
              onClick={() => setShowCheckout(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-sub text-lg font-bold cursor-pointer"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold text-text-main border-b border-border-custom/50 pb-4 mb-6">
              Book {service.title}
            </h2>

            {bookingError && (
              <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Package Chosen
                </label>
                <div className="bg-surface border border-border-custom px-4 py-3 rounded-xl flex justify-between items-center">
                  <span className="text-sm font-semibold text-text-main uppercase">{activePkgType} Package</span>
                  <span className="text-primary font-bold">₹{parseInt(activePackage.price).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Scheduled Execution Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary text-sm transition"
                />
              </div>

              {service.requirements && service.requirements.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-custom/50 pb-2">
                    Requirements from Client
                  </h3>
                  {service.requirements.map((req: any) => (
                    <div key={req.id}>
                      <label className="block text-xs text-text-sub font-bold mb-2">
                        {req.question} {req.is_required && <span className="text-rose-600 font-bold">*</span>}
                      </label>
                      
                      {req.field_type === "TEXTAREA" ? (
                        <textarea
                          required={req.is_required}
                          value={reqAnswers[String(req.id)] || ""}
                          onChange={(e) => setReqAnswers(prev => ({ ...prev, [String(req.id)]: e.target.value }))}
                          rows={3}
                          className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary text-sm transition resize-none font-normal"
                        />
                      ) : (
                        <input
                          type={req.field_type === "NUMBER" ? "number" : req.field_type === "DATE" ? "date" : "text"}
                          required={req.is_required}
                          value={reqAnswers[String(req.id)] || ""}
                          onChange={(e) => setReqAnswers(prev => ({ ...prev, [String(req.id)]: e.target.value }))}
                          className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary text-sm transition font-normal"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Provide any location instructions or details..."
                  className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary text-sm transition resize-none font-normal"
                />
              </div>

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-text-on-dark text-sm font-bold rounded-full transition shadow-sm text-center cursor-pointer"
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
