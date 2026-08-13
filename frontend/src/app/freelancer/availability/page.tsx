"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { availabilityService, WeeklyScheduleItem } from "@/services/availability.service";

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY"
];

export default function FreelancerAvailabilityPage() {
  const { user } = useAuth();
  
  const [weeklySchedules, setWeeklySchedules] = useState<Record<string, { is_available: boolean; start_time: string; end_time: string }>>({});
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Override Form states
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideType, setOverrideType] = useState<"AVAILABLE" | "UNAVAILABLE" | "BLOCKED">("UNAVAILABLE");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("18:00");
  const [overrideNote, setOverrideNote] = useState("");

  const [weeklySaving, setWeeklySaving] = useState(false);
  const [overrideAdding, setOverrideAdding] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await availabilityService.getFreelancerAvailability();
      
      // Map weekly schedules
      const schedMap: Record<string, { is_available: boolean; start_time: string; end_time: string }> = {};
      DAYS_OF_WEEK.forEach(day => {
        schedMap[day] = { is_available: false, start_time: "09:00", end_time: "18:00" };
      });

      data.weekly_schedule?.forEach((sched: any) => {
        const startStr = sched.start_time.substring(0, 5);
        const endStr = sched.end_time.substring(0, 5);
        schedMap[sched.day_of_week] = {
          is_available: sched.is_available,
          start_time: startStr,
          end_time: endStr
        };
      });

      setWeeklySchedules(schedMap);
      setOverrides(data.overrides || []);
    } catch (err) {
      setErrorMsg("Failed to retrieve your availability details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleWeeklyFieldChange = (day: string, field: "is_available" | "start_time" | "end_time", value: any) => {
    setWeeklySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSaveWeeklySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setWeeklySaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload: WeeklyScheduleItem[] = DAYS_OF_WEEK.map(day => ({
        day_of_week: day,
        is_available: weeklySchedules[day].is_available,
        start_time: weeklySchedules[day].start_time,
        end_time: weeklySchedules[day].end_time
      }));

      await availabilityService.updateWeeklyAvailability(payload);
      setSuccessMsg("Weekly working schedule updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg("Failed to save weekly working hours.");
    } finally {
      setWeeklySaving(false);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) {
      alert("Please select a date.");
      return;
    }

    try {
      setOverrideAdding(true);
      setErrorMsg(null);

      const payload = {
        date: overrideDate,
        availability_type: overrideType,
        start_time: overrideType === "AVAILABLE" ? overrideStart : undefined,
        end_time: overrideType === "AVAILABLE" ? overrideEnd : undefined,
        note: overrideNote
      };

      await availabilityService.createOverride(payload);
      setOverrideDate("");
      setOverrideNote("");
      
      // Reload overrides
      const data = await availabilityService.getFreelancerAvailability();
      setOverrides(data.overrides || []);
      setSuccessMsg("Availability override added.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to add override date.");
    } finally {
      setOverrideAdding(false);
    }
  };

  const handleDeleteOverride = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this schedule override?")) {
      return;
    }
    try {
      setErrorMsg(null);
      await availabilityService.deleteOverride(id);
      setOverrides(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      setErrorMsg("Failed to remove override.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <h1 className="text-xl md:text-2xl font-black text-white">Fulfillment & Availability Settings</h1>
          <p className="text-slate-400 text-xs mt-1">Configure your weekly standard availability hours and add override holidays or custom working slots.</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-4 text-xs">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Weekly Schedule Editor */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <h2 className="text-base font-black text-white">Standard Weekly Schedule</h2>
            <p className="text-xs text-slate-400">Set the hours during which clients are allowed to book on-site or hybrid listings.</p>

            <form onSubmit={handleSaveWeeklySchedule} className="space-y-4 pt-4">
              {DAYS_OF_WEEK.map(day => {
                const dayData = weeklySchedules[day] || { is_available: false, start_time: "09:00", end_time: "18:00" };
                return (
                  <div key={day} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-850">
                    <div className="flex items-center gap-3 w-32">
                      <input
                        type="checkbox"
                        checked={dayData.is_available}
                        onChange={(e) => handleWeeklyFieldChange(day, "is_available", e.target.checked)}
                        className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-xs font-bold text-slate-200 capitalize">{day.toLowerCase()}</span>
                    </div>

                    {dayData.is_available ? (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={dayData.start_time}
                          onChange={(e) => handleWeeklyFieldChange(day, "start_time", e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none"
                        />
                        <span className="text-slate-500 font-medium">to</span>
                        <input
                          type="time"
                          value={dayData.end_time}
                          onChange={(e) => handleWeeklyFieldChange(day, "end_time", e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        Not available
                      </span>
                    )}
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={weeklySaving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white text-xs font-bold rounded-xl transition"
              >
                {weeklySaving ? "Saving..." : "Save Weekly Schedule"}
              </button>
            </form>
          </div>

          {/* Calendar Override dates */}
          <div className="space-y-8">
            
            {/* Add Date Override */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white">Add Date Override</h3>
              <p className="text-[11px] text-slate-400">Block custom dates as unavailable or override with custom hours.</p>

              <form onSubmit={handleAddOverride} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Select Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Availability Type</label>
                  <select
                    value={overrideType}
                    onChange={(e) => setOverrideType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none"
                  >
                    <option value="UNAVAILABLE">Unavailable / Holiday</option>
                    <option value="BLOCKED">Blocked / Private</option>
                    <option value="AVAILABLE">Available with Custom Hours</option>
                  </select>
                </div>

                {overrideType === "AVAILABLE" && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={overrideStart}
                        onChange={(e) => setOverrideStart(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">End Time</label>
                      <input
                        type="time"
                        value={overrideEnd}
                        onChange={(e) => setOverrideEnd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Wedding shoot block"
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={overrideAdding}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl transition"
                >
                  {overrideAdding ? "Adding..." : "Add Override"}
                </button>
              </form>
            </div>

            {/* List overrides */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white">Active Date Overrides</h3>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-850 pr-2 space-y-3">
                {overrides.map(override => (
                  <div key={override.id} className="pt-3 flex justify-between items-start text-xs gap-3">
                    <div>
                      <span className="font-bold text-slate-100 block">
                        {new Date(override.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-black block mt-0.5">
                        {override.availability_type} 
                        {override.availability_type === "AVAILABLE" && ` (${override.start_time.substring(0,5)} - ${override.end_time.substring(0,5)})`}
                      </span>
                      {override.note && (
                        <p className="text-[10px] text-slate-400 mt-1 italic">Note: {override.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(override.id)}
                      className="text-rose-500 hover:text-rose-400 font-bold text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))}

                {overrides.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No custom date overrides configured.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
