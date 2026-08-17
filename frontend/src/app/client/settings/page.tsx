"use client";

import React from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import NotificationPreferencesForm from "@/components/notifications/NotificationPreferencesForm";

export default function ClientSettingsPage() {
  return (
    <Container className="py-8">
      <div className="space-y-6">
        <PageHeader
          title="Account Settings"
          description="Configure your notifications preferences, email alerts, and subscription triggers."
        />
        <div className="space-y-2">
          <h3 className="font-bold text-base text-text-main">Notification Preferences</h3>
          <p className="text-xs text-text-muted">Select which events you would like to receive notifications and email updates for.</p>
        </div>
        <NotificationPreferencesForm />
      </div>
    </Container>
  );
}
