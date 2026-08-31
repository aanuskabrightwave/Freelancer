"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { paymentService, PayoutResponse } from "@/services/payment.service";

export default function FreelancerPayoutsListPage() {
  const [payouts, setPayouts] = useState<PayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentService.getFreelancerPayouts()
      .then((data) => {
        setPayouts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to retrieve payouts log history.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-sub py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Loading payouts logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main font-sans selection:bg-primary-hover selection:text-text-main">
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Payout Transfers Logs</h1>
            <p className="text-sm text-text-sub mt-1">Review transfer reference codes and capture status.</p>
          </div>
          <Link href="/freelancer/earnings" className="text-xs uppercase tracking-widest font-black text-text-sub hover:text-primary flex items-center gap-2 group transition">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Earnings Summary
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-4 px-4 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            {payouts.length === 0 ? (
              <div className="p-12 text-center text-text-muted">No payouts transfer history logged yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-xxs uppercase tracking-widest text-text-sub font-black bg-background">
                    <th className="py-4 px-6">Payout ID</th>
                    <th className="py-4 px-6">Razorpay Transfer ID</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Processed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {payouts.map((po) => (
                    <tr key={po.id} className="hover:bg-surface-elevated transition text-sm">
                      <td className="py-5 px-6 font-mono text-xs font-bold text-text-sub">
                        {po.payout_number}
                      </td>
                      <td className="py-5 px-6 font-mono text-xs text-text-sub">
                        {po.provider_transfer_id || "-"}
                      </td>
                      <td className="py-5 px-6 font-bold text-primary font-mono">
                        ₹{Number(po.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-5 px-6">
                        <span className={`text-[10px] font-black uppercase font-mono tracking-widest py-1 px-2.5 rounded-md border ${
                          po.status === "PROCESSED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : po.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-text-sub text-xs font-mono">
                        {po.processed_at ? new Date(po.processed_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }) : "-"}
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
