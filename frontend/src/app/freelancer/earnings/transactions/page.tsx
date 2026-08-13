"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { paymentService, LedgerEntryResponse } from "@/services/payment.service";

export default function FreelancerTransactionsHistoryPage() {
  const [transactions, setTransactions] = useState<LedgerEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentService.getFreelancerTransactions()
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to retrieve ledger entries.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Loading transaction history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Ledger Audits & Transactions</h1>
            <p className="text-sm text-slate-400 mt-1">Review complete historical credits, payouts debits, and adjustments logs.</p>
          </div>
          <Link href="/freelancer/earnings" className="text-xs uppercase tracking-widest font-black text-slate-400 hover:text-indigo-400 flex items-center gap-2 group transition">
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

        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-555">No ledger transactions found.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xxs uppercase tracking-widest text-slate-400 font-black bg-slate-950/40">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6">Entry Type</th>
                    <th className="py-4 px-6">Clearance State</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-850/30 transition text-sm">
                      <td className="py-5 px-6 text-slate-400 text-xs font-mono">
                        {new Date(tx.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-5 px-6 font-semibold text-slate-200">
                        {tx.description}
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[10px] uppercase font-mono bg-slate-800 text-slate-350 py-1 px-2 rounded-md font-bold border border-slate-700/50">
                          {tx.entry_type}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`text-[9px] font-black uppercase font-mono tracking-widest py-0.5 px-2.5 rounded-md border ${
                          tx.status === "AVAILABLE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : tx.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-5 px-6 text-right font-black font-mono text-base ${
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
