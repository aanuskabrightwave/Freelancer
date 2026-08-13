"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/ui/Container";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col flex-grow bg-slate-950 py-12 px-4 text-slate-100">
      <Container size="md">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h1 className="text-3xl font-extrabold text-white">
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">Platform Control & Analytics</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-red-400 uppercase">System Status</span>
              <h3 className="font-bold text-lg text-white">All Systems Nominal</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Database, authentication, and file storage APIs are running normally.
              </p>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-red-400 uppercase">Active Admin</span>
              <h3 className="font-bold text-lg text-white">{user?.full_name || "Administrator"}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Email: <span className="font-mono text-slate-200">{user?.email}</span><br />
                Role: <span className="font-mono text-slate-200">{user?.role}</span>
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-red-400 uppercase">Management Settings</span>
              <h3 className="font-bold text-lg text-white">Administrative Access</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Platform configurations, transaction audit, and user bans are currently restricted.
              </p>
            </div>
          </div>

          <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-xs text-red-400">
            <strong>Admin dashboard placeholder:</strong> Full moderator analytics, dispute resolution, and commission settings will be developed in later phases.
          </div>
        </div>
      </Container>
    </div>
  );
}
