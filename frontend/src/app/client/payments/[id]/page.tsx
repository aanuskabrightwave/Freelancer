"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { paymentService, PaymentResponse } from "@/services/payment.service";

export default function ClientPaymentReceiptPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    paymentService.getPaymentReceipt(id as string)
      .then((data) => {
        setPayment(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load invoice receipt.");
        setLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Fetching receipt invoice...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-100 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <h2 className="text-xl font-bold mb-2">Receipt Error</h2>
          <p className="text-slate-400 text-sm mb-6">{error || "Payment record not found."}</p>
          <Link href="/client/payments" className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-6 rounded-xl transition duration-200">
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-12 px-4 font-sans selection:bg-indigo-500 selection:text-white print:bg-white print:text-slate-900">
      <div className="max-w-3xl w-full">
        {/* Navigation & Actions */}
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link href="/client/payments" className="text-xs uppercase tracking-widest font-black text-slate-400 hover:text-indigo-400 flex items-center gap-2 group transition">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Receipts
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-black bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-5 rounded-xl transition shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a1 1 0 011-1h6a1 1 0 011 1v9M9 7h6" />
            </svg>
            Print Receipt
          </button>
        </div>

        {/* Receipt Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-8 md:p-12 print:border-none print:bg-white print:p-0">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-800/80 pb-8 mb-8 print:border-slate-200">
            <div>
              <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider print:text-indigo-600">
                Creative Marketplace
              </span>
              <p className="text-xs text-slate-400 mt-1 print:text-slate-500">Premium Professional Escrow Services</p>
            </div>
            <div className="text-left md:text-right font-mono">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Receipt</h2>
              <p className="text-lg font-black text-slate-100 mt-0.5 print:text-slate-900">{payment.payment_number}</p>
              <p className="text-xxs text-slate-550 mt-1 print:text-slate-500">
                Date: {payment.paid_at ? new Date(payment.paid_at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                }) : "-"}
              </p>
            </div>
          </div>

          {/* Client & Freelancer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-800/80 pb-8 mb-8 print:border-slate-200">
            <div>
              <h4 className="text-xxs uppercase tracking-widest font-black text-slate-500 mb-2">Billed To (Client)</h4>
              <p className="font-bold text-slate-200 print:text-slate-900">{payment.client?.full_name}</p>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-500">{payment.client?.email}</p>
            </div>
            <div className="text-left md:text-right">
              <h4 className="text-xxs uppercase tracking-widest font-black text-slate-500 mb-2">Fulfilled By (Freelancer)</h4>
              <p className="font-bold text-slate-200 print:text-slate-900">{payment.freelancer_profile?.user?.full_name}</p>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-500">Professional Studio Member</p>
            </div>
          </div>

          {/* Service Line Items */}
          <div className="mb-8">
            <h4 className="text-xxs uppercase tracking-widest font-black text-slate-500 mb-4">Invoice Line Items</h4>
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden print:border-slate-200 print:bg-slate-50">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xxs font-black uppercase tracking-widest text-slate-400 print:border-slate-200">
                    <th className="py-3.5 px-5">Description</th>
                    <th className="py-3.5 px-5">Quantity</th>
                    <th className="py-3.5 px-5 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-200 print:text-slate-900">Creative Production & Licensing Agreement</p>
                      <p className="text-xxs text-slate-400 mt-0.5 print:text-slate-500">Booking reference code attached</p>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs">1</td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-slate-200 print:text-slate-900">
                      ₹{Number(payment.gross_amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Table Grid */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 print:border-slate-200 print:bg-slate-50 print:text-slate-900">
            <div>
              <h4 className="text-xxs uppercase tracking-widest font-black text-slate-500 mb-2">Gateways Information</h4>
              <div className="space-y-1 text-xs">
                <p className="text-slate-400 print:text-slate-600">Provider: <span className="font-bold font-mono text-slate-200 print:text-slate-900">{payment.provider}</span></p>
                {payment.provider_payment_id && (
                  <p className="text-slate-400 print:text-slate-600">ID: <span className="font-bold font-mono text-slate-200 print:text-slate-900">{payment.provider_payment_id}</span></p>
                )}
                <p className="text-slate-400 print:text-slate-600">Status: <span className="font-black text-emerald-400 font-mono">CAPTURED</span></p>
              </div>
            </div>
            <div className="w-full md:w-64 text-right space-y-2.5 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subtotal Due:</span>
                <span className="font-bold text-slate-300 print:text-slate-900">₹{Number(payment.gross_amount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Commission & Tax:</span>
                <span className="font-bold text-slate-300 print:text-slate-900">₹0.00</span>
              </div>
              <div className="flex justify-between text-base border-t border-slate-800 pt-3 font-sans print:border-slate-200">
                <span className="font-black text-slate-400 print:text-slate-600">Total Paid:</span>
                <span className="font-black text-indigo-400 text-lg print:text-indigo-600">₹{Number(payment.gross_amount).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-center text-slate-500 mt-10 select-none leading-relaxed print:text-slate-500">
            This is a system generated statement receipt confirmation of payments processed securely through Razorpay. 
            No physical signature is required. Thank you for booking with Creative Marketplace.
          </p>
        </div>
      </div>
    </div>
  );
}
