"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { freelancerService } from "@/services/freelancer.service";

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

type TabType = "details" | "skills" | "equipment" | "portfolio";

export default function FreelancerProfileManagement() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile data
  const [profileId, setProfileId] = useState<number | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isProfilePublic, setIsProfilePublic] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");
  const [primaryProfession, setPrimaryProfession] = useState("PHOTOGRAPHER");
  const [experienceYears, setExperienceYears] = useState(0);
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);
  const [willingToTravel, setWillingToTravel] = useState(false);
  const [startingPrice, setStartingPrice] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [eventRate, setEventRate] = useState("");

  // Skills
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  // Equipment
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [eqType, setEqType] = useState("CAMERA");
  const [eqBrand, setEqBrand] = useState("");
  const [eqModel, setEqModel] = useState("");
  const [eqDesc, setEqDesc] = useState("");
  const [editingEqId, setEditingEqId] = useState<number | null>(null);

  // Portfolio
  const [portfolioList, setPortfolioList] = useState<any[]>([]);
  const [portTitle, setPortTitle] = useState("");
  const [portDesc, setPortDesc] = useState("");
  const [portMediaType, setPortMediaType] = useState("IMAGE");
  const [portMediaUrl, setPortMediaUrl] = useState("");
  const [portCategory, setPortCategory] = useState("Wedding");
  const [portIsFeatured, setPortIsFeatured] = useState(false);

  const fileInputProfileRef = useRef<HTMLInputElement>(null);
  const fileInputCoverRef = useRef<HTMLInputElement>(null);
  const fileInputPortRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load skills list
        const skillsData = await freelancerService.getSkillsList();
        setAllSkills(skillsData);

        // Fetch my profile
        const prof = await freelancerService.getProfile();
        if (prof) {
          setProfileId(prof.id);
          setCompletionPercentage(prof.profile_completion_percentage);
          setIsProfilePublic(prof.is_profile_public ?? false);

          setTitle(prof.professional_title || "");
          setBio(prof.bio || "");
          setProfilePhoto(prof.profile_photo_url || "");
          setCoverPhoto(prof.cover_photo_url || "");
          setPrimaryProfession(prof.primary_profession || "PHOTOGRAPHER");
          setExperienceYears(prof.experience_years ?? 0);
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
        if (err.response?.status === 404) {
          // Redirect to onboarding if profile doesn't exist
          router.push("/freelancer/onboarding");
        } else {
          setErrorMsg("Failed to load profile details.");
        }
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);

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
      setSuccessMsg("Image uploaded successfully.");
    } catch (err: any) {
      setErrorMsg("Failed to upload image. Ensure it's under 5MB.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      if (title.length < 3) throw new Error("Professional title must be at least 3 characters.");
      if (bio.length < 30) throw new Error("Bio must be at least 30 characters.");
      if (!city.trim() || !state.trim() || !country.trim()) throw new Error("City, State, and Country are required.");

      const payload = {
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
        is_profile_public: isProfilePublic,
      };

      const res = await freelancerService.updateProfile(payload);
      setCompletionPercentage(res.profile_completion_percentage);
      setIsProfilePublic(res.is_profile_public);
      setSuccessMsg("Profile details saved successfully.");
    } catch (err: any) {
      setErrorMsg(err.message || err.response?.data?.detail || "Failed to update profile details.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSkills = async () => {
    try {
      setSaving(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      const res = await freelancerService.setSkills(selectedSkills);
      setCompletionPercentage(res.profile_completion_percentage);
      setSuccessMsg("Skills updated successfully.");
    } catch (err: any) {
      setErrorMsg("Failed to save skills selection.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublic = async () => {
    const nextVal = !isProfilePublic;
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await freelancerService.updateProfile({ is_profile_public: nextVal });
      setIsProfilePublic(res.is_profile_public);
      setSuccessMsg(nextVal ? "Your profile is now PUBLIC in the directory!" : "Your profile is now PRIVATE.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to change public status. Enforce completion >= 60% and 1 portfolio work.");
    } finally {
      setSaving(false);
    }
  };

  // Equipment actions
  const handleAddEquipment = async () => {
    if (!eqBrand.trim() || !eqModel.trim()) return;

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

      setEqBrand("");
      setEqModel("");
      setEqDesc("");

      const prof = await freelancerService.getProfile();
      setCompletionPercentage(prof.profile_completion_percentage);
      setSuccessMsg("Equipment list updated.");
    } catch (err: any) {
      setErrorMsg("Failed to save equipment.");
    } finally {
      setSaving(false);
    }
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
    if (!portTitle.trim() || !portMediaUrl.trim()) return;

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

      setPortTitle("");
      setPortDesc("");
      setPortMediaUrl("");
      setPortIsFeatured(false);

      const prof = await freelancerService.getProfile();
      setCompletionPercentage(prof.profile_completion_percentage);
      setSuccessMsg("Portfolio item added.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to add portfolio work.");
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
      setErrorMsg(err.response?.data?.detail || "Failed to toggle featured status.");
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
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Dashboard Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">Profile Management</h1>
            <p className="text-slate-400 text-xs mt-1">Configure your public creative resume details.</p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Status Visibility</span>
              <button 
                type="button" 
                onClick={handleTogglePublic}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border mt-1 transition ${
                  isProfilePublic 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                {isProfilePublic ? "Public Profile" : "Private Profile"}
              </button>
            </div>
            {profileId && (
              <button
                type="button"
                onClick={() => router.push(`/freelancers/${profileId}`)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
              >
                View Public Profile
              </button>
            )}
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

        {/* Profile Tabs Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Side Tabs navigation */}
          <div className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "details" ? "bg-slate-900 border border-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Details & Description
            </button>
            <button
              onClick={() => setActiveTab("skills")}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "skills" ? "bg-slate-900 border border-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Skills Selector ({selectedSkills.length})
            </button>
            <button
              onClick={() => setActiveTab("equipment")}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "equipment" ? "bg-slate-900 border border-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Equipment Manager ({equipmentList.length})
            </button>
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition whitespace-nowrap md:w-full ${
                activeTab === "portfolio" ? "bg-slate-900 border border-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Portfolio Showcase ({portfolioList.length})
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
            
            {/* DETAILS PANEL */}
            {activeTab === "details" && (
              <form onSubmit={handleSaveDetails}>
                <h2 className="text-lg font-bold text-white mb-6">Edit Profile Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Profile Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
                        {profilePhoto ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-500">No Photo</span>}
                      </div>
                      <button type="button" onClick={() => fileInputProfileRef.current?.click()} className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-800">
                        Upload
                      </button>
                      <input type="file" ref={fileInputProfileRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, "profile")} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Cover Banner</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
                        {coverPhoto ? <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-500">No Banner</span>}
                      </div>
                      <button type="button" onClick={() => fileInputCoverRef.current?.click()} className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-800">
                        Upload
                      </button>
                      <input type="file" ref={fileInputCoverRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, "cover")} />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Professional Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Primary Profession</label>
                    <select value={primaryProfession} onChange={(e) => setPrimaryProfession(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none">
                      {Object.entries(PROFESSION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Experience (Years)</label>
                    <input type="number" value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">City</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">State</label>
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Country</label>
                    <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Starting Price (₹)</label>
                    <input type="number" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Hourly Rate (₹)</label>
                    <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Event Rate (₹)</label>
                    <input type="number" value={eventRate} onChange={(e) => setEventRate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition">
                  {saving ? "Saving Details..." : "Save Details"}
                </button>
              </form>
            )}

            {/* SKILLS PANEL */}
            {activeTab === "skills" && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Manage Skills</h2>
                <div className="mb-4">
                  <input type="text" value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="Search skills..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-sm" />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {selectedSkills.map((sid) => {
                    const s = allSkills.find((item) => item.id === sid);
                    if (!s) return null;
                    return (
                      <span key={sid} onClick={() => toggleSkill(sid)} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-[10px] rounded-full cursor-pointer hover:bg-rose-500/15">
                        {s.name} ×
                      </span>
                    );
                  })}
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl p-4 bg-slate-950 grid grid-cols-2 gap-2 mb-6">
                  {filteredSkills.map((s) => {
                    const isSelected = selectedSkills.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSkill(s.id)} className={`px-3 py-2 rounded-xl text-left text-xs font-bold border transition ${isSelected ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"}`}>
                        {s.name}
                      </button>
                    );
                  })}
                </div>

                <button onClick={handleSaveSkills} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">
                  {saving ? "Saving Skills..." : "Save Skills Selection"}
                </button>
              </div>
            )}

            {/* EQUIPMENT PANEL */}
            {activeTab === "equipment" && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Manage Equipment</h2>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Type</label>
                      <select value={eqType} onChange={(e) => setEqType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-white">
                        {EQUIPMENT_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Brand</label>
                      <input type="text" value={eqBrand} onChange={(e) => setEqBrand(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Model</label>
                      <input type="text" value={eqModel} onChange={(e) => setEqModel(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-white" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                    <input type="text" value={eqDesc} onChange={(e) => setEqDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-white" />
                  </div>
                  <button onClick={handleAddEquipment} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg">
                    {editingEqId ? "Update Equipment" : "Add Equipment"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {equipmentList.map((eq) => (
                    <div key={eq.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex justify-between items-start">
                      <div>
                        <span className="text-[9px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase">{eq.equipment_type}</span>
                        <h4 className="text-sm font-bold text-white mt-1">{eq.brand} {eq.model}</h4>
                      </div>
                      <button onClick={() => handleDeleteEquipment(eq.id)} className="text-rose-500 hover:text-rose-400 text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PORTFOLIO PANEL */}
            {activeTab === "portfolio" && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Manage Portfolio Items</h2>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Title</label>
                      <input type="text" value={portTitle} onChange={(e) => setPortTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Category</label>
                      <select value={portCategory} onChange={(e) => setPortCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white">
                        {PORTFOLIO_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Media Type</label>
                      <select value={portMediaType} onChange={(e) => setPortMediaType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white">
                        <option value="IMAGE">Image File</option>
                        <option value="VIDEO">Video File</option>
                        <option value="EXTERNAL_VIDEO">External Video URL</option>
                      </select>
                    </div>
                    <div>
                      {portMediaType === "EXTERNAL_VIDEO" ? (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">URL</label>
                          <input type="text" value={portMediaUrl} onChange={(e) => setPortMediaUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white" />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Choose File</label>
                          <button type="button" onClick={() => fileInputPortRef.current?.click()} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-slate-300 font-bold rounded-lg mt-1">Upload File</button>
                          <span className="text-[10px] text-slate-500 block truncate mt-1">{portMediaUrl}</span>
                          <input type="file" ref={fileInputPortRef} className="hidden" accept={portMediaType === "IMAGE" ? "image/*" : "video/*"} onChange={(e) => handleImageUpload(e, "portfolio")} />
                        </div>
                      )}
                    </div>
                  </div>

                  <button onClick={handleAddPortfolio} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg">
                    Add Work
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {portfolioList.map((item) => (
                    <div key={item.id} className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex flex-col justify-between">
                      <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                        {item.media_type === "IMAGE" ? <img src={item.media_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-500">{item.media_type}</span>}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-900 text-[10px]">
                          <button onClick={() => handleToggleFeatured(item.id)} className={item.is_featured ? "text-amber-400 font-bold" : "text-slate-500"}>
                            {item.is_featured ? "Featured" : "Feature"}
                          </button>
                          <button onClick={() => handleDeletePortfolio(item.id)} className="text-rose-500">Delete</button>
                        </div>
                      </div>
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
