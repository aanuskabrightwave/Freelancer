"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import NotificationPreferencesForm from "@/components/notifications/NotificationPreferencesForm";
import { settingsService } from "@/services/settings.service";
import { marketplaceService } from "@/services/service.service";
import { 
  User as UserIcon, 
  Lock, 
  Bell, 
  Shield, 
  LogOut, 
  AlertTriangle,
  Loader2,
  Check,
  Save,
  Briefcase,
  ExternalLink,
  Calendar,
  DollarSign
} from "lucide-react";

type SettingsTab = "account" | "security" | "notifications" | "privacy" | "work" | "verification" | "payout" | "availability" | "management";

export default function FreelancerSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Loading / saving states
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState("");

  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);
  const [privacyError, setPrivacyError] = useState("");

  const [savingWork, setSavingWork] = useState(false);
  const [workSuccess, setWorkSuccess] = useState(false);
  const [workError, setWorkError] = useState("");

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Account Information form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Privacy & Profile Visibility state
  const [isProfilePublic, setIsProfilePublic] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState("NOT_SUBMITTED");
  const [payoutStatus, setPayoutStatus] = useState("NOT_CONFIGURED");

  // Work Preferences form state
  const [categories, setCategories] = useState<any[]>([]);
  const [preferredCategoryIds, setPreferredCategoryIds] = useState<number[]>([]);
  const [preferredBudgetMin, setPreferredBudgetMin] = useState<string>("");
  const [preferredBudgetMax, setPreferredBudgetMax] = useState<string>("");
  const [preferredWorkMode, setPreferredWorkMode] = useState<string>("");
  const [preferredLocations, setPreferredLocations] = useState<string>("");
  const [openToRemote, setOpenToRemote] = useState<boolean>(true);

  // Security / Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Account Management state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function loadSettingsAndCategories() {
      try {
        // Fetch categories
        const cats = await marketplaceService.getCategoriesMenu();
        setCategories(cats || []);

        // Fetch settings
        const res: any = await settingsService.getSettings();
        setFullName(res.full_name);
        setEmail(res.email);
        setPhone(res.phone);
        setIsProfilePublic(res.is_profile_public);
        setProfileCompletion(res.profile_completion_percentage || 0);
        setVerificationStatus(res.verification_status || "NOT_SUBMITTED");
        setPayoutStatus(res.payout_status || "NOT_CONFIGURED");

        // Parse preferred categories
        if (res.preferred_categories) {
          const ids = res.preferred_categories
            .split(",")
            .map((id: string) => parseInt(id.trim()))
            .filter((id: number) => !isNaN(id));
          setPreferredCategoryIds(ids);
        }

        setPreferredBudgetMin(res.preferred_budget_min ? String(parseFloat(res.preferred_budget_min)) : "");
        setPreferredBudgetMax(res.preferred_budget_max ? String(parseFloat(res.preferred_budget_max)) : "");
        setPreferredWorkMode(res.preferred_work_mode || "");
        setPreferredLocations(res.preferred_locations || "");
        setOpenToRemote(res.open_to_remote !== false);
      } catch (err: any) {
        console.error("Failed to load settings data", err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadSettingsAndCategories();
    }
  }, [user]);

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountSuccess(false);
    setAccountError("");
    try {
      await settingsService.updateSettings({ full_name: fullName });
      setAccountSuccess(true);
      setTimeout(() => setAccountSuccess(false), 3000);
    } catch (err: any) {
      setAccountError(err.response?.data?.detail || "Failed to update account name.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePrivacyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrivacy(true);
    setPrivacySuccess(false);
    setPrivacyError("");
    try {
      const res: any = await settingsService.updateSettings({ is_profile_public: isProfilePublic });
      setIsProfilePublic(res.is_profile_public);
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 3000);
    } catch (err: any) {
      setPrivacyError(err.response?.data?.detail || "Failed to save profile visibility.");
      // Rollback UI toggle if failed
      setIsProfilePublic(!isProfilePublic);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleCategoryToggle = (id: number) => {
    setPreferredCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleWorkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const minVal = preferredBudgetMin ? parseFloat(preferredBudgetMin) : null;
    const maxVal = preferredBudgetMax ? parseFloat(preferredBudgetMax) : null;

    if (minVal !== null && maxVal !== null && maxVal < minVal) {
      setWorkError("Maximum preferred budget cannot be less than minimum preferred budget.");
      return;
    }

    setSavingWork(true);
    setWorkSuccess(false);
    setWorkError("");
    try {
      const res: any = await settingsService.updateSettings({
        preferred_categories: preferredCategoryIds.join(","),
        preferred_budget_min: minVal,
        preferred_budget_max: maxVal,
        preferred_work_mode: preferredWorkMode || null,
        preferred_locations: preferredLocations || null,
        open_to_remote: openToRemote
      });
      setWorkSuccess(true);
      setTimeout(() => setWorkSuccess(false), 3000);
    } catch (err: any) {
      setWorkError(err.response?.data?.detail || "Failed to save work preferences.");
    } finally {
      setSavingWork(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    setPasswordSuccess(false);
    setPasswordError("");
    try {
      await settingsService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await settingsService.deactivateAccount();
      await logout();
      router.push("/login");
    } catch (err: any) {
      console.error("Failed to deactivate account", err);
      alert("Failed to deactivate account.");
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-8">
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs">Loading Settings...</p>
        </div>
      </Container>
    );
  }

  const getVerificationLabel = (status: string) => {
    switch (status) {
      case "VERIFIED": return "Verified badge Active";
      case "PENDING": return "Pending Verification";
      case "REJECTED": return "Rejected";
      default: return "Not Submitted";
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "account", label: "Account Info", icon: UserIcon },
    { id: "security", label: "Password & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Profile Visibility", icon: Shield },
    { id: "work", label: "Work Preferences", icon: Briefcase },
    { id: "verification", label: "Verification Status", icon: Shield },
    { id: "payout", label: "Payout Settings", icon: DollarSign },
    { id: "availability", label: "Availability Calendar", icon: Calendar },
    { id: "management", label: "Account Management", icon: LogOut },
  ];

  return (
    <Container className="py-8 font-sans max-w-6xl">
      <PageHeader
        title="Settings"
        description="Configure your creator account settings, public profile visibility, and payment rails."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 flex flex-col gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left transition duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                    : "bg-surface hover:bg-surface-elevated text-text-sub border border-border-custom/50 hover:text-text-main"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Pane */}
        <main className="md:col-span-3 bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xs">
          
          {/* TAB 1: ACCOUNT INFORMATION */}
          {activeTab === "account" && (
            <div className="space-y-6 max-w-xl">
              <form onSubmit={handleAccountUpdate} className="space-y-6">
                <div>
                  <h3 className="font-extrabold text-base text-text-main">Account Information</h3>
                  <p className="text-xs text-text-muted mt-1">Configure your login credentials and personal identification.</p>
                </div>

                {accountError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl p-4 font-medium">
                    {accountError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-sub">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5 opacity-60">
                    <label className="block text-xs font-semibold text-text-sub">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-muted text-sm cursor-not-allowed"
                    />
                    <p className="text-[10px] text-text-muted">Registered login email cannot be modified directly.</p>
                  </div>

                  <div className="space-y-1.5 opacity-60">
                    <label className="block text-xs font-semibold text-text-sub">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      disabled
                      className="w-full bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-text-muted text-sm cursor-not-allowed"
                    />
                    <p className="text-[10px] text-text-muted">Registered phone number cannot be modified directly.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border-custom/50">
                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Changes</span>
                  </button>
                  {accountSuccess && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                      <Check className="w-4 h-4" />
                      Account settings saved!
                    </span>
                  )}
                </div>
              </form>

              <div className="pt-6 border-t border-border-custom/50 space-y-4">
                <div>
                  <h4 className="font-bold text-xs text-text-main">Professional Profile Attributes</h4>
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                    Personal bio, portfolio images, physical equipment lists, and hourly packages are managed separately through the profile onboarding module.
                  </p>
                </div>
                <Link
                  href="/freelancer/profile"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-xl transition"
                >
                  <span>Edit Professional Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: PASSWORD & SECURITY */}
          {activeTab === "security" && (
            <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Password & Security</h3>
                <p className="text-xs text-text-muted mt-1">Configure your login credentials and reset credentials.</p>
              </div>

              {passwordError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl p-4 font-medium">
                  {passwordError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-sub">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-sub">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                  <p className="text-[10px] text-text-muted">Must be at least 8 characters.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-sub">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border-custom/50">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Change Password</span>
                </button>
                {passwordSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                    <Check className="w-4 h-4" />
                    Password updated successfully!
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Notification Preferences</h3>
                <p className="text-xs text-text-muted mt-1">Configure which email and in-app updates you receive.</p>
              </div>
              <NotificationPreferencesForm />
            </div>
          )}

          {/* TAB 4: PRIVACY & VISIBILITY */}
          {activeTab === "privacy" && (
            <form onSubmit={handlePrivacyUpdate} className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Privacy & Profile Visibility</h3>
                <p className="text-xs text-text-muted mt-1">Configure your search and discovery exposure preferences.</p>
              </div>

              {privacyError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl p-4 font-medium">
                  {privacyError}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-6 p-4 bg-surface-elevated border border-border-custom rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs text-text-main">Public Profile Visibility</h4>
                    <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                      When enabled, your profile appears in public directories and explore indices.
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setIsProfilePublic(!isProfilePublic)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isProfilePublic ? "bg-indigo-500" : "bg-neutral-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isProfilePublic ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 bg-surface-elevated border border-border-custom/50 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-text-sub">Profile Completion Score</span>
                    <span className="text-indigo-500">{profileCompletion}%</span>
                  </div>
                  
                  {/* Publication Gate info */}
                  <p className="text-[9px] text-text-muted leading-relaxed">
                    ⚠️ To toggle visibility ON, your profile completion must be at least **60%** and contain at least **1 portfolio item** (enforced by publication gate logic).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border-custom/50">
                <button
                  type="submit"
                  disabled={savingPrivacy}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  {savingPrivacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Privacy</span>
                </button>
                {privacySuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                    <Check className="w-4 h-4" />
                    Visibility settings saved!
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB 5: WORK PREFERENCES */}
          {activeTab === "work" && (
            <form onSubmit={handleWorkUpdate} className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Work Preferences</h3>
                <p className="text-xs text-text-muted mt-1">Define your preferred contract scopes and project types.</p>
              </div>

              {workError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl p-4 font-medium">
                  {workError}
                </div>
              )}

              <div className="space-y-6">
                
                {/* Category selection checkboxes */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-text-sub">Preferred Categories</label>
                  <p className="text-[10px] text-text-muted">Select categories of client briefs you prefer to receive.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {categories.map((cat) => {
                      const isSelected = preferredCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryToggle(cat.id)}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-left text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-500"
                              : "bg-surface-elevated hover:bg-surface border-border-custom text-text-sub hover:text-text-main"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-black ${
                            isSelected ? "bg-indigo-500 border-indigo-500 text-white" : "border-neutral-400"
                          }`}>
                            {isSelected && "✓"}
                          </div>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Budget preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-sub">Preferred Min Budget (₹)</label>
                    <input
                      type="number"
                      value={preferredBudgetMin}
                      onChange={(e) => setPreferredBudgetMin(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-sub">Preferred Max Budget (₹)</label>
                    <input
                      type="number"
                      value={preferredBudgetMax}
                      onChange={(e) => setPreferredBudgetMax(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Work mode */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-sub">Preferred Work Mode</label>
                  <select
                    value={preferredWorkMode}
                    onChange={(e) => setPreferredWorkMode(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">Select Mode</option>
                    <option value="REMOTE">Remote Only</option>
                    <option value="ONSITE">Onsite Shoots</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                {/* Preferred locations */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-sub">Preferred Cities / Locations</label>
                  <input
                    type="text"
                    value={preferredLocations}
                    onChange={(e) => setPreferredLocations(e.target.value)}
                    placeholder="e.g. Mumbai, Bangalore, Remote"
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                  <p className="text-[10px] text-text-muted">Enter location names, comma-separated.</p>
                </div>

                {/* Open to travel/remote toggle */}
                <div className="flex items-center justify-between gap-6 p-4 bg-surface-elevated border border-border-custom rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs text-text-main">Open to Remote Opportunities</h4>
                    <p className="text-[10px] text-text-muted mt-1">
                      Check this if you accept editing, motion design, or remote project scopes.
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setOpenToRemote(!openToRemote)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      openToRemote ? "bg-indigo-500" : "bg-neutral-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        openToRemote ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border-custom/50">
                <button
                  type="submit"
                  disabled={savingWork}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  {savingWork ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Preferences</span>
                </button>
                {workSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                    <Check className="w-4 h-4" />
                    Work preferences updated!
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB 6: VERIFICATION STATUS */}
          {activeTab === "verification" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Verification Status</h3>
                <p className="text-xs text-text-muted mt-1">Monitor your professional badges and legal document uploads.</p>
              </div>

              <div className="p-4 bg-surface-elevated border border-border-custom rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-sub">Identity Trust Badge</span>
                  <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                    verificationStatus === "VERIFIED"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      : "bg-primary/10 border-primary/30 text-primary"
                  }`}>
                    {getVerificationLabel(verificationStatus)}
                  </span>
                </div>
                
                <p className="text-xs text-text-sub leading-relaxed">
                  Verified creators receive the **Identity Verified** badge, ranking higher in customer search results and directory lists.
                </p>

                <div className="pt-2">
                  <Link
                    href="/freelancer/verification"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <span>Manage Verification Document Uploads</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PAYOUT SETTINGS */}
          {activeTab === "payout" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Payout Settings</h3>
                <p className="text-xs text-text-muted mt-1">Configure your billing payout destination routing.</p>
              </div>

              <div className="p-4 bg-surface-elevated border border-border-custom rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-sub">Razorpay Beneficiary Status</span>
                  <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                    payoutStatus === "VERIFIED"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      : "bg-primary/10 border-primary/30 text-primary"
                  }`}>
                    {payoutStatus}
                  </span>
                </div>

                <p className="text-xs text-text-sub leading-relaxed">
                  To receive direct bank payouts automatically upon completing bookings, connect your Razorpay Route bank account / VPA details.
                </p>

                <div className="pt-2">
                  <Link
                    href="/freelancer/earnings"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <span>Manage Payout Settings & Earnings</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AVAILABILITY CALENDAR */}
          {activeTab === "availability" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Availability Settings</h3>
                <p className="text-xs text-text-muted mt-1">Manage weekly slots and calendar busy override states.</p>
              </div>

              <div className="p-4 bg-surface-elevated border border-border-custom rounded-2xl space-y-4">
                <p className="text-xs text-text-sub leading-relaxed">
                  Configure your weekday availability schedules and add specific date busy overrides to prevent scheduling conflicts.
                </p>

                <div className="pt-2">
                  <Link
                    href="/freelancer/availability"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <span>Open Availability Scheduling Calendar</span>
                    <Calendar className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: ACCOUNT MANAGEMENT */}
          {activeTab === "management" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Account Management</h3>
                <p className="text-xs text-text-muted mt-1">Deactivate or sign out from your active workspace session.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-elevated border border-border-custom rounded-2xl gap-6">
                  <div>
                    <h4 className="font-bold text-xs text-text-main">Sign Out</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">End your current session credentials safely.</p>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      router.push("/login");
                    }}
                    className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text-sub hover:text-text-main border border-border-custom text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>

                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-rose-500">Deactivate Creator Account</h4>
                      <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                        Deactivating hides your directory listing and services. It does not delete past billing invoices or legal transaction records. Deactivation requires a separate support verification check.
                      </p>
                    </div>
                  </div>

                  {showDeactivateConfirm ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleDeactivate}
                        disabled={deactivating}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        {deactivating ? "Deactivating..." : "Confirm Deactivate"}
                      </button>
                      <button
                        onClick={() => setShowDeactivateConfirm(false)}
                        className="px-4 py-2 bg-surface-elevated border border-border-custom text-text-sub hover:text-text-main text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeactivateConfirm(true)}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Deactivate Account
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </Container>
  );
}
