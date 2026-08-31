"use client";

import React, { useEffect, useState } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { notificationService, NotificationPreferencesData } from "@/services/notification.service";

export default function NotificationPreferencesForm() {
  const [prefs, setPrefs] = useState<Partial<NotificationPreferencesData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await notificationService.getPreferences();
        setPrefs(res);
      } catch (err) {
        console.error("Failed to load preferences", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const handleToggle = (key: keyof NotificationPreferencesData) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await notificationService.updatePreferences(prefs);
      setPrefs(res);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-xs">Loading preferences...</p>
      </div>
    );
  }

  const preferenceItems = [
    {
      key: "in_app_enabled" as keyof NotificationPreferencesData,
      title: "In-App Notifications",
      description: "Receive real-time alerts inside the application"
    },
    {
      key: "email_enabled" as keyof NotificationPreferencesData,
      title: "Email Notifications",
      description: "Receive transactional emails for marketplace actions"
    },
    {
      key: "project_updates_email" as keyof NotificationPreferencesData,
      title: "Projects & Proposals",
      description: "Emails when proposals are submitted, shortlisted, or accepted"
    },
    {
      key: "booking_updates_email" as keyof NotificationPreferencesData,
      title: "Bookings",
      description: "Emails for booking requests, confirmations, or reschedules"
    },
    {
      key: "message_email" as keyof NotificationPreferencesData,
      title: "Messages",
      description: "Emails for new workspace conversation messages"
    },
    {
      key: "payment_email" as keyof NotificationPreferencesData,
      title: "Payments",
      description: "Emails confirming payment success, gateway captures, or refunds"
    },
    {
      key: "delivery_email" as keyof NotificationPreferencesData,
      title: "Deliveries & Revisions",
      description: "Emails when files are delivered or revisions are requested"
    },
    {
      key: "review_email" as keyof NotificationPreferencesData,
      title: "Reviews",
      description: "Emails when clients rate your service or leave review replies"
    },
    {
      key: "payout_email" as keyof NotificationPreferencesData,
      title: "Payouts",
      description: "Emails when payout transfers are completed by the gateway"
    }
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl bg-surface-elevated border border-border-custom p-6 rounded-2xl">
      <div className="space-y-4">
        {preferenceItems.map(item => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-6 p-4 bg-surface border border-border-custom rounded-xl hover:bg-surface-elevated transition-all"
          >
            <div>
              <h4 className="font-bold text-sm text-text-main">{item.title}</h4>
              <p className="text-xs text-text-muted mt-1">{item.description}</p>
            </div>
            
            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => handleToggle(item.key)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                prefs[item.key] ? "bg-primary-hover" : "bg-neutral-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  prefs[item.key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 border-t border-border-custom pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-hover hover:bg-primary disabled:bg-primary-hover text-text-main text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </button>

        {success && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <Check className="w-4 h-4" />
            Preferences saved successfully!
          </span>
        )}
      </div>
    </form>
  );
}
