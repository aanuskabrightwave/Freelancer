"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import NotificationPreferencesForm from "@/components/notifications/NotificationPreferencesForm";
import { settingsService } from "@/services/settings.service";
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
  MessageSquare
} from "lucide-react";

type SettingsTab = "account" | "security" | "notifications" | "privacy" | "communication" | "management";

export default function ClientSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  
  // Account Information form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState("");

  // Security / Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Account Management state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await settingsService.getSettings();
        setFullName(res.full_name || "");
        setEmail(res.email || "");
        setPhone(res.phone || "");
      } catch (err: any) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadSettings();
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
      setAccountError(err.response?.data?.detail || "Failed to update account information.");
    } finally {
      setSavingAccount(false);
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
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs">Loading Settings...</p>
        </div>
      </Container>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "account", label: "Account Info", icon: UserIcon },
    { id: "security", label: "Password & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy options", icon: Shield },
    { id: "communication", label: "Communications", icon: MessageSquare },
    { id: "management", label: "Account Management", icon: LogOut },
  ];

  return (
    <Container className="py-8 font-sans max-w-6xl">
      <PageHeader
        title="Settings"
        description="Configure your client account preferences, communication triggers, and payment verification parameters."
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
                    ? "bg-primary-hover text-text-main shadow-md shadow-primary"
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
            <form onSubmit={handleAccountUpdate} className="space-y-6 max-w-xl">
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
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary transition"
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-hover hover:bg-primary disabled:bg-primary-hover text-text-main text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
                {accountSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                    <Check className="w-4 h-4" />
                    Account settings updated!
                  </span>
                )}
              </div>
            </form>
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
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-sub">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary transition"
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
                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border-custom/50">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-hover hover:bg-primary disabled:bg-primary-hover text-text-main text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
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

          {/* TAB 4: PRIVACY */}
          {activeTab === "privacy" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Privacy Options</h3>
                <p className="text-xs text-text-muted mt-1">Configure your personal information visibility toggles.</p>
              </div>

              <div className="p-4 bg-surface-elevated border border-border-custom rounded-2xl space-y-3">
                <h4 className="font-bold text-xs text-text-main">Client Visibility Status</h4>
                <p className="text-xs text-text-sub leading-relaxed">
                  As a registered Client, your public discovery remains private. Only Freelancers with whom you share an active contract, booking, or proposal application can view your workspace name.
                </p>
                <div className="flex items-center gap-2 pt-2 text-[10px] text-text-muted">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Secure platform isolation rules are active.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COMMUNICATION PREFERENCES */}
          {activeTab === "communication" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-base text-text-main">Communication Preferences</h3>
                <p className="text-xs text-text-muted mt-1">Configure messaging guidelines and connection rules.</p>
              </div>

              <div className="p-4 bg-surface-elevated border border-border-custom rounded-2xl space-y-3">
                <h4 className="font-bold text-xs text-text-main">Workspace Communication Bounds</h4>
                <p className="text-xs text-text-sub leading-relaxed">
                  To prevent transaction spam, freelancers are only permitted to message you once you have shortlisted/accepted their proposal or generated a direct booking request. 
                </p>
                <div className="flex items-center gap-2 pt-2 text-[10px] text-primary font-bold">
                  <MessageSquare className="w-4 h-4" />
                  <span>Spam prevention filters are enabled.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ACCOUNT MANAGEMENT */}
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
                      <h4 className="font-bold text-xs text-rose-500">Deactivate Client Account</h4>
                      <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                        Deactivating hides your client profile information. It does not delete past booking receipts or legal project tax logs. Deactivation requires a separate data-retention verification workflow.
                      </p>
                    </div>
                  </div>

                  {showDeactivateConfirm ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleDeactivate}
                        disabled={deactivating}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 text-text-main text-xs font-bold rounded-xl transition cursor-pointer"
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
