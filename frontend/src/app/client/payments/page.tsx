"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { paymentService, PaymentResponse } from "@/services/payment.service";

export default function ClientPaymentsHistoryPage() {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentService.getClientPayments()
      .then((data) => {
        setPayments(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to retrieve payments history log.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Loading transaction logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Payments & Receipts</h1>
            <p className="text-sm text-slate-400 mt-1">Review your payments history and download invoices.</p>
          </div>
          <Link href="/client/dashboard" className="text-xs uppercase tracking-widest font-black text-slate-400 hover:text-indigo-400 flex items-center gap-2 group transition">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
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

        {payments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-xl">
            <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-850">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg mb-1">No transaction records</h3>
            <p className="text-slate-555 text-sm max-w-sm mx-auto mb-6">
              You haven't completed any bookings payments on the marketplace yet.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xxs uppercase tracking-widest text-slate-400 font-black bg-slate-950/40">
                    <th className="py-4 px-6">Payment Number</th>
                    <th className="py-4 px-6">Service Title</th>
                    <th className="py-4 px-6">Gross Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Paid On</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-850/30 transition text-sm">
                      <td className="py-5 px-6 font-mono text-xs font-bold text-slate-300">
                        {pay.payment_number}
                      </td>
                      <td className="py-5 px-6 font-medium">
                        Wedding Highlights / Project Booking
                      </td>
                      <td className="py-5 px-6 font-bold text-indigo-400 font-mono">
                        ₹{Number(pay.gross_amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-5 px-6">
                        <span className={`text-[10px] font-black uppercase font-mono tracking-widest py-1 px-2.5 rounded-md border ${
                          pay.status === "CAPTURED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : pay.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {pay.status === "CAPTURED" ? "PAID" : pay.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-slate-400 text-xs">
                        {pay.paid_at ? new Date(pay.paid_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }) : "-"}
                      </td>
                      <td className="py-5 px-6 text-right">
                        <Link
                          href={`/client/payments/${pay.id}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-xl transition duration-150"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Receipt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
