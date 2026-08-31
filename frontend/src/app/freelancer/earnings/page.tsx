"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { paymentService, EarningSummaryResponse, LedgerEntryResponse } from "@/services/payment.service";

export default function FreelancerEarningsSummaryPage() {
  const [summary, setSummary] = useState<EarningSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchEarningsData = async () => {
    try {
      const sumData = await paymentService.getFreelancerEarnings();
      setSummary(sumData);
      const txData = await paymentService.getFreelancerTransactions();
      // Keep only top 5 transactions for preview
      setTransactions(txData.slice(0, 5));
      setLoading(false);
    } catch (err) {
      setError("Failed to retrieve earnings ledger records.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const handleRequestPayout = async () => {
    if (!summary || summary.available <= 0) return;
    setPayoutLoading(true);
    setPayoutError(null);
    setPayoutSuccess(false);

    try {
      await paymentService.requestPayout();
      setPayoutSuccess(true);
      await fetchEarningsData();
    } catch (err: any) {
      setPayoutError(err.response?.data?.detail || "Payout request failed. Verify your payout bank account setup.");
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-sub py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Loading earnings data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main font-sans selection:bg-primary-hover selection:text-text-main">
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Earnings & Balances</h1>
            <p className="text-sm text-text-sub mt-1">Track payments credits, platform commission calculations, and payouts transfers.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/freelancer/dashboard" className="text-xs uppercase tracking-widest font-black text-text-sub hover:text-primary flex items-center gap-2 group transition">
              <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-4 px-4 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* Earning Metrics Grid */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 w-8 h-8 bg-primary-hover rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" />
                </svg>
              </div>
              <h3 className="text-xxs font-black uppercase tracking-widest text-text-sub">Total Earned</h3>
              <p className="text-2xl font-black text-text-main mt-2">₹{Number(summary.total_earned).toLocaleString("en-IN")}</p>
              <p className="text-xxs text-text-muted font-mono mt-1">Platform Commission Deducted</p>
            </div>

            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xxs font-black uppercase tracking-widest text-text-sub">Pending Clearance</h3>
              <p className="text-2xl font-black text-amber-400 mt-2">₹{Number(summary.pending).toLocaleString("en-IN")}</p>
              <p className="text-xxs text-text-muted font-mono mt-1">Held under payouts clearance hold</p>
            </div>

            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-surface to-surface-elevated">
              <div className="absolute top-4 right-4 w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xxs font-black uppercase tracking-widest text-text-sub">Available for Payout</h3>
              <p className="text-2xl font-black text-emerald-400 mt-2">₹{Number(summary.available).toLocaleString("en-IN")}</p>
              <p className="text-xxs text-text-muted font-mono mt-1">Cleared balance transfer eligibility</p>
            </div>

            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xxs font-black uppercase tracking-widest text-text-sub">Paid Out</h3>
              <p className="text-2xl font-black text-primary mt-2">₹{Number(summary.paid_out).toLocaleString("en-IN")}</p>
              <p className="text-xxs text-text-muted font-mono mt-1">Transferred directly to bank</p>
            </div>
          </div>
        )}

        {/* Payout actions block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Action Trigger Card */}
          <div className="lg:col-span-2 bg-surface border border-border-custom rounded-3xl p-8 flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="text-lg font-black mb-2">Request Payout Transfer</h3>
              <p className="text-sm text-text-sub leading-relaxed mb-6">
                Move your cleared earnings available balance directly into your configured bank account. 
                Payouts requests are processed securely using Razorpay Route transfers.
              </p>

              {payoutError && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>{payoutError}</p>
                </div>
              )}

              {payoutSuccess && (
                <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-3 animate-pulse">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Payout request submitted and processed successfully!</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleRequestPayout}
                disabled={payoutLoading || !summary || summary.available <= 0}
                className="bg-primary hover:bg-primary-hover disabled:bg-surface-elevated text-text-main disabled:text-text-muted font-black text-xs py-3.5 px-6 rounded-2xl transition duration-200 shadow-lg shadow-primary active:scale-[0.99]"
              >
                {payoutLoading ? "Processing Transfer Request..." : "Payout Cleared Balance (Auto Transfer)"}
              </button>
              <Link
                href="/freelancer/earnings/payouts"
                className="bg-background hover:bg-surface-elevated border border-border-custom text-text-sub hover:text-text-main font-bold text-xs py-3.5 px-6 rounded-2xl transition duration-200 text-center"
              >
                View Payout Logs
              </Link>
            </div>
          </div>

          {/* Payout Onboarding Card */}
          <div className="bg-surface border border-border-custom rounded-3xl p-8 flex flex-col justify-between shadow-xl">
            <div>
              <div className="w-12 h-12 bg-primary-hover text-primary border border-primary/20 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-black mb-2">Payout Setup</h3>
              <p className="text-sm text-text-sub leading-relaxed mb-6">
                Set up your default bank account metadata credentials to capture earnings distributions.
              </p>
            </div>

            <Link
              href="/freelancer/earnings/payout-account"
              className="bg-background hover:bg-surface-elevated border border-border-custom text-primary hover:text-primary-hover font-black text-xs py-3.5 px-6 rounded-2xl transition duration-200 text-center"
            >
              Configure Account
            </Link>
          </div>
        </div>

        {/* Transactions log preview */}
        <div className="bg-surface border border-border-custom rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-border-custom flex items-center justify-between">
            <h3 className="font-black text-lg">Recent Transactions</h3>
            <Link href="/freelancer/earnings/transactions" className="text-xs font-black text-primary hover:text-primary-hover transition uppercase tracking-wider">
              All Transactions &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-12">No recent ledger transactions detected.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-xxs uppercase tracking-widest text-text-sub font-black bg-background">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-elevated transition text-sm">
                      <td className="py-4 px-6 text-text-sub text-xs">
                        {new Date(tx.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short"
                        })}
                      </td>
                      <td className="py-4 px-6 font-medium text-text-main">
                        {tx.description}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-text-sub uppercase">
                        {tx.entry_type}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[9px] font-black uppercase font-mono tracking-widest py-0.5 px-2 rounded-md border ${
                          tx.status === "AVAILABLE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : tx.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-right font-black font-mono ${
                        Number(tx.amount) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {Number(tx.amount) >= 0 ? "+" : ""}
                        ₹{Number(tx.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
