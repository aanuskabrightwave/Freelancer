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
      <div className="min-h-screen bg-background flex flex-col justify-center items-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-bold animate-pulse text-text-sub">Loading transaction logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main font-sans">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-custom/50 pb-6">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Billing</span>
            <h1 className="text-3xl font-semibold tracking-tight text-text-main">Payments & Receipts</h1>
            <p className="text-xs text-text-sub mt-1">Review your payments history and download invoices.</p>
          </div>
          <Link href="/client/dashboard" className="text-xs uppercase tracking-widest font-bold text-text-sub hover:text-primary flex items-center gap-2 group transition cursor-pointer">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold py-4 px-4 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {payments.length === 0 ? (
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-surface text-text-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border-custom">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="font-bold text-base text-text-main mb-1">No transaction records</h3>
            <p className="text-text-sub text-xs max-w-sm mx-auto mb-6 leading-relaxed">
              You haven't completed any bookings payments on the marketplace yet.
            </p>
          </div>
        ) : (
          <div className="bg-surface-elevated border border-border-custom rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom/50 text-[10px] uppercase tracking-widest text-text-sub font-bold bg-surface">
                    <th className="py-4 px-6">Payment Number</th>
                    <th className="py-4 px-6">Service Title</th>
                    <th className="py-4 px-6">Gross Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Paid On</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/30">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-surface/50 transition text-xs text-text-main font-medium">
                      <td className="py-5 px-6 font-mono text-xs font-bold text-text-main">
                        {pay.payment_number}
                      </td>
                      <td className="py-5 px-6 text-text-main">
                        Wedding Highlights / Project Booking
                      </td>
                      <td className="py-5 px-6 font-bold text-primary font-mono">
                        ₹{Number(pay.gross_amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-5 px-6">
                        <span className={`text-[9px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full border ${
                          pay.status === "CAPTURED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : pay.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-705 border-amber-200"
                        }`}>
                          {pay.status === "CAPTURED" ? "PAID" : pay.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-text-sub text-xs">
                        {pay.paid_at ? new Date(pay.paid_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }) : "-"}
                      </td>
                      <td className="py-5 px-6 text-right font-bold">
                        <Link
                          href={`/client/payments/${pay.id}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-surface hover:bg-surface-elevated border border-border-custom text-text-sub hover:text-text-main font-bold py-2 px-4 rounded-full transition duration-150 cursor-pointer"
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
