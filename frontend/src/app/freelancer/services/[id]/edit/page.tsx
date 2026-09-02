"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import { marketplaceService, PackageCreateUpdate } from "@/services/service.service";

type TabType = "info" | "packages" | "media" | "location" | "requirements";

export default function EditServiceDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Draft/Service details state
  const [serviceStatus, setServiceStatus] = useState("DRAFT");

  // Step 1 & 2 fields
  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [serviceType, setServiceType] = useState<"ON_SITE" | "REMOTE" | "HYBRID">("REMOTE");

  // Packages state
  const [packages, setPackages] = useState({
    BASIC: { enabled: true, name: "Basic Package", description: "", price: "", delivery: "", revisions: "" },
    STANDARD: { enabled: false, name: "Standard Package", description: "", price: "", delivery: "", revisions: "" },
    PREMIUM: { enabled: false, name: "Premium Package", description: "", price: "", delivery: "", revisions: "" }
  });
  
  // Package deliverables: { package_type, label, value }
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [newDelivLabel, setNewDelivLabel] = useState("");
  const [newDelivValue, setNewDelivValue] = useState("");
  const [newDelivPkg, setNewDelivPkg] = useState<"BASIC" | "STANDARD" | "PREMIUM">("BASIC");

  // Media
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [externalVideoUrl, setExternalVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [country, setCountry] = useState("India");
  const [radius, setRadius] = useState("25");
  const [travelAvailable, setTravelAvailable] = useState(false);
  const [travelFee, setTravelFee] = useState("");

  // Requirements
  const [requirements, setRequirements] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newFieldType, setNewFieldType] = useState<"TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN" | "FILE">("TEXT");
  const [newIsRequired, setNewIsRequired] = useState(true);

  useEffect(() => {
    async function loadAllData() {
      if (!id) return;
      try {
        setLoading(true);
        // Load categories list
        const cats = await marketplaceService.getCategoriesMenu();
        setCategories(cats);

        // Fetch target service details
        const s = await marketplaceService.getMyServiceDetails(Number(id));
        if (s) {
          setServiceStatus(s.status);
          setTitle(s.title || "");
          setShortDesc(s.short_description || "");
          setFullDesc(s.description || "");
          setServiceType(s.service_type || "REMOTE");
          
          if (s.category_id) setSelectedParentId(String(s.category_id));
          if (s.subcategory_id) setSelectedChildId(String(s.subcategory_id));

          // Set packages
          const pkgConfig = {
            BASIC: { enabled: false, name: "Basic Package", description: "", price: "", delivery: "", revisions: "" },
            STANDARD: { enabled: false, name: "Standard Package", description: "", price: "", delivery: "", revisions: "" },
            PREMIUM: { enabled: false, name: "Premium Package", description: "", price: "", delivery: "", revisions: "" }
          };

          const loadedDelivs: any[] = [];

          s.packages?.forEach((p: any) => {
            const type = p.package_type as "BASIC" | "STANDARD" | "PREMIUM";
            pkgConfig[type] = {
              enabled: true,
              name: p.name || "",
              description: p.description || "",
              price: p.price ? String(Math.round(p.price)) : "",
              delivery: p.delivery_time_days ? String(p.delivery_time_days) : "",
              revisions: p.revisions ? String(p.revisions) : ""
            };

            p.deliverables?.forEach((d: any) => {
              loadedDelivs.push({
                package_type: type,
                label: d.label,
                value: d.value
              });
            });
          });

          // Always ensure basic is active
          pkgConfig.BASIC.enabled = true;
          
          setPackages(pkgConfig);
          setDeliverables(loadedDelivs);
          setMediaList(s.media || []);
          setRequirements(s.requirements || []);

          setCity(s.city || "");
          setStateName(s.state || "");
          setCountry(s.country || "India");
          setRadius(s.service_radius_km ? String(s.service_radius_km) : "25");
          setTravelAvailable(s.travel_available ?? false);
          setTravelFee(s.travel_fee ? String(Math.round(s.travel_fee)) : "");
        }
      } catch (err: any) {
        setErrorMsg("Failed to retrieve service listing details.");
      } finally {
        setLoading(false);
      }
    }
    if (user && id) {
      loadAllData();
    }
  }, [user, id]);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      if (title.length < 10) throw new Error("Title must be at least 10 characters.");
      if (!shortDesc.trim()) throw new Error("Short description is required.");
      if (fullDesc.length < 10) throw new Error("Description must be at least 10 characters.");
      if (!selectedChildId) throw new Error("Category and subcategory selection are required.");

      const payload = {
        title,
        short_description: shortDesc,
        description: fullDesc,
        category_id: Number(selectedParentId),
        subcategory_id: Number(selectedChildId),
        service_type: serviceType
      };

      await marketplaceService.updateService(Number(id), payload);
      setSuccessMsg("Service information updated successfully.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update service info.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePackages = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Validate and submit each active package
      for (const [type, pkg] of Object.entries(packages)) {
        if (pkg.enabled) {
          if (!pkg.name.trim() || !pkg.description.trim() || !pkg.price || !pkg.delivery || !pkg.revisions) {
            throw new Error(`Please complete all fields for the enabled ${type} package.`);
          }

          const pkgPayload: PackageCreateUpdate = {
            package_type: type as any,
            name: pkg.name,
            description: pkg.description,
            price: parseFloat(pkg.price),
            delivery_time_days: parseInt(pkg.delivery),
            revisions: parseInt(pkg.revisions),
            deliverables: deliverables.filter(d => d.package_type === type).map(d => ({ label: d.label, value: d.value }))
          };

          const details = await marketplaceService.getMyServiceDetails(Number(id));
          const existingPkg = details.packages?.find((p: any) => p.package_type === type);

          if (existingPkg) {
            await marketplaceService.updatePackage(Number(id), existingPkg.id, pkgPayload);
          } else {
            await marketplaceService.addPackage(Number(id), pkgPayload);
          }
        } else {
          // If disabled, delete from backend if it existed
          const details = await marketplaceService.getMyServiceDetails(Number(id));
          const existingPkg = details.packages?.find((p: any) => p.package_type === type);
          if (existingPkg) {
            await marketplaceService.deletePackage(Number(id), existingPkg.id);
          }
        }
      }

      setSuccessMsg("Packages and deliverables updated successfully.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update packages.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = serviceType === "REMOTE" ? {
        city: null, state: null, country: null, service_radius_km: null, travel_available: false, travel_fee: null
      } : {
        city,
        state: stateName,
        country,
        service_radius_km: Number(radius),
        travel_available: travelAvailable,
        travel_fee: travelFee ? parseFloat(travelFee) : null
      };

      await marketplaceService.updateService(Number(id), payload);
      setSuccessMsg("Service location coordinates updated.");
    } catch (err: any) {
      setErrorMsg("Failed to update location specifics.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      const res = await freelancerService.uploadFile(file, "portfolios");
      const mediaPayload = {
        media_type: "IMAGE" as const,
        media_url: res.file_url,
        is_cover: mediaList.length === 0
      };
      const savedMedia = await marketplaceService.addMedia(Number(id), mediaPayload);
      setMediaList((prev) => [...prev, savedMedia]);
      setSuccessMsg("Showcase photo added.");
    } catch (err: any) {
      setErrorMsg("Image size should be under 5MB.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddVideo = async () => {
    if (!externalVideoUrl.trim() || !id) return;
    try {
      setSaving(true);
      setErrorMsg(null);
      const savedMedia = await marketplaceService.addMedia(Number(id), {
        media_type: "EXTERNAL_VIDEO",
        media_url: externalVideoUrl.trim()
      });
      setMediaList((prev) => [...prev, savedMedia]);
      setExternalVideoUrl("");
    } catch (err: any) {
      setErrorMsg("Failed to add video URL.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    try {
      setSaving(true);
      await marketplaceService.deleteMedia(Number(id), mediaId);
      setMediaList(prev => prev.filter(m => m.id !== mediaId));
    } catch (err: any) {
      setErrorMsg("Failed to delete media.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetCover = async (mediaId: number) => {
    try {
      setSaving(true);
      await marketplaceService.setCoverMedia(Number(id), mediaId);
      setMediaList(prev => prev.map(m => ({ ...m, is_cover: m.id === mediaId })));
    } catch (err: any) {
      setErrorMsg("Failed to set cover image.");
    } finally {
      setSaving(false);
    }
  };

  // Requirements Questions
  const handleAddRequirement = async () => {
    if (!newQuestion.trim() || !id) return;
    try {
      setSaving(true);
      setErrorMsg(null);
      const savedReq = await marketplaceService.addRequirement(Number(id), {
        question: newQuestion,
        field_type: newFieldType,
        is_required: newIsRequired,
        sort_order: requirements.length
      });
      setRequirements(prev => [...prev, savedReq]);
      setNewQuestion("");
    } catch (err: any) {
      setErrorMsg("Failed to add question.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequirement = async (reqId: number) => {
    try {
      setSaving(true);
      await marketplaceService.deleteRequirement(Number(id), reqId);
      setRequirements(prev => prev.filter(r => r.id !== reqId));
    } catch (err: any) {
      setErrorMsg("Failed to delete question.");
    } finally {
      setSaving(false);
    }
  };

  // Local Deliverables
  const handleAddDeliverable = () => {
    if (!newDelivLabel.trim() || !newDelivValue.trim()) return;
    setDeliverables(prev => [...prev, { package_type: newDelivPkg, label: newDelivLabel, value: newDelivValue }]);
    setNewDelivLabel("");
    setNewDelivValue("");
  };

  const handleDeleteDeliverable = (index: number) => {
    setDeliverables(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleTogglePublish = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      if (serviceStatus === "PUBLISHED") {
        await marketplaceService.pauseService(Number(id));
        setServiceStatus("PAUSED");
        setSuccessMsg("Listing paused. It is now hidden from the marketplace.");
      } else {
        await marketplaceService.publishService(Number(id));
        setServiceStatus("PUBLISHED");
        setSuccessMsg("Congratulations! Your service listing is now live in the marketplace.");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Publication check failed. Ensure title, category, cover photo, price and description exist.");
    } finally {
      setSaving(false);
    }
  };

  const selectedParentCategory = categories.find(c => String(c.id) === selectedParentId);

  if (loading) {
    return (
      <div className="min-h-full bg-transparent flex flex-col justify-center items-center text-text-main py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent text-text-main py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Dashboard Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">Edit Service Listing</h1>
            <p className="text-text-sub text-xs mt-1">Configure packages, descriptions, requirements and media.</p>
          </div>

          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              onClick={handleTogglePublish}
              disabled={saving}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                serviceStatus === "PUBLISHED" 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-primary hover:bg-primary-hover border-primary text-text-main"
              }`}
            >
              {serviceStatus === "PUBLISHED" ? "Active / Published (Pause)" : "Publish Service"}
            </button>
            <button
              onClick={() => router.push("/freelancer/services")}
              className="px-4 py-2 bg-surface-elevated hover:bg-surface-elevated text-text-main text-xs font-bold rounded-xl transition border border-border-custom"
            >
              Back to List
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-4 text-xs font-semibold">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Sidebar + Main form tab layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0">
            <button
              onClick={() => { setActiveTab("info"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "info" ? "bg-surface border border-border-custom text-text-main" : "text-text-sub hover:text-text-main"
              }`}
            >
              Basic & Category
            </button>
            <button
              onClick={() => { setActiveTab("packages"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "packages" ? "bg-surface border border-border-custom text-text-main" : "text-text-sub hover:text-text-main"
              }`}
            >
              Packages & Deliverables
            </button>
            <button
              onClick={() => { setActiveTab("media"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "media" ? "bg-surface border border-border-custom text-text-main" : "text-text-sub hover:text-text-main"
              }`}
            >
              Showcase Media ({mediaList.length})
            </button>
            <button
              onClick={() => { setActiveTab("location"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "location" ? "bg-surface border border-border-custom text-text-main" : "text-text-sub hover:text-text-main"
              }`}
            >
              Location Coordinates
            </button>
            <button
              onClick={() => { setActiveTab("requirements"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "requirements" ? "bg-surface border border-border-custom text-text-main" : "text-text-sub hover:text-text-main"
              }`}
            >
              Client Requirements ({requirements.length})
            </button>
          </div>

          {/* Form Panel */}
          <div className="md:col-span-3 bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl">
            
            {/* INFO TAB */}
            {activeTab === "info" && (
              <form onSubmit={handleUpdateInfo} className="space-y-6">
                <h2 className="text-lg font-bold text-text-main mb-2">Edit Basic Details</h2>
                
                <div>
                  <label className="block text-xs text-text-sub font-semibold mb-2">Service Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-sub font-semibold mb-2">Parent Category</label>
                    <select 
                      value={selectedParentId}
                      onChange={(e) => {
                        setSelectedParentId(e.target.value);
                        setSelectedChildId("");
                      }}
                      className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-sub font-semibold mb-2">Subcategory</label>
                    <select 
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      disabled={!selectedParentId}
                      className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none disabled:opacity-40"
                    >
                      <option value="">Select Subcategory</option>
                      {selectedParentCategory?.subcategories?.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-sub font-semibold mb-2">Service Type</label>
                    <select 
                      value={serviceType} 
                      onChange={(e: any) => setServiceType(e.target.value)}
                      className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none"
                    >
                      <option value="REMOTE">Remote Delivery</option>
                      <option value="ON_SITE">On-Site Delivery</option>
                      <option value="HYBRID">Hybrid Delivery</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[10px] text-text-muted">
                      ON_SITE/HYBRID options will enable location coordinates config tab.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-sub font-semibold mb-2">Short Summary Description</label>
                  <input 
                    type="text" 
                    value={shortDesc} 
                    onChange={(e) => setShortDesc(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-sub font-semibold mb-2">Full Description</label>
                  <textarea 
                    value={fullDesc} 
                    onChange={(e) => setFullDesc(e.target.value)}
                    rows={6}
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition"
                >
                  {saving ? "Saving..." : "Save Basic Info"}
                </button>
              </form>
            )}

            {/* PACKAGES TAB */}
            {activeTab === "packages" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-text-main mb-2">Configure Packages & Deliverables</h2>

                {/* Packages selector tabs */}
                <div className="grid grid-cols-3 gap-2 bg-background p-1.5 rounded-xl border border-border-custom">
                  {(["BASIC", "STANDARD", "PREMIUM"] as const).map((type) => {
                    const isEnabled = packages[type].enabled;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (type === "BASIC") return;
                          setPackages(prev => ({
                            ...prev,
                            [type]: { ...prev[type], enabled: !prev[type].enabled }
                          }));
                        }}
                        className={`py-2 rounded-lg text-xs font-extrabold transition ${
                          isEnabled ? "bg-primary text-text-main" : "text-text-sub hover:text-text-main"
                        }`}
                      >
                        {type} {type !== "BASIC" && (isEnabled ? "(On)" : "(Off)")}
                      </button>
                    );
                  })}
                </div>

                {/* Packages Editor */}
                <div className="space-y-6">
                  {(["BASIC", "STANDARD", "PREMIUM"] as const).map((type) => {
                    const pkg = packages[type];
                    if (!pkg.enabled) return null;
                    return (
                      <div key={type} className="border border-border-custom rounded-2xl p-4 bg-background space-y-4">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{type} Package Config</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Package Name</label>
                            <input 
                              type="text" 
                              value={pkg.name} 
                              onChange={(e) => setPackages(prev => ({
                                ...prev,
                                [type]: { ...prev[type], name: e.target.value }
                              }))}
                              className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Price (₹)</label>
                            <input 
                              type="number" 
                              value={pkg.price} 
                              onChange={(e) => setPackages(prev => ({
                                ...prev,
                                [type]: { ...prev[type], price: e.target.value }
                              }))}
                              className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Delivery Time (Days)</label>
                            <input 
                              type="number" 
                              value={pkg.delivery} 
                              onChange={(e) => setPackages(prev => ({
                                ...prev,
                                [type]: { ...prev[type], delivery: e.target.value }
                              }))}
                              className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Revisions Allowed</label>
                            <input 
                              type="number" 
                              value={pkg.revisions} 
                              onChange={(e) => setPackages(prev => ({
                                ...prev,
                                [type]: { ...prev[type], revisions: e.target.value }
                              }))}
                              className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Scope Description</label>
                          <textarea 
                            value={pkg.description} 
                            onChange={(e) => setPackages(prev => ({
                              ...prev,
                              [type]: { ...prev[type], description: e.target.value }
                            }))}
                            rows={2}
                            className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main resize-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Deliverables selector */}
                <div className="bg-background border border-border-custom p-4 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-text-main mb-2">Add deliverable row</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <select 
                        value={newDelivPkg} 
                        onChange={(e: any) => setNewDelivPkg(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-main"
                      >
                        {Object.entries(packages).filter(([_, pkg]) => pkg.enabled).map(([type]) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={newDelivLabel} 
                        onChange={(e) => setNewDelivLabel(e.target.value)} 
                        placeholder="Label (e.g. Duration)"
                        className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={newDelivValue} 
                        onChange={(e) => setNewDelivValue(e.target.value)} 
                        placeholder="Value (e.g. 5 Mins)"
                        className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                      />
                    </div>
                  </div>
                  <button onClick={handleAddDeliverable} className="px-3 py-1.5 bg-primary text-xs font-bold text-text-main rounded-lg">
                    Add Row
                  </button>
                </div>

                {/* Deliverables List */}
                <div className="space-y-4">
                  {Object.entries(packages).filter(([_, pkg]) => pkg.enabled).map(([type]) => {
                    const pkgDelivs = deliverables.filter(d => d.package_type === type);
                    return (
                      <div key={type} className="bg-background p-4 rounded-xl border border-border-custom">
                        <h4 className="text-xs font-bold text-text-main mb-2">{type} deliverables</h4>
                        <div className="space-y-2">
                          {pkgDelivs.map((d, index) => {
                            const globalIdx = deliverables.findIndex(item => item === d);
                            return (
                              <div key={index} className="flex justify-between items-center bg-surface px-3 py-2 rounded-lg text-xs">
                                <span>{d.label}: <strong className="text-primary">{d.value}</strong></span>
                                <button onClick={() => handleDeleteDeliverable(globalIdx)} className="text-rose-500 text-xs hover:underline">Remove</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={handleUpdatePackages} disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition">
                  {saving ? "Saving..." : "Save Packages & Deliverables"}
                </button>
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === "media" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-text-main mb-2">Showcase Media Gallery</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-sub font-semibold mb-2">Upload Image File</label>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-border-custom hover:border-primary rounded-xl flex flex-col justify-center items-center gap-1 cursor-pointer bg-background transition"
                    >
                      <span className="text-xl">📸</span>
                      <span className="text-xs text-text-sub">Choose Image File (Max 5MB)</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>

                  <div>
                    <label className="block text-xs text-text-sub font-semibold mb-2">Add Video Link</label>
                    <div className="bg-background border border-border-custom p-4 rounded-xl space-y-2">
                      <input 
                        type="text" 
                        value={externalVideoUrl} 
                        onChange={(e) => setExternalVideoUrl(e.target.value)} 
                        placeholder="YouTube/Vimeo video link"
                        className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                      />
                      <button onClick={handleAddVideo} className="px-4 py-1.5 bg-primary text-xs font-bold text-text-main rounded-lg w-full">Add Video</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                  {mediaList.map((m) => (
                    <div key={m.id} className="bg-background border border-border-custom rounded-xl overflow-hidden">
                      <div className="aspect-video relative bg-surface flex items-center justify-center">
                        {m.media_type === "IMAGE" ? (
                          <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-primary font-bold">{m.media_type}</span>
                        )}
                        {m.is_cover && (
                          <span className="absolute top-1 right-1 bg-primary text-text-main text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                            COVER
                          </span>
                        )}
                      </div>
                      <div className="p-2 flex justify-between items-center text-[10px]">
                        <button onClick={() => handleSetCover(m.id)} disabled={m.is_cover} className={m.is_cover ? "text-primary" : "text-text-muted"}>Make Cover</button>
                        <button onClick={() => handleDeleteMedia(m.id)} className="text-rose-500">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOCATION TAB */}
            {activeTab === "location" && (
              <form onSubmit={handleUpdateLocation} className="space-y-6">
                <h2 className="text-lg font-bold text-text-main mb-2">Configure Location Coverage</h2>
                
                {serviceType === "REMOTE" ? (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-6 rounded-2xl text-xs text-emerald-400">
                    <strong>REMOTE Service Rule:</strong> Location details are disabled because you have selected remote delivery. Your service is active to clients everywhere.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">City</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">State</label>
                        <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Country</label>
                        <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Service Radius (km)</label>
                        <input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main" />
                      </div>
                      <div className="flex items-center h-14">
                        <input type="checkbox" id="travelAvail" checked={travelAvailable} onChange={(e) => setTravelAvailable(e.target.checked)} className="accent-primary mr-2" />
                        <label htmlFor="travelAvail" className="text-xs text-text-sub">Willing to travel to client</label>
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Additional Travel Fee (₹/km)</label>
                        <input type="number" value={travelFee} onChange={(e) => setTravelFee(e.target.value)} className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main" />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={saving || serviceType === "REMOTE"} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition disabled:opacity-40">
                  {saving ? "Saving..." : "Save Location Specs"}
                </button>
              </form>
            )}

            {/* REQUIREMENTS TAB */}
            {activeTab === "requirements" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-text-main mb-2">Configure Client Questions</h2>
                
                <div className="bg-background border border-border-custom p-4 rounded-xl space-y-4">
                  <div>
                    <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Question Text</label>
                    <input type="text" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="e.g. Please provide footage google drive link" className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <select value={newFieldType} onChange={(e: any) => setNewFieldType(e.target.value)} className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main">
                        <option value="TEXT">Short Text</option>
                        <option value="TEXTAREA">Paragraph Description</option>
                        <option value="NUMBER">Number Field</option>
                        <option value="DATE">Calendar Date</option>
                        <option value="BOOLEAN">Checkbox Toggle</option>
                        <option value="FILE">Attachment Upload</option>
                      </select>
                    </div>
                    <div className="flex items-center h-10">
                      <input type="checkbox" id="isRequired" checked={newIsRequired} onChange={(e) => setNewIsRequired(e.target.checked)} className="accent-primary mr-2" />
                      <label htmlFor="isRequired" className="text-xs text-text-sub">Required</label>
                    </div>
                  </div>
                  <button onClick={handleAddRequirement} className="px-4 py-1.5 bg-primary text-xs font-bold text-text-main rounded-lg">Add Question</button>
                </div>

                <div className="space-y-2 mt-6">
                  {requirements.map((r, idx) => (
                    <div key={r.id || idx} className="flex justify-between items-center bg-background border border-border-custom px-4 py-3 rounded-xl text-xs">
                      <div>
                        <span className="text-[9px] bg-surface-elevated border border-border-custom px-2 py-0.5 rounded text-text-sub uppercase mr-2">{r.field_type}</span>
                        <span className="text-text-main font-bold">{r.question}</span>
                        {r.is_required && <span className="text-rose-400 text-[10px] ml-1">*Required</span>}
                      </div>
                      <button onClick={() => handleDeleteRequirement(r.id)} className="text-rose-500 hover:underline">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
