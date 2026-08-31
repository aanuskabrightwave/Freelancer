"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import { marketplaceService, PackageCreateUpdate } from "@/services/service.service";

const STEPS = [
  "Basic Details",
  "Category & Type",
  "Packages",
  "Deliverables",
  "Media",
  "Location",
  "Requirements",
  "Review & Publish"
];

export default function CreateServiceWizard() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Created draft state
  const [serviceId, setServiceId] = useState<number | null>(null);

  // Step 1: Basic
  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");

  // Step 2: Category & Type
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [serviceType, setServiceType] = useState<"ON_SITE" | "REMOTE" | "HYBRID">("REMOTE");

  // Step 3: Packages
  const [packages, setPackages] = useState({
    BASIC: { enabled: true, name: "Basic Package", description: "", price: "", delivery: "", revisions: "" },
    STANDARD: { enabled: false, name: "Standard Package", description: "", price: "", delivery: "", revisions: "" },
    PREMIUM: { enabled: false, name: "Premium Package", description: "", price: "", delivery: "", revisions: "" }
  });

  // Step 4: Package Deliverables
  // List of deliverables: { package_type: "BASIC" | "STANDARD" | "PREMIUM", label: string, value: string }
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [newDelivLabel, setNewDelivLabel] = useState("");
  const [newDelivValue, setNewDelivValue] = useState("");
  const [newDelivPkg, setNewDelivPkg] = useState<"BASIC" | "STANDARD" | "PREMIUM">("BASIC");

  // Step 5: Media
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [externalVideoUrl, setExternalVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 6: Location
  const [useProfileLocation, setUseProfileLocation] = useState(true);
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [country, setCountry] = useState("India");
  const [radius, setRadius] = useState("25");
  const [travelAvailable, setTravelAvailable] = useState(false);
  const [travelFee, setTravelFee] = useState("");

  // Step 7: Requirements
  const [requirements, setRequirements] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newFieldType, setNewFieldType] = useState<"TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN" | "FILE">("TEXT");
  const [newIsRequired, setNewIsRequired] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await marketplaceService.getCategoriesMenu();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load category menu", err);
      }
    }
    loadCategories();
  }, []);

  // Autofill Profile Location if enabled
  useEffect(() => {
    async function loadProfileLocation() {
      if (useProfileLocation && serviceType !== "REMOTE") {
        try {
          const profile = await freelancerService.getProfile();
          if (profile) {
            setCity(profile.city || "");
            setStateName(profile.state || "");
            setCountry(profile.country || "India");
            setRadius(String(profile.service_radius_km || 25));
            setTravelAvailable(profile.willing_to_travel || false);
          }
        } catch (err) {
          console.error("Failed to load profile location", err);
        }
      }
    }
    loadProfileLocation();
  }, [useProfileLocation, serviceType]);

  const handleNext = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setLoading(true);

      if (step === 1) {
        // Step 1 validation
        if (title.length < 10) throw new Error("Title must be at least 10 characters.");
        if (!shortDesc.trim()) throw new Error("Short description is required.");
        if (fullDesc.length < 10) throw new Error("Full description must be at least 10 characters.");

        const payload = {
          title,
          short_description: shortDesc,
          description: fullDesc,
          service_type: serviceType,
        };

        if (serviceId) {
          await marketplaceService.updateService(serviceId, payload);
        } else {
          const draft = await marketplaceService.createServiceDraft(payload);
          setServiceId(draft.id);
        }
      }

      else if (step === 2) {
        if (!serviceId) throw new Error("Service draft has not been initiated.");
        if (!selectedChildId) throw new Error("Category and subcategory selections are required.");

        await marketplaceService.updateService(serviceId, {
          category_id: Number(selectedParentId),
          subcategory_id: Number(selectedChildId),
          service_type: serviceType,
        });
      }

      else if (step === 3) {
        if (!serviceId) throw new Error("Service draft has not been initiated.");
        
        // Enforce at least 1 package enabled
        const enabledPkgs = Object.entries(packages).filter(([_, pkg]) => pkg.enabled);
        if (enabledPkgs.length === 0) {
          throw new Error("You must enable at least one pricing package (Basic, Standard, or Premium).");
        }

        // Save enabled packages to backend
        // First delete any previous packages to sync fresh (simplified replacement)
        // Wait, to keep updates simple, we update/create packages
        // Let's call the API to update or save them
        for (const [type, pkg] of Object.entries(packages)) {
          if (pkg.enabled) {
            if (!pkg.name.trim() || !pkg.description.trim() || !pkg.price || !pkg.delivery || !pkg.revisions) {
              throw new Error(`Please fill out all fields for the enabled ${type} package.`);
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

            // Let's see if the package is already saved on this draft
            // (We can load current service detail and check if package type exists, or backend service handles conflicts. 
            // In service_service, adding duplicate blocks it, so we can check if it exists, if yes we delete or patch it)
            const details = await marketplaceService.getMyServiceDetails(serviceId);
            const existingPkg = details.packages?.find((p: any) => p.package_type === type);

            if (existingPkg) {
              await marketplaceService.updatePackage(serviceId, existingPkg.id, pkgPayload);
            } else {
              await marketplaceService.addPackage(serviceId, pkgPayload);
            }
          } else {
            // Delete if previously enabled but now disabled
            const details = await marketplaceService.getMyServiceDetails(serviceId);
            const existingPkg = details.packages?.find((p: any) => p.package_type === type);
            if (existingPkg) {
              await marketplaceService.deletePackage(serviceId, existingPkg.id);
            }
          }
        }
      }

      else if (step === 4) {
        // Step 4: Deliverables are already synced inside packages during Step 3!
        // We can just proceed, or update packages with latest deliverables list
        if (!serviceId) throw new Error("Service draft missing.");
        
        // Re-update packages to attach deliverables
        const details = await marketplaceService.getMyServiceDetails(serviceId);
        for (const pkg of details.packages || []) {
          const type = pkg.package_type;
          const pkgPayload: PackageCreateUpdate = {
            package_type: type,
            name: pkg.name,
            description: pkg.description,
            price: Number(pkg.price),
            delivery_time_days: pkg.delivery_time_days,
            revisions: pkg.revisions,
            deliverables: deliverables.filter(d => d.package_type === type).map(d => ({ label: d.label, value: d.value }))
          };
          await marketplaceService.updatePackage(serviceId, pkg.id, pkgPayload);
        }
      }

      else if (step === 5) {
        if (!serviceId) throw new Error("Service draft missing.");
        if (mediaList.length === 0) {
          throw new Error("You must upload at least one image showcase for this service.");
        }
        if (!mediaList.some(m => m.is_cover)) {
          throw new Error("Please select one cover image for your service.");
        }
      }

      else if (step === 6) {
        if (!serviceId) throw new Error("Service draft missing.");
        
        if (serviceType !== "REMOTE") {
          if (!city.trim() || !stateName.trim() || !country.trim()) {
            throw new Error("Location city, state and country are required for On-Site/Hybrid services.");
          }

          await marketplaceService.updateService(serviceId, {
            city,
            state: stateName,
            country,
            service_radius_km: Number(radius),
            travel_available: travelAvailable,
            travel_fee: travelFee ? parseFloat(travelFee) : undefined
          });
        }
      }

      else if (step === 7) {
        // Step 7: Requirements questions are saved incrementally!
        // We can just proceed.
      }

      setStep(step + 1);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to proceed to the next step. Ensure correct values are input.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !serviceId) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      
      // Call standard profile/portfolios uploader (returns direct public url)
      const res = await freelancerService.uploadFile(file, "portfolios");
      
      // Save this media path as service media item
      const mediaPayload = {
        media_type: "IMAGE" as const,
        media_url: res.file_url,
        is_cover: mediaList.length === 0 // Make the first one cover automatically
      };
      const savedMedia = await marketplaceService.addMedia(serviceId, mediaPayload);
      setMediaList((prev) => [...prev, savedMedia]);
      setSuccessMsg("Showcase image uploaded successfully.");
    } catch (err: any) {
      setErrorMsg("Failed to upload image. Ensure size is under 5MB.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExternalVideo = async () => {
    if (!externalVideoUrl.trim() || !serviceId) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const mediaPayload = {
        media_type: "EXTERNAL_VIDEO" as const,
        media_url: externalVideoUrl.trim(),
        is_cover: false
      };

      const savedMedia = await marketplaceService.addMedia(serviceId, mediaPayload);
      setMediaList((prev) => [...prev, savedMedia]);
      setExternalVideoUrl("");
      setSuccessMsg("Video URL added successfully.");
    } catch (err: any) {
      setErrorMsg("Failed to add video link.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    if (!serviceId) return;
    try {
      setLoading(true);
      await marketplaceService.deleteMedia(serviceId, mediaId);
      setMediaList((prev) => prev.filter(m => m.id !== mediaId));
      
      // Sync list
      const details = await marketplaceService.getMyServiceDetails(serviceId);
      setMediaList(details.media || []);
    } catch (err: any) {
      setErrorMsg("Failed to delete media.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetCover = async (mediaId: number) => {
    if (!serviceId) return;
    try {
      setLoading(true);
      await marketplaceService.setCoverMedia(serviceId, mediaId);
      
      // Refresh local mediaList covers
      setMediaList((prev) => prev.map(m => ({ ...m, is_cover: m.id === mediaId })));
    } catch (err: any) {
      setErrorMsg("Failed to set cover image.");
    } finally {
      setLoading(false);
    }
  };

  // Requirements add
  const handleAddRequirement = async () => {
    if (!newQuestion.trim() || !serviceId) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const payload = {
        question: newQuestion,
        field_type: newFieldType,
        is_required: newIsRequired,
        sort_order: requirements.length
      };

      const savedReq = await marketplaceService.addRequirement(serviceId, payload);
      setRequirements((prev) => [...prev, savedReq]);
      setNewQuestion("");
      setSuccessMsg("Requirement question added.");
    } catch (err: any) {
      setErrorMsg("Failed to add requirement question.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequirement = async (reqId: number) => {
    if (!serviceId) return;
    try {
      setLoading(true);
      await marketplaceService.deleteRequirement(serviceId, reqId);
      setRequirements((prev) => prev.filter(r => r.id !== reqId));
    } catch (err: any) {
      setErrorMsg("Failed to delete requirement.");
    } finally {
      setLoading(false);
    }
  };

  // Deliverables local updates
  const handleAddDeliverable = () => {
    if (!newDelivLabel.trim() || !newDelivValue.trim()) return;
    const newDeliv = {
      package_type: newDelivPkg,
      label: newDelivLabel.trim(),
      value: newDelivValue.trim()
    };
    setDeliverables((prev) => [...prev, newDeliv]);
    setNewDelivLabel("");
    setNewDelivValue("");
  };

  const handleDeleteDeliverable = (index: number) => {
    setDeliverables((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Final Publish
  const handleFinalPublish = async () => {
    if (!serviceId) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      await marketplaceService.publishService(serviceId);
      router.push("/freelancer/services");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to publish service. Verify all requirements are completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraftAndExit = () => {
    router.push("/freelancer/services");
  };

  const selectedParentCategory = categories.find(c => String(c.id) === selectedParentId);

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Wizard Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] bg-primary-hover border border-primary/30 text-primary font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              Step {step} of 8: {STEPS[step - 1]}
            </span>
            {serviceId && (
              <button 
                onClick={handleSaveDraftAndExit}
                className="text-xs text-text-sub hover:text-text-main transition"
              >
                Save Draft & Exit
              </button>
            )}
          </div>
          
          <div className="w-full bg-surface h-2 rounded-full overflow-hidden flex gap-1">
            {STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`flex-grow h-full transition ${idx + 1 <= step ? "bg-primary-hover" : "bg-surface-elevated"}`}
              ></div>
            ))}
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

        {/* STEP CONTENT BLOCKS */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xl">
          
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Service Basic Information</h2>
              <div>
                <label className="block text-xs text-text-sub font-semibold mb-2">Service Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Professional Wedding Photography in Mumbai"
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-text-muted mt-1 block">Title must be between 10 and 150 characters.</span>
              </div>

              <div>
                <label className="block text-xs text-text-sub font-semibold mb-2">Short Summary Description</label>
                <textarea 
                  value={shortDesc} 
                  onChange={(e) => setShortDesc(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Briefly describe the highlights of what you deliver..."
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary resize-none"
                />
                <span className="text-[10px] text-text-muted mt-1 block">Maximum 300 characters.</span>
              </div>

              <div>
                <label className="block text-xs text-text-sub font-semibold mb-2">Full Detailed Description</label>
                <textarea 
                  value={fullDesc} 
                  onChange={(e) => setFullDesc(e.target.value)}
                  rows={6}
                  placeholder="Provide in-depth details of your coverage, gear, deliverables and terms..."
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary resize-none"
                />
                <span className="text-[10px] text-text-muted mt-1 block">Describe the workflow and post-processing specifics. Max 5,000 characters.</span>
              </div>
            </div>
          )}

          {/* STEP 2: Category & Service Type */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Select Category & Service Type</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

              <div>
                <label className="block text-xs text-text-sub font-semibold mb-2">Service Type</label>
                <div className="grid grid-cols-3 gap-4">
                  {(["REMOTE", "ON_SITE", "HYBRID"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setServiceType(t)}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold transition ${
                        serviceType === t 
                          ? "bg-primary border-primary text-text-main" 
                          : "bg-background border-border-custom text-text-sub hover:text-text-main"
                      }`}
                    >
                      {t === "ON_SITE" ? "On-Site" : t === "REMOTE" ? "Remote" : "Hybrid"}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted mt-2">
                  {serviceType === "REMOTE" && "Work is completely done online. No location checks required."}
                  {serviceType === "ON_SITE" && "Requires client location details. You will travel to the site."}
                  {serviceType === "HYBRID" && "Combines both physical on-site shoots and remote editing tasks."}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Packages Editor */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Configure Packages</h2>

              {/* Package Tabs */}
              <div className="grid grid-cols-3 gap-2 bg-background p-1.5 rounded-xl border border-border-custom">
                {(["BASIC", "STANDARD", "PREMIUM"] as const).map((type) => {
                  const isEnabled = packages[type].enabled;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        // BASIC cannot be disabled
                        if (type === "BASIC") return;
                        setPackages(prev => ({
                          ...prev,
                          [type]: { ...prev[type], enabled: !prev[type].enabled }
                        }));
                      }}
                      className={`py-2 rounded-lg text-xs font-extrabold transition ${
                        isEnabled 
                          ? "bg-primary text-text-main" 
                          : "text-text-sub hover:text-text-main"
                      }`}
                    >
                      {type} {type !== "BASIC" && (isEnabled ? "(On)" : "(Off)")}
                    </button>
                  );
                })}
              </div>

              {/* Package fields editor */}
              <div className="space-y-6">
                {(["BASIC", "STANDARD", "PREMIUM"] as const).map((type) => {
                  const pkg = packages[type];
                  if (!pkg.enabled) return null;
                  return (
                    <div key={type} className="border border-border-custom rounded-2xl p-4 bg-background space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{type} Package Config</h4>
                      
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
                            placeholder="e.g. Basic Coverage, Gold Video Edit"
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
                            placeholder="e.g. 5000"
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
                            placeholder="e.g. 3"
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
                            placeholder="e.g. 3"
                            className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Description of Scope</label>
                        <textarea 
                          value={pkg.description}
                          onChange={(e) => setPackages(prev => ({
                            ...prev,
                            [type]: { ...prev[type], description: e.target.value }
                          }))}
                          rows={2}
                          placeholder="What is included in this package..."
                          className="w-full bg-surface border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-main resize-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Package Deliverables */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Structured Deliverables Comparison</h2>
              <p className="text-xs text-text-sub">Map specific rows (e.g. Coverage Hours, Edited Photos) to comparison cards.</p>

              {/* Add deliverable row */}
              <div className="bg-background border border-border-custom p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Target Package</label>
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
                    <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Deliverable Label</label>
                    <input 
                      type="text" 
                      value={newDelivLabel} 
                      onChange={(e) => setNewDelivLabel(e.target.value)} 
                      placeholder="e.g. Coverage Hours"
                      className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Deliverable Value</label>
                    <input 
                      type="text" 
                      value={newDelivValue} 
                      onChange={(e) => setNewDelivValue(e.target.value)} 
                      placeholder="e.g. 4 Hours"
                      className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleAddDeliverable}
                  className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-xs font-bold text-text-main rounded-lg"
                >
                  Add Row
                </button>
              </div>

              {/* Deliverables List */}
              <div className="space-y-4">
                {Object.entries(packages).filter(([_, pkg]) => pkg.enabled).map(([type]) => {
                  const pkgDelivs = deliverables.filter(d => d.package_type === type);
                  return (
                    <div key={type} className="bg-background p-4 rounded-xl border border-border-custom">
                      <h4 className="text-xs font-bold text-text-main mb-2">{type} Package Deliverables</h4>
                      <div className="space-y-2">
                        {pkgDelivs.map((d, index) => {
                          const globalIdx = deliverables.findIndex(item => item === d);
                          return (
                            <div key={index} className="flex justify-between items-center bg-surface px-3 py-2 rounded-lg text-xs">
                              <span>{d.label}: <strong className="text-primary">{d.value}</strong></span>
                              <button 
                                onClick={() => handleDeleteDeliverable(globalIdx)}
                                className="text-rose-500 hover:text-rose-400"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                        {pkgDelivs.length === 0 && <span className="text-[10px] text-text-muted block">No specific deliverables added yet.</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Media Showcase */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Showcase Showcase Gallery</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-text-sub font-semibold mb-2">Upload Showcase Image</label>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border-custom hover:border-primary rounded-2xl flex flex-col justify-center items-center gap-2 cursor-pointer bg-background transition"
                  >
                    <span className="text-2xl">📸</span>
                    <span className="text-xs text-text-sub">Choose Image File (Max 5MB)</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-sub font-semibold mb-2">Add Video Link</label>
                  <div className="bg-background border border-border-custom p-4 rounded-2xl space-y-3">
                    <input 
                      type="text" 
                      value={externalVideoUrl}
                      onChange={(e) => setExternalVideoUrl(e.target.value)}
                      placeholder="YouTube or Vimeo URL"
                      className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                    />
                    <button 
                      onClick={handleAddExternalVideo}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-xs font-bold text-text-main rounded-lg w-full"
                    >
                      Add Video URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded media list cards */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Service Gallery</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {mediaList.map((m) => (
                    <div key={m.id} className="bg-background border border-border-custom rounded-xl overflow-hidden flex flex-col justify-between group">
                      <div className="aspect-video relative overflow-hidden bg-surface flex items-center justify-center">
                        {m.media_type === "IMAGE" ? (
                          <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-primary font-extrabold">{m.media_type}</span>
                        )}
                        {m.is_cover && (
                          <span className="absolute top-1.5 left-1.5 bg-primary text-text-main text-[8px] font-black px-1 py-0.5 rounded">
                            COVER
                          </span>
                        )}
                      </div>
                      <div className="p-2 flex justify-between items-center text-[10px]">
                        <button 
                          onClick={() => handleSetCover(m.id)}
                          className={m.is_cover ? "text-primary font-bold" : "text-text-muted"}
                          disabled={m.is_cover}
                        >
                          Make Cover
                        </button>
                        <button 
                          onClick={() => handleDeleteMedia(m.id)}
                          className="text-rose-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {mediaList.length === 0 && <span className="text-xs text-text-muted col-span-full">No media showcase uploaded. At least 1 image cover is required.</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Location Details */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Location & Coverage Coordinates</h2>
              
              {serviceType === "REMOTE" ? (
                <div className="bg-emerald-950/20 border border-emerald-900/30 p-6 rounded-2xl text-xs text-emerald-400">
                  <strong>REMOTE Service Rule:</strong> Location details are disabled because you have selected remote delivery. Your service is active to clients everywhere.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 bg-background p-4 rounded-xl border border-border-custom">
                    <input 
                      type="checkbox" 
                      id="profileLoc" 
                      checked={useProfileLocation}
                      onChange={(e) => setUseProfileLocation(e.target.checked)}
                      className="rounded accent-indigo-500"
                    />
                    <label htmlFor="profileLoc" className="text-xs text-text-sub cursor-pointer select-none">
                      Synchronize and use my professional profile location details
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">City</label>
                      <input 
                        type="text" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        disabled={useProfileLocation}
                        className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">State</label>
                      <input 
                        type="text" 
                        value={stateName} 
                        onChange={(e) => setStateName(e.target.value)} 
                        disabled={useProfileLocation}
                        className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Country</label>
                      <input 
                        type="text" 
                        value={country} 
                        onChange={(e) => setCountry(e.target.value)} 
                        disabled={useProfileLocation}
                        className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Coverage Radius (km)</label>
                      <input 
                        type="number" 
                        value={radius} 
                        onChange={(e) => setRadius(e.target.value)} 
                        disabled={useProfileLocation}
                        className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Willing to travel?</label>
                      <div className="flex items-center h-9">
                        <input 
                          type="checkbox" 
                          id="travelAvail" 
                          checked={travelAvailable}
                          onChange={(e) => setTravelAvailable(e.target.checked)}
                          disabled={useProfileLocation}
                          className="accent-indigo-500 mr-2"
                        />
                        <label htmlFor="travelAvail" className="text-xs text-text-sub">Yes, travel to client site</label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Additional Travel Fee (₹/km)</label>
                      <input 
                        type="number" 
                        value={travelFee} 
                        onChange={(e) => setTravelFee(e.target.value)} 
                        placeholder="e.g. 20"
                        className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Client Requirements Questions */}
          {step === 7 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Configure Client Requirements</h2>
              <p className="text-xs text-text-sub">Add questions clients must answer during checkout (e.g. event date, footage link).</p>

              {/* Requirement Creator block */}
              <div className="bg-background border border-border-custom p-4 rounded-2xl space-y-4">
                <div>
                  <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Question Text</label>
                  <input 
                    type="text" 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. What is your preferred final duration?"
                    className="w-full bg-surface border border-border-custom rounded-lg px-3 py-2 text-xs text-text-main"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-text-muted font-bold uppercase mb-1">Answer Field Type</label>
                    <select 
                      value={newFieldType}
                      onChange={(e: any) => setNewFieldType(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-main"
                    >
                      <option value="TEXT">Short Text</option>
                      <option value="TEXTAREA">Paragraph Description</option>
                      <option value="NUMBER">Number Field</option>
                      <option value="DATE">Calendar Date</option>
                      <option value="BOOLEAN">Checkbox Toggle</option>
                      <option value="FILE">Attachment Upload</option>
                    </select>
                  </div>

                  <div className="flex items-center h-14">
                    <input 
                      type="checkbox" 
                      id="isRequired" 
                      checked={newIsRequired}
                      onChange={(e) => setNewIsRequired(e.target.checked)}
                      className="accent-indigo-500 mr-2"
                    />
                    <label htmlFor="isRequired" className="text-xs text-text-sub cursor-pointer">Required to submit?</label>
                  </div>
                </div>

                <button 
                  onClick={handleAddRequirement}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-xs font-bold text-text-main rounded-lg"
                >
                  Add Requirement Question
                </button>
              </div>

              {/* Requirement question items list */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Configured Questions</h4>
                <div className="space-y-2">
                  {requirements.map((r, index) => (
                    <div key={r.id || index} className="flex justify-between items-center bg-background border border-border-custom px-4 py-3 rounded-xl text-xs">
                      <div>
                        <span className="text-[9px] bg-surface-elevated border border-border-custom px-1.5 py-0.5 rounded text-text-sub uppercase mr-2">{r.field_type}</span>
                        <span className="text-text-main font-bold">{r.question}</span>
                        {r.is_required && <span className="text-rose-400 text-[10px] ml-1">*Required</span>}
                      </div>
                      <button 
                        onClick={() => handleDeleteRequirement(r.id)}
                        className="text-rose-500 text-xs hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {requirements.length === 0 && <span className="text-xs text-text-muted">No questions added yet.</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Review & Publish */}
          {step === 8 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-main mb-2">Review & Publish Listing</h2>
              
              <div className="border border-border-custom rounded-2xl p-4 bg-background space-y-4 text-xs">
                <div className="flex justify-between border-b border-border-custom pb-2">
                  <span className="text-text-sub font-semibold">Service Title</span>
                  <span className="text-text-main font-bold max-w-sm truncate">{title}</span>
                </div>
                <div className="flex justify-between border-b border-border-custom pb-2">
                  <span className="text-text-sub font-semibold">Delivery Coordinates</span>
                  <span className="text-text-main font-bold uppercase">{serviceType}</span>
                </div>
                {serviceType !== "REMOTE" && (
                  <div className="flex justify-between border-b border-border-custom pb-2">
                    <span className="text-text-sub font-semibold">Location Area</span>
                    <span className="text-text-main font-bold">{city}, {stateName}, {country}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-border-custom pb-2">
                  <span className="text-text-sub font-semibold">Active Packages</span>
                  <span className="text-text-main font-bold">
                    {Object.entries(packages).filter(([_, p]) => p.enabled).map(([t]) => t).join(", ")}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border-custom pb-2">
                  <span className="text-text-sub font-semibold">Gallery media items</span>
                  <span className="text-text-main font-bold">{mediaList.length} Uploaded</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-text-sub font-semibold">Requirement Questions</span>
                  <span className="text-text-main font-bold">{requirements.length} Configured</span>
                </div>
              </div>

              <div className="bg-primary/20 border border-indigo-900/30 p-4 rounded-xl text-xs text-primary">
                <strong>Publication Ready Notice:</strong> Clicking publish will validate pricing, details, location requirements, and list your service in the marketplace explore directory.
              </div>
            </div>
          )}

          {/* Nav Controls */}
          <div className="mt-8 pt-6 border-t border-border-custom flex justify-between items-center">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || loading}
              className="px-4 py-2.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub text-xs font-bold rounded-xl disabled:opacity-30 disabled:pointer-events-none transition"
            >
              Back
            </button>

            <div className="flex gap-2">
              {serviceId && (
                <button
                  type="button"
                  onClick={handleSaveDraftAndExit}
                  className="px-4 py-2.5 bg-background border border-border-custom hover:bg-surface-elevated text-text-sub hover:text-text-main text-xs font-bold rounded-xl transition"
                >
                  Save Draft
                </button>
              )}
              {step < 8 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition"
                >
                  {loading ? "Saving..." : "Save & Continue"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalPublish}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition shadow-lg shadow-primary"
                >
                  {loading ? "Publishing..." : "Finish & Publish Service"}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
