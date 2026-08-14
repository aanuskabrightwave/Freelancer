"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface SettingItem {
  id: number;
  key: string;
  value: string;
  value_type: string;
  description?: string;
  is_public: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks editing state per config key
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  async function fetchSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SettingItem[]>("/admin/settings");
      setSettings(res);
      // Initialize edit form values
      const initialVals: Record<string, string> = {};
      res.forEach((item) => {
        initialVals[item.key] = item.value;
      });
      setEditingValues(initialVals);
    } catch (err: any) {
      setError(err.message || "Failed to load platform settings configurations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleValueChange = (key: string, value: string) => {
    setEditingValues({
      ...editingValues,
      [key]: value,
    });
  };

  const handleSaveSetting = async (key: string) => {
    const val = editingValues[key];
    setUpdatingKey(key);
    try {
      await api.patch(`/admin/settings/${key}`, { value: val });
      alert(`Setting '${key}' updated successfully.`);
      fetchSettings();
    } catch (err: any) {
      alert(err.message || "Failed to update platform setting.");
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div className="p-8 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white">Central Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure platform commission fees, payouts holds, and system limitations.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading system settings...</div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 text-red-400 p-4 rounded-xl">{error}</div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">
                  <th className="p-4 w-1/3">Configuration Key</th>
                  <th className="p-4 w-1/3">Description</th>
                  <th className="p-4 w-1/4">Value</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
                {settings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-white text-xs">{item.key}</td>
                    <td className="p-4 text-slate-400 text-xs leading-relaxed">{item.description}</td>
                    <td className="p-4">
                      {item.value_type === "BOOLEAN" ? (
                        <select
                          value={editingValues[item.key] || ""}
                          onChange={(e) => handleValueChange(item.key, e.target.value)}
                          className="bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none w-full font-mono"
                        >
                          <option value="true">TRUE</option>
                          <option value="false">FALSE</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editingValues[item.key] || ""}
                          onChange={(e) => handleValueChange(item.key, e.target.value)}
                          className="bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none w-full font-mono"
                        />
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSaveSetting(item.key)}
                        disabled={updatingKey === item.key || editingValues[item.key] === item.value}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        {updatingKey === item.key ? "Saving..." : "Save"}
                      </button>
                    </td>
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
