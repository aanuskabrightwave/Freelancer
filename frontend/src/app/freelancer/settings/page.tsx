"use client";

import React from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import NotificationPreferencesForm from "@/components/notifications/NotificationPreferencesForm";

export default function FreelancerSettingsPage() {
  return (
    <Container className="py-8">
      <div className="space-y-6">
        <PageHeader
          title="Creator settings"
          description="Manage your professional preferences, communication channels, and transaction alerts."
        />
        <div className="space-y-2">
          <h3 className="font-bold text-base text-white">Notification Preferences</h3>
          <p className="text-xs text-white/40">Choose which marketplace events send you push notifications and email updates.</p>
        </div>
        <NotificationPreferencesForm />
      </div>
    </Container>
  );
}
