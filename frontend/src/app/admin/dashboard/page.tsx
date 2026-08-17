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
      <div className="p-8 flex justify-center items-center flex-grow bg-background text-text-main">
        <div className="animate-pulse flex space-x-4 w-full max-w-lg">
          <div className="flex-grow space-y-6 py-1">
            <div className="h-3 bg-surface rounded-full"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-3 bg-surface rounded-full col-span-2"></div>
                <div className="h-3 bg-surface rounded-full col-span-1"></div>
              </div>
              <div className="h-3 bg-surface rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-background text-text-main">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
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
    <div className="p-8 space-y-8 bg-background min-h-screen text-text-main font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-custom pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">Dashboard Overview</h1>
          <p className="text-text-sub text-xs mt-1">Real-time marketplace activity metrics and financials ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-sub font-bold uppercase tracking-wider">Time Filter:</span>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-surface-elevated border border-border-custom text-text-main text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none font-bold"
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
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Gross Volume (GVM)</span>
            <div className="bg-primary/10 text-primary border border-primary/20 p-2 rounded-full text-xs font-bold w-7 h-7 flex items-center justify-center">
              ₹
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-main">{summary ? formatCurrency(summary.financial.gross_volume) : "₹0"}</h2>
            <p className="text-[10px] text-text-muted mt-1 font-medium">Total transactions processed</p>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Platform Revenue</span>
            <div className="bg-success/10 text-success border border-success/20 p-2 rounded-full text-xs font-bold w-7 h-7 flex items-center justify-center">
              %
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-main">{summary ? formatCurrency(summary.financial.platform_revenue) : "₹0"}</h2>
            <p className="text-[10px] text-text-muted mt-1 font-medium">Commission fee earnings share</p>
          </div>
        </div>

        {/* Card 3: Users */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Total Users</span>
            <div className="bg-primary/10 text-primary border border-primary/20 p-2 rounded-full text-xs font-bold w-7 h-7 flex items-center justify-center">
              👥
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-main">{summary?.users.total || 0}</h2>
            <div className="flex gap-2 text-[10px] text-text-muted mt-1 font-medium">
              <span>{summary?.users.clients || 0} Clients</span>
              <span>•</span>
              <span>{summary?.users.freelancers || 0} Freelancers</span>
            </div>
          </div>
        </div>

        {/* Card 4: Operations Queue */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Moderation Tasks</span>
            <div className="bg-rose-50 text-rose-700 border border-rose-200 p-2 rounded-full text-xs font-bold w-7 h-7 flex items-center justify-center">
              ⚠️
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              {(summary?.operations.pending_verifications || 0) + (summary?.operations.open_disputes || 0)}
            </h2>
            <div className="flex gap-2 text-[10px] text-text-muted mt-1 font-medium">
              <span className="text-amber-600 font-semibold">{summary?.operations.pending_verifications || 0} Verif.</span>
              <span>•</span>
              <span className="text-rose-600 font-semibold">{summary?.operations.open_disputes || 0} Disputes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Action Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-text-main">Transactions Trend</h3>
            <p className="text-xs text-text-sub mt-1">Timeline representation of gross payment volumes over selected time window.</p>
          </div>

          {/* Bar Chart Component */}
          <div className="space-y-3">
            {analytics && analytics.financials.length > 0 ? (
              <div className="space-y-4">
                {analytics.financials.slice(-6).map((item, index) => {
                  const percent = Math.min(100, Math.max(8, (parseFloat(item.gvm) / maxGvm) * 100));
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs text-text-sub font-medium">
                        <span>{item.date}</span>
                        <span className="font-semibold text-text-main">GVM: {formatCurrency(item.gvm)} | Comm: {formatCurrency(item.revenue)}</span>
                      </div>
                      <div className="h-6 w-full bg-surface border border-border-custom/50 rounded-full overflow-hidden relative">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-primary transition-all duration-500 rounded-full"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex justify-center items-center text-text-sub text-sm bg-surface border border-border-custom rounded-2xl">
                No financial data recorded during this date range.
              </div>
            )}
          </div>
        </div>

        {/* Operational Queues Summary */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-text-main">Resolution & Queue Actions</h3>
            <p className="text-xs text-text-sub mt-1">Pending critical platform review items.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-surface border border-border-custom/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-main">Identity Verifications</h4>
                <p className="text-xs text-text-sub mt-0.5 font-normal">Creators awaiting ID documents checks</p>
              </div>
              <div className="bg-amber-50 border border-amber-250 text-amber-700 font-bold px-3 py-1 rounded-full text-[10px] tracking-wide">
                {summary?.operations.pending_verifications || 0}
              </div>
            </div>

            <div className="bg-surface border border-border-custom/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-main">Active Dispute Tickets</h4>
                <p className="text-xs text-text-sub mt-0.5 font-normal">Escalated booking claims awaiting resolution</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 text-rose-700 font-bold px-3 py-1 rounded-full text-[10px] tracking-wide">
                {summary?.operations.open_disputes || 0}
              </div>
            </div>

            <div className="bg-surface border border-border-custom/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-main">Reported Reviews</h4>
                <p className="text-xs text-text-sub mt-0.5 font-normal">Inappropriate feedback claims</p>
              </div>
              <div className="bg-primary/10 border border-primary/20 text-primary font-bold px-3 py-1 rounded-full text-[10px] tracking-wide">
                {summary?.operations.reported_reviews || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
