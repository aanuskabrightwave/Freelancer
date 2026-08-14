"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface SummaryData {
  users: { total: number; clients: number; freelancers: number };
  marketplace: { services: number; projects: number; bookings: number; completed_bookings: number };
  financial: { gross_volume: string; platform_revenue: string; pending_payouts: string };
  operations: { pending_verifications: number; open_disputes: number; reported_reviews: number };
}

interface FinancialTrendItem {
  date: string;
  gvm: string;
  revenue: string;
}

interface AnalyticsData {
  registrations: Array<{ date: string; count: number }>;
  bookings: Array<{ date: string; count: number }>;
  financials: FinancialTrendItem[];
  completions: Record<string, number>;
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const sumRes = await api.get<SummaryData>("/admin/dashboard");
        const analyticRes = await api.get<AnalyticsData>(`/admin/analytics?days=${days}`);
        setSummary(sumRes);
        setAnalytics(analyticRes);
      } catch (err: any) {
        setError(err.message || "Failed to load admin dashboard statistics.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center flex-grow bg-slate-950 text-slate-100">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-800 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-800 rounded col-span-2"></div>
                <div className="h-2 bg-slate-800 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-slate-950 text-slate-100">
        <div className="bg-red-950/20 border border-red-900 text-red-400 p-4 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(parseFloat(val || "0"));
  };

  // Find max value in financials to scale visual bars
  const maxGvm = analytics?.financials.reduce((max, item) => Math.max(max, parseFloat(item.gvm)), 1) || 1;

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time marketplace activity metrics and financials ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Time Filter:</span>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: GVM */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Volume (GVM)</span>
            <div className="bg-blue-950/40 text-blue-400 p-2 rounded-lg text-sm">
              ₹
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{summary ? formatCurrency(summary.financial.gross_volume) : "₹0"}</h2>
            <p className="text-xs text-slate-400 mt-1">Total transactions processed</p>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Revenue</span>
            <div className="bg-emerald-950/40 text-emerald-400 p-2 rounded-lg text-sm">
              %
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{summary ? formatCurrency(summary.financial.platform_revenue) : "₹0"}</h2>
            <p className="text-xs text-slate-400 mt-1">Commission fee earnings share</p>
          </div>
        </div>

        {/* Card 3: Users */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
            <div className="bg-purple-950/40 text-purple-400 p-2 rounded-lg text-sm">
              👥
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{summary?.users.total || 0}</h2>
            <div className="flex gap-2 text-xs text-slate-400 mt-1">
              <span>{summary?.users.clients || 0} Clients</span>
              <span>•</span>
              <span>{summary?.users.freelancers || 0} Freelancers</span>
            </div>
          </div>
        </div>

        {/* Card 4: Operations Queue */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Moderation Tasks</span>
            <div className="bg-red-950/40 text-red-400 p-2 rounded-lg text-sm">
              ⚠️
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              {(summary?.operations.pending_verifications || 0) + (summary?.operations.open_disputes || 0)}
            </h2>
            <div className="flex gap-2 text-xs text-slate-400 mt-1">
              <span className="text-yellow-400 font-semibold">{summary?.operations.pending_verifications || 0} Verif.</span>
              <span>•</span>
              <span className="text-red-400 font-semibold">{summary?.operations.open_disputes || 0} Disputes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Action Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Marketplace Transactions Trend</h3>
            <p className="text-xs text-slate-400 mt-1">Timeline representation of gross payment volumes over selected time window.</p>
          </div>

          {/* Bar Chart Component */}
          <div className="space-y-3">
            {analytics && analytics.financials.length > 0 ? (
              <div className="space-y-4">
                {analytics.financials.slice(-6).map((item, index) => {
                  const percent = Math.min(100, Math.max(8, (parseFloat(item.gvm) / maxGvm) * 100));
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>{item.date}</span>
                        <span className="font-semibold text-slate-200">GVM: {formatCurrency(item.gvm)} | Comm: {formatCurrency(item.revenue)}</span>
                      </div>
                      <div className="h-6 w-full bg-slate-950 rounded-md overflow-hidden relative border border-slate-800">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 rounded-r-sm"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex justify-center items-center text-slate-400 text-sm bg-slate-950 border border-slate-800 rounded-xl">
                No financial data recorded during this date range.
              </div>
            )}
          </div>
        </div>

        {/* Operational Queues Summary */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Resolution & Queue Actions</h3>
            <p className="text-xs text-slate-400 mt-1">Pending critical platform review items.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Identity Verifications</h4>
                <p className="text-xs text-slate-400 mt-0.5">Creators awaiting ID documents checks</p>
              </div>
              <div className="bg-yellow-950/50 border border-yellow-800/80 text-yellow-400 font-bold px-3 py-1 rounded-full text-xs">
                {summary?.operations.pending_verifications || 0}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Active Dispute Tickets</h4>
                <p className="text-xs text-slate-400 mt-0.5">Escalated booking claims awaiting resolution</p>
              </div>
              <div className="bg-red-950/50 border border-red-800/80 text-red-400 font-bold px-3 py-1 rounded-full text-xs">
                {summary?.operations.open_disputes || 0}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Reported Reviews</h4>
                <p className="text-xs text-slate-400 mt-0.5">Inappropriate feedback claims</p>
              </div>
              <div className="bg-purple-950/50 border border-purple-800/80 text-purple-400 font-bold px-3 py-1 rounded-full text-xs">
                {summary?.operations.reported_reviews || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
