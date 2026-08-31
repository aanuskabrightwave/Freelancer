"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";
import { getMediaUrl } from "@/lib/api";

const PROFESSION_LABELS: Record<string, string> = {
  PHOTOGRAPHER: "Photographer",
  VIDEOGRAPHER: "Videographer",
  VIDEO_EDITOR: "Video Editor",
  PHOTO_EDITOR: "Photo Editor",
  CINEMATOGRAPHER: "Cinematographer",
  DRONE_OPERATOR: "Drone Operator",
  REEL_EDITOR: "Reel Editor",
  MOTION_GRAPHICS_ARTIST: "Motion Graphics Artist",
  COLOR_GRADER: "Color Grader",
  OTHER: "Other",
};

const PORTFOLIO_CATEGORIES = [
  "Wedding",
  "Pre-Wedding",
  "Fashion",
  "Corporate",
  "Product",
  "Food",
  "Event",
  "Real Estate",
  "Music Video",
  "Reels",
  "Commercial",
  "Travel",
  "Other",
];

const EQUIPMENT_TYPES = [
  { value: "CAMERA", label: "Camera" },
  { value: "LENS", label: "Lens" },
  { value: "DRONE", label: "Drone" },
  { value: "GIMBAL", label: "Gimbal" },
  { value: "LIGHTING", label: "Lighting" },
  { value: "MICROPHONE", label: "Microphone" },
  { value: "TRIPOD", label: "Tripod" },
  { value: "COMPUTER", label: "Computer" },
  { value: "OTHER", label: "Other" },
];

export default function FreelancerOnboarding() {
  const { user } = useAuth();
  const router = useRouter();

  // Onboarding Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile data locally synced
  const [profileExists, setProfileExists] = useState<boolean>(false);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);

  // Step 1: Basic Profile
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");
  
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [behance, setBehance] = useState("");

  // Step 2: Professional Details
  const [primaryProfession, setPrimaryProfession] = useState("PHOTOGRAPHER");
  const [experienceYears, setExperienceYears] = useState(0);

  // Step 3: Location
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);
  const [willingToTravel, setWillingToTravel] = useState(false);

  // Step 4: Skills
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  // Step 5: Equipment repeaters
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [eqType, setEqType] = useState("CAMERA");
  const [eqBrand, setEqBrand] = useState("");
  const [eqModel, setEqModel] = useState("");
  const [eqDesc, setEqDesc] = useState("");
  const [editingEqId, setEditingEqId] = useState<number | null>(null);

  // Step 6: Portfolio items
  const [portfolioList, setPortfolioList] = useState<any[]>([]);
  const [portTitle, setPortTitle] = useState("");
  const [portDesc, setPortDesc] = useState("");
  const [portMediaType, setPortMediaType] = useState("IMAGE");
  const [portMediaUrl, setPortMediaUrl] = useState("");
  const [portCategory, setPortCategory] = useState("Wedding");
  const [portIsFeatured, setPortIsFeatured] = useState(false);

  // Step 7: Pricing
  const [startingPrice, setStartingPrice] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [eventRate, setEventRate] = useState<string>("");

  const fileInputProfileRef = useRef<HTMLInputElement>(null);
  const fileInputCoverRef = useRef<HTMLInputElement>(null);
  const fileInputPortRef = useRef<HTMLInputElement>(null);

  // Load existing profile if any
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch skills global list
        const skillsData = await freelancerService.getSkillsList();
        setAllSkills(skillsData);

        // Fetch my profile
        const prof = await freelancerService.getProfile();
        if (prof) {
          setProfileExists(true);
          setCompletionPercentage(prof.profile_completion_percentage);

          // Map values
          setTitle(prof.professional_title || "");
          setBio(prof.bio || "");
          setProfilePhoto(prof.profile_photo_url || "");
          setCoverPhoto(prof.cover_photo_url || "");
          setPrimaryProfession(prof.primary_profession || "PHOTOGRAPHER");
          setExperienceYears(prof.experience_years ?? 0);
          
          setWebsite(prof.website || "");
          setInstagram(prof.instagram || "");
          setBehance(prof.behance || "");
          setCountry(prof.country || "India");
          setState(prof.state || "");
          setCity(prof.city || "");
          setRadius(prof.service_radius_km || 25);
          setWillingToTravel(prof.willing_to_travel ?? false);
          
          if (prof.skills) {
            setSelectedSkills(prof.skills.map((s: any) => s.id));
          }
          if (prof.equipment) {
            setEquipmentList(prof.equipment);
          }
          if (prof.portfolio) {
            setPortfolioList(prof.portfolio);
          }

          setStartingPrice(prof.starting_price ? String(Math.round(prof.starting_price)) : "");
          setHourlyRate(prof.hourly_rate ? String(Math.round(prof.hourly_rate)) : "");
          setEventRate(prof.event_rate ? String(Math.round(prof.event_rate)) : "");
        }
      } catch (err: any) {
        // If 404, it means profile doesn't exist yet, which is fine
        if (err.response?.status !== 404) {
          setErrorMsg("Could not fetch existing profile data.");
        }
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);

  // General Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "cover" | "portfolio") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      const subfolder = type === "portfolio" ? "portfolios" : "profiles";
      const res = await freelancerService.uploadFile(file, subfolder);
      if (type === "profile") {
        setProfilePhoto(res.file_url);
      } else if (type === "cover") {
        setCoverPhoto(res.file_url);
      } else if (type === "portfolio") {
        setPortMediaUrl(res.file_url);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "File upload failed. Ensure image is < 5MB (PNG/JPG/WEBP).");
    } finally {
      setSaving(false);
    }
  };

  // Persist Current Step State
  const saveStepData = async (step: number) => {
    try {
      setSaving(true);
      setErrorMsg(null);

      // Collect payload
      const payload: any = {
        professional_title: title,
        primary_profession: primaryProfession,
        bio: bio,
        experience_years: Number(experienceYears),
        city: city,
        state: state,
        country: country,
        service_radius_km: Number(radius),
        willing_to_travel: willingToTravel,
        starting_price: startingPrice ? parseFloat(startingPrice) : null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        event_rate: eventRate ? parseFloat(eventRate) : null,
        profile_photo_url: profilePhoto || null,
        cover_photo_url: coverPhoto || null,
        website: website || null,
        instagram: instagram || null,
        behance: behance || null,
      };

      if (step === 1) {
        // Validation basic title & bio
        if (title.length < 3) throw new Error("Professional title must be at least 3 characters.");
        if (bio.length < 30) throw new Error("Bio must be at least 30 characters.");
      }

      if (step === 3) {
        if (!city.trim() || !state.trim() || !country.trim()) {
          throw new Error("City, State, and Country are required location parameters.");
        }
      }

      let updatedProf;
      if (!profileExists) {
        // Create initial profile
        updatedProf = await freelancerService.createProfile(payload);
        setProfileExists(true);
      } else {
        // Update existing profile
        updatedProf = await freelancerService.updateProfile(payload);
      }

      if (updatedProf) {
        setCompletionPercentage(updatedProf.profile_completion_percentage);
      }

      // If Step 4, also sync skills
      if (step === 4) {
        const res = await freelancerService.setSkills(selectedSkills);
        setCompletionPercentage(res.profile_completion_percentage);
      }

      return true;
    } catch (err: any) {
      setErrorMsg(err.message || err.response?.data?.detail || "Failed to persist onboarding updates.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const success = await saveStepData(currentStep);
    if (success) {
      setCurrentStep((prev) => Math.min(prev + 1, 8));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveAndExit = async () => {
    const success = await saveStepData(currentStep);
    if (success) {
      router.push("/freelancer/dashboard");
    }
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);

      // Validate publication requirements (>= 60% completion and at least 1 portfolio)
      if (completionPercentage < 60) {
        throw new Error(`Profile must be at least 60% complete before finishing onboarding. Currently ${completionPercentage}%.`);
      }
      if (portfolioList.length === 0) {
        throw new Error("Please add at least 1 portfolio item before completing onboarding.");
      }

      // Publish profile dynamically
      await freelancerService.updateProfile({ is_profile_public: true });
      
      router.push("/freelancer/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || err.response?.data?.detail || "Failed to complete setup.");
    } finally {
      setSaving(false);
    }
  };

  // Equipment actions
  const handleAddEquipment = async () => {
    if (!eqBrand.trim() || !eqModel.trim()) {
      setErrorMsg("Please specify brand and model of your equipment.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      const payload = {
        equipment_type: eqType,
        brand: eqBrand,
        model: eqModel,
        description: eqDesc || undefined,
      };

      if (editingEqId) {
        const res = await freelancerService.updateEquipment(editingEqId, payload);
        setEquipmentList((prev) => prev.map((e) => (e.id === editingEqId ? res : e)));
        setEditingEqId(null);
      } else {
        const res = await freelancerService.addEquipment(payload);
        setEquipmentList((prev) => [...prev, res]);
      }

      // Reset fields
      setEqBrand("");
      setEqModel("");
      setEqDesc("");
      
      // Update completion
      const prof = await freelancerService.getProfile();
      setCompletionPercentage(prof.profile_completion_percentage);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to save equipment.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditEquipment = (item: any) => {
    setEditingEqId(item.id);
    setEqType(item.equipment_type);
    setEqBrand(item.brand);
    setEqModel(item.model);
    setEqDesc(item.description || "");
  };

  const handleDeleteEquipment = async (id: number) => {
    try {
      setSaving(true);
      await freelancerService.deleteEquipment(id);
      setEquipmentList((prev) => prev.filter((e) => e.id !== id));
      
      const prof = await freelancerService.getProfile();
      setCompletionPercentage(prof.profile_completion_percentage);
    } catch (err: any) {
      setErrorMsg("Failed to delete equipment.");
    } finally {
      setSaving(false);
    }
  };

  // Portfolio actions
  const handleAddPortfolio = async () => {
    if (!portTitle.trim() || !portMediaUrl.trim()) {
      setErrorMsg("Title and Media URL are required.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const payload = {
        title: portTitle,
        description: portDesc || undefined,
        media_type: portMediaType,
        media_url: portMediaUrl,
        category: portCategory,
        is_featured: portIsFeatured,
      };

      const res = await freelancerService.addPortfolio(payload);
      setPortfolioList((prev) => [...prev, res]);

      // Reset
      setPortTitle("");
      setPortDesc("");
      setPortMediaUrl("");
      setPortIsFeatured(false);

      const prof = await freelancerService.getProfile();
      setCompletionPercentage(prof.profile_completion_percentage);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to add portfolio item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePortfolio = async (id: number) => {
    try {
      setSaving(true);
      await freelancerService.deletePortfolio(id);
      setPortfolioList((prev) => prev.filter((p) => p.id !== id));

      const prof = await freelancerService.getProfile();
      setCompletionPercentage(prof.profile_completion_percentage);
    } catch (err: any) {
      setErrorMsg("Failed to delete portfolio item.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      setSaving(true);
      const updated = await freelancerService.toggleFeaturedPortfolio(id);
      setPortfolioList((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to feature item.");
    } finally {
      setSaving(false);
    }
  };

  const filteredSkills = allSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const toggleSkill = (id: number) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-text-sub">Loading Onboarding Wizard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8 text-text-main font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Onboarding Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between bg-surface border border-border-custom rounded-2xl p-6 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Creative Professional Onboarding
            </h1>
            <p className="text-text-sub text-sm mt-1">
              Step {currentStep} of 8 — Build your profile and stand out to clients.
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col items-end">
            <span className="text-xs text-text-sub font-semibold uppercase tracking-wider">
              Profile Completion
            </span>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-32 bg-surface-elevated h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-bold text-emerald-400">{completionPercentage}%</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Step Container Card */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
          
          {/* STEP 1: Basic Profile */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 1: Basic Profile</h2>
              
              {/* Photo Uploaders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Profile Photo (MIME: JPEG/PNG/WEBP, Max 5MB)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-primary/40 bg-background flex-shrink-0 overflow-hidden flex items-center justify-center relative group">
                      {profilePhoto ? (
                        <img src={getMediaUrl(profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-text-muted text-xs">No Photo</span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => fileInputProfileRef.current?.click()} 
                      className="px-4 py-2 bg-surface-elevated hover:bg-surface-elevated text-text-main text-sm font-semibold rounded-xl border border-border-custom transition"
                    >
                      {profilePhoto ? "Change Photo" : "Upload Photo"}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputProfileRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, "profile")} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Cover Banner Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 rounded-xl border-2 border-primary/40 bg-background flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                      {coverPhoto ? (
                        <img src={getMediaUrl(coverPhoto)} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-text-muted text-xs">No Cover</span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => fileInputCoverRef.current?.click()} 
                      className="px-4 py-2 bg-surface-elevated hover:bg-surface-elevated text-text-main text-sm font-semibold rounded-xl border border-border-custom transition"
                    >
                      {coverPhoto ? "Change Cover" : "Upload Cover"}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputCoverRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, "cover")} 
                    />
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-text-sub mb-2">Professional Title (Wedding Photographer, Drone Operator, etc.)</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Wedding Photographer & Drone Specialist"
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition"
                />
                <span className="text-xs text-text-muted mt-1 block">Requires 3 to 120 characters.</span>
              </div>

              {/* Bio Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-text-sub mb-2">Bio / Professional Description</label>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  rows={5}
                  placeholder="Describe your creative work, background, and specializations..."
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition resize-none"
                />
                <div className="flex justify-between items-center text-xs text-text-muted mt-1">
                  <span>Minimum 30 characters. Max 2000.</span>
                  <span className={bio.length < 30 ? "text-rose-400" : "text-emerald-400"}>{bio.length} characters</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Website (Optional)</label>
                  <input 
                    type="url" 
                    value={website} 
                    onChange={(e) => setWebsite(e.target.value)} 
                    placeholder="https://..."
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Instagram (Optional)</label>
                  <input 
                    type="url" 
                    value={instagram} 
                    onChange={(e) => setInstagram(e.target.value)} 
                    placeholder="https://instagram.com/..."
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Behance/Other (Optional)</label>
                  <input 
                    type="url" 
                    value={behance} 
                    onChange={(e) => setBehance(e.target.value)} 
                    placeholder="https://behance.net/..."
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Professional Details */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 2: Professional Details</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-text-sub mb-2">Primary Profession</label>
                <select 
                  value={primaryProfession} 
                  onChange={(e) => setPrimaryProfession(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                >
                  {Object.entries(PROFESSION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-text-sub mb-2">Experience (Years)</label>
                <input 
                  type="number" 
                  value={experienceYears} 
                  onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)} 
                  min={0}
                  max={50}
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                />
                <span className="text-xs text-text-muted mt-1 block">Valid range: 0 to 50 years.</span>
              </div>
            </div>
          )}

          {/* STEP 3: Location */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 3: Location & Service Area</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Country</label>
                  <input 
                    type="text" 
                    value={country} 
                    onChange={(e) => setCountry(e.target.value)} 
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">State / Region</label>
                  <input 
                    type="text" 
                    value={state} 
                    onChange={(e) => setState(e.target.value)} 
                    placeholder="e.g. Maharashtra"
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">City</label>
                  <input 
                    type="text" 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder="e.g. Mumbai"
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Service Radius (km)</label>
                  <input 
                    type="number" 
                    value={radius} 
                    onChange={(e) => setRadius(parseInt(e.target.value) || 1)} 
                    min={1}
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                  />
                </div>

                <div className="flex items-center mt-8">
                  <label className="flex items-center cursor-pointer select-none text-text-sub text-sm font-semibold">
                    <input 
                      type="checkbox" 
                      checked={willingToTravel} 
                      onChange={(e) => setWillingToTravel(e.target.checked)} 
                      className="mr-3 w-5 h-5 rounded border-border-custom bg-background accent-indigo-500"
                    />
                    Willing to Travel Outside State / City
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Skills */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 4: Skills Selector</h2>
              
              <div className="mb-6">
                <input 
                  type="text" 
                  value={skillSearch} 
                  onChange={(e) => setSkillSearch(e.target.value)} 
                  placeholder="Search skills... (e.g. Portrait, Lightroom)"
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Selected skills capsules */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedSkills.map((sid) => {
                  const s = allSkills.find((item) => item.id === sid);
                  if (!s) return null;
                  return (
                    <span 
                      key={sid} 
                      onClick={() => toggleSkill(sid)}
                      className="px-3.5 py-1.5 bg-primary-hover border border-primary/30 text-indigo-300 font-semibold text-xs rounded-full cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 transition flex items-center gap-1.5"
                    >
                      {s.name} <span className="font-bold">×</span>
                    </span>
                  );
                })}
              </div>

              {/* Skills directory grid */}
              <div className="max-h-60 overflow-y-auto border border-border-custom rounded-2xl p-4 bg-background grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredSkills.map((s) => {
                  const isSelected = selectedSkills.includes(s.id);
                  return (
                    <button 
                      key={s.id}
                      type="button"
                      onClick={() => toggleSkill(s.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold text-left border transition ${
                        isSelected 
                          ? "bg-primary border-primary text-text-main" 
                          : "bg-surface border-border-custom text-text-sub hover:border-border-custom hover:text-text-main"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-text-muted mt-2 block">Choose at least 3 skills to complete this section.</span>
            </div>
          )}

          {/* STEP 5: Equipment */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 5: Equipment List</h2>
              
              {/* Equipment form repeaters */}
              <div className="bg-background border border-border-custom rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-bold text-text-main mb-4">
                  {editingEqId ? "Edit Equipment" : "Add Equipment"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-sub mb-1">Equipment Type</label>
                    <select 
                      value={eqType} 
                      onChange={(e) => setEqType(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                    >
                      {EQUIPMENT_TYPES.map((e) => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-sub mb-1">Brand</label>
                    <input 
                      type="text" 
                      value={eqBrand} 
                      onChange={(e) => setEqBrand(e.target.value)} 
                      placeholder="e.g. Sony, DJI"
                      className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-sub mb-1">Model</label>
                    <input 
                      type="text" 
                      value={eqModel} 
                      onChange={(e) => setEqModel(e.target.value)} 
                      placeholder="e.g. A7 IV, Mini 4 Pro"
                      className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-text-sub mb-1">Description (Optional)</label>
                  <input 
                    type="text" 
                    value={eqDesc} 
                    onChange={(e) => setEqDesc(e.target.value)} 
                    placeholder="e.g. Primary body with 24-70mm lens"
                    className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddEquipment} 
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition"
                >
                  {editingEqId ? "Update Item" : "Add Equipment"}
                </button>
              </div>

              {/* Equipment Card list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {equipmentList.map((eq) => (
                  <div key={eq.id} className="bg-surface border border-border-custom rounded-2xl p-4 flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 bg-surface-elevated border border-border-custom text-text-sub text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {eq.equipment_type}
                      </span>
                      <h4 className="text-sm font-bold text-text-main mt-2">{eq.brand} {eq.model}</h4>
                      {eq.description && <p className="text-xs text-text-muted mt-1">{eq.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => handleEditEquipment(eq)} 
                        className="text-primary hover:text-indigo-300 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteEquipment(eq.id)} 
                        className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {equipmentList.length === 0 && (
                  <div className="col-span-full py-8 text-center text-text-muted text-sm border-2 border-dashed border-border-custom rounded-2xl">
                    No equipment added. Add at least 1 item to satisfy onboarding completion goals.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Portfolio */}
          {currentStep === 6 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 6: Portfolio Showcase</h2>
              
              {/* Portfolio add form */}
              <div className="bg-background border border-border-custom rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-bold text-text-main mb-4">Add Work Item</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-sub mb-1">Title</label>
                    <input 
                      type="text" 
                      value={portTitle} 
                      onChange={(e) => setPortTitle(e.target.value)} 
                      placeholder="e.g. Summer Destination Wedding"
                      className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-sub mb-1">Category</label>
                    <select 
                      value={portCategory} 
                      onChange={(e) => setPortCategory(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                    >
                      {PORTFOLIO_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-text-sub mb-1">Description (Optional)</label>
                  <input 
                    type="text" 
                    value={portDesc} 
                    onChange={(e) => setPortDesc(e.target.value)} 
                    placeholder="Short description of this project..."
                    className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-sub mb-1">Media Type</label>
                    <select 
                      value={portMediaType} 
                      onChange={(e) => setPortMediaType(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                    >
                      <option value="IMAGE">Image File</option>
                      <option value="VIDEO">Video File</option>
                      <option value="EXTERNAL_VIDEO">External Video URL (YouTube/Vimeo)</option>
                    </select>
                  </div>

                  <div>
                    {portMediaType === "EXTERNAL_VIDEO" ? (
                      <div>
                        <label className="block text-xs font-semibold text-text-sub mb-1">Video URL</label>
                        <input 
                          type="text" 
                          value={portMediaUrl} 
                          onChange={(e) => setPortMediaUrl(e.target.value)} 
                          placeholder="e.g. https://www.youtube.com/watch?v=..."
                          className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary transition"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-text-sub mb-1">Upload File</label>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button" 
                            onClick={() => fileInputPortRef.current?.click()} 
                            className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub text-xs font-semibold rounded-xl border border-border-custom transition"
                          >
                            Choose File
                          </button>
                          <span className="text-[10px] text-text-muted truncate max-w-xs">{portMediaUrl || "No file uploaded"}</span>
                          <input 
                            type="file" 
                            ref={fileInputPortRef} 
                            className="hidden" 
                            accept={portMediaType === "IMAGE" ? "image/*" : "video/*"}
                            onChange={(e) => handleImageUpload(e, "portfolio")} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center text-text-sub text-xs font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={portIsFeatured} 
                      onChange={(e) => setPortIsFeatured(e.target.checked)} 
                      className="mr-2 w-4 h-4 rounded border-border-custom bg-background accent-indigo-500"
                    />
                    Mark as Featured Work Item (Max 6)
                  </label>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddPortfolio} 
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-main text-xs font-bold rounded-xl transition"
                >
                  Add Work
                </button>
              </div>

              {/* Portfolio Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {portfolioList.map((item) => (
                  <div key={item.id} className="bg-surface border border-border-custom rounded-2xl overflow-hidden group relative flex flex-col justify-between">
                    <div className="relative aspect-video bg-background flex items-center justify-center overflow-hidden">
                      {item.media_type === "IMAGE" ? (
                        <img src={getMediaUrl(item.media_url)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="text-text-sub text-xs flex flex-col items-center">
                          <span className="font-bold uppercase text-[10px] bg-surface-elevated border border-border-custom px-2 py-0.5 rounded text-primary">
                            {item.media_type}
                          </span>
                          <span className="mt-2 text-center text-[10px] px-2 truncate max-w-xs">{item.media_url}</span>
                        </div>
                      )}
                      
                      {item.is_featured && (
                        <span className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                          FEATURED
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-text-main truncate">{item.title}</h4>
                        <span className="text-[10px] text-text-muted block mt-1">{item.category}</span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border-custom flex justify-between items-center text-xs">
                        <button 
                          type="button" 
                          onClick={() => handleToggleFeatured(item.id)} 
                          className={`font-semibold ${item.is_featured ? "text-amber-400 hover:text-amber-300" : "text-text-sub hover:text-text-sub"}`}
                        >
                          {item.is_featured ? "Unfeature" : "Feature"}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeletePortfolio(item.id)} 
                          className="text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {portfolioList.length === 0 && (
                  <div className="col-span-full py-8 text-center text-text-muted text-sm border-2 border-dashed border-border-custom rounded-2xl">
                    No portfolio items added. Add at least 3 items to complete the portfolio onboarding segment.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: Pricing */}
          {currentStep === 7 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 7: Basic Pricing (Optional)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Starting Price (₹)</label>
                  <input 
                    type="number" 
                    value={startingPrice} 
                    onChange={(e) => setStartingPrice(e.target.value)} 
                    placeholder="e.g. 5000"
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Hourly Rate (₹)</label>
                  <input 
                    type="number" 
                    value={hourlyRate} 
                    onChange={(e) => setHourlyRate(e.target.value)} 
                    placeholder="e.g. 2000"
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-sub mb-2">Event Rate (₹)</label>
                  <input 
                    type="number" 
                    value={eventRate} 
                    onChange={(e) => setEventRate(e.target.value)} 
                    placeholder="e.g. 20000"
                    className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>
              <span className="text-xs text-text-muted block mt-2">All prices are represented in INR (₹) on the platform. Define at least 1 pricing field to complete this step.</span>
            </div>
          )}

          {/* STEP 8: Review & Finish */}
          {currentStep === 8 && (
            <div>
              <h2 className="text-xl font-bold text-text-main mb-6">Step 8: Review & Finish</h2>
              
              <div className="bg-background border border-border-custom rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Professional Details</h3>
                  <p className="text-sm font-bold text-text-main mb-1">{title || "No Title Specified"}</p>
                  <p className="text-xs text-text-sub mb-4">{primaryProfession ? PROFESSION_LABELS[primaryProfession] : ""} — {experienceYears} years experience</p>
                  
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Location</h3>
                  <p className="text-sm text-text-sub mb-4">{city}, {state}, {country} (Radius: {radius} km)</p>

                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Bio Summary</h3>
                  <p className="text-xs text-text-sub line-clamp-3 italic">"{bio}"</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 font-mono">Metrics Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-surface border border-border-custom rounded-xl p-3">
                      <span className="block text-2xl font-black text-text-main">{selectedSkills.length}</span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Skills Selected</span>
                    </div>
                    <div className="bg-surface border border-border-custom rounded-xl p-3">
                      <span className="block text-2xl font-black text-text-main">{equipmentList.length}</span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Equipment Items</span>
                    </div>
                    <div className="bg-surface border border-border-custom rounded-xl p-3">
                      <span className="block text-2xl font-black text-text-main">{portfolioList.length}</span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Portfolio Works</span>
                    </div>
                    <div className="bg-surface border border-border-custom rounded-xl p-3">
                      <span className="block text-sm font-black text-text-main truncate">
                        {startingPrice ? `₹${parseInt(startingPrice).toLocaleString()}` : "Not Set"}
                      </span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mt-1">Starting Price</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status checklist */}
              <div className="bg-surface border border-border-custom rounded-xl p-4 text-xs text-text-sub space-y-2 mb-6">
                <p className="font-bold text-text-main mb-2">Onboarding Completion Checklist:</p>
                <div className="flex items-center justify-between">
                  <span>Profile Completion Percentage (Requires &gt;= 60%)</span>
                  <span className={`font-bold ${completionPercentage >= 60 ? "text-emerald-400" : "text-rose-400"}`}>
                    {completionPercentage}% {completionPercentage >= 60 ? "✔" : "❌"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>At least 1 Portfolio Work Item</span>
                  <span className={`font-bold ${portfolioList.length >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
                    {portfolioList.length} items {portfolioList.length >= 1 ? "✔" : "❌"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="mt-8 pt-6 border-t border-border-custom flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={handleSaveAndExit}
                disabled={saving}
                className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-elevated text-text-sub text-sm font-semibold rounded-xl border border-border-custom transition disabled:opacity-50"
              >
                Save & Exit
              </button>
            </div>

            <div className="flex gap-2">
              {currentStep > 1 && (
                <button 
                  type="button" 
                  onClick={handleBack}
                  disabled={saving}
                  className="px-5 py-2.5 bg-surface-elevated hover:bg-surface-elevated text-text-sub text-sm font-semibold rounded-xl border border-border-custom transition disabled:opacity-50"
                >
                  Back
                </button>
              )}

              {currentStep < 8 ? (
                <button 
                  type="button" 
                  onClick={handleNext}
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-text-main text-sm font-bold rounded-xl shadow-lg shadow-primary transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleFinish}
                  disabled={saving}
                  className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-text-main text-sm font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {saving ? "Publishing..." : "Finish Setup & Publish"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
