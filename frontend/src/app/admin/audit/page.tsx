"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AuditLog {
  id: number;
  admin_user_id: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  description: string;
  metadata_json?: any;
  ip_address?: string;
  created_at: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;

      const res = await api.get<AuditLog[]>("/admin/audit-logs", { params });
      setLogs(res);
    } catch (err: any) {
      setError(err.message || "Failed to load admin audit ledger logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-text-main">
      {/* Header */}
      <div className="border-b border-border-custom pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-text-main">Administrative Audit Trails</h1>
          <p className="text-text-sub text-sm mt-1">Audit log tracking administrative actions and security adjustments.</p>
        </div>
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-surface border border-border-custom text-text-main text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="USER_SUSPENDED">User Suspended</option>
            <option value="USER_REACTIVATED">User Reactivated</option>
            <option value="VERIFICATION_APPROVED">Verification Approved</option>
            <option value="VERIFICATION_REJECTED">Verification Rejected</option>
            <option value="DISPUTE_ASSIGNED">Dispute Assigned</option>
            <option value="DISPUTE_RESOLVED">Dispute Resolved</option>
            <option value="PLATFORM_SETTING_CHANGED">Setting Changed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-text-sub">Loading audit log trails...</div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 text-red-400 p-4 rounded-xl">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-text-muted bg-surface border border-border-custom rounded-xl">
          No audit logs recorded for this action type.
        </div>
      ) : (
        <div className="bg-surface border border-border-custom rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-border-custom text-xs font-bold text-text-sub uppercase">
                  <th className="p-4 w-1/5">Timestamp</th>
                  <th className="p-4 w-1/5">Action Type</th>
                  <th className="p-4 w-2/5">Description</th>
                  <th className="p-4 w-1/5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm text-text-sub">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-mono text-xs text-text-sub">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.action.includes("SUSPENDED") || log.action.includes("REJECTED") ? "bg-red-950/50 border border-red-800/80 text-red-400" :
                        log.action.includes("APPROVED") || log.action.includes("RESOLVED") ? "bg-emerald-950/50 border border-emerald-800/80 text-emerald-400" :
                        "bg-blue-950/50 border border-blue-800/80 text-blue-400"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-text-main font-medium">{log.description}</td>
                    <td className="p-4 font-mono text-xs text-text-sub">{log.ip_address || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
