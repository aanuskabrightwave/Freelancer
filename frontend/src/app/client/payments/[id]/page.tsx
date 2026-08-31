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
      <div className="min-h-screen bg-background flex flex-col justify-center items-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-bold animate-pulse text-text-sub">Fetching receipt invoice...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
        <div className="max-w-md w-full bg-surface-elevated border border-border-custom rounded-3xl p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-text-main mb-2">Receipt Error</h2>
          <p className="text-text-sub text-xs mb-6">{error || "Payment record not found."}</p>
          <Link href="/client/payments" className="inline-block bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold py-2.5 px-6 rounded-full transition duration-200 cursor-pointer">
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col items-center py-12 px-6 font-sans print:bg-white print:text-slate-900">
      <div className="max-w-3xl w-full">
        {/* Navigation & Actions */}
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link href="/client/payments" className="text-xs uppercase tracking-widest font-bold text-text-sub hover:text-primary flex items-center gap-2 group transition cursor-pointer">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Receipts
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold bg-primary hover:bg-primary-hover text-text-on-dark py-2 px-5 rounded-full transition shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a1 1 0 011-1h6a1 1 0 011 1v9M9 7h6" />
            </svg>
            Print Receipt
          </button>
        </div>

        {/* Receipt Container */}
        <div className="bg-surface-elevated border border-border-custom rounded-3xl overflow-hidden shadow-sm p-8 md:p-12 print:border-none print:bg-white print:p-0">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-border-custom/50 pb-8 mb-8 print:border-slate-200">
            <div>
              <span className="text-xl font-bold text-primary uppercase tracking-wider block">
                Creative Marketplace
              </span>
              <p className="text-xs text-text-sub mt-1 print:text-text-muted">Premium Professional Escrow Services</p>
            </div>
            <div className="text-left md:text-right font-mono">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Payment Receipt</h2>
              <p className="text-lg font-bold text-text-main mt-0.5 print:text-slate-900">{payment.payment_number}</p>
              <p className="text-xxs text-text-muted mt-1 print:text-text-muted">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-border-custom/50 pb-8 mb-8 print:border-slate-200">
            <div>
              <h4 className="text-xxs uppercase tracking-widest font-bold text-text-muted mb-2">Billed To (Client)</h4>
              <p className="font-bold text-text-main print:text-slate-900">{payment.client?.full_name}</p>
              <p className="text-xs text-text-sub mt-0.5 print:text-text-muted">{payment.client?.email}</p>
            </div>
            <div className="text-left md:text-right">
              <h4 className="text-xxs uppercase tracking-widest font-bold text-text-muted mb-2">Fulfilled By (Freelancer)</h4>
              <p className="font-bold text-text-main print:text-slate-900">{payment.freelancer_profile?.user?.full_name}</p>
              <p className="text-xs text-text-sub mt-0.5 print:text-text-muted">Professional Studio Member</p>
            </div>
          </div>

          {/* Service Line Items */}
          <div className="mb-8">
            <h4 className="text-xxs uppercase tracking-widest font-bold text-text-muted mb-4">Invoice Line Items</h4>
            <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden print:border-slate-200 print:bg-slate-50">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border-custom/50 text-xxs font-bold uppercase tracking-widest text-text-sub print:border-slate-200 bg-surface">
                    <th className="py-3.5 px-5">Description</th>
                    <th className="py-3.5 px-5">Quantity</th>
                    <th className="py-3.5 px-5 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-xs text-text-main font-medium">
                    <td className="py-4 px-5">
                      <p className="font-bold text-text-main print:text-slate-900">Creative Production & Licensing Agreement</p>
                      <p className="text-xxs text-text-sub mt-0.5 print:text-text-muted">Booking reference code attached</p>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs">1</td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-text-main print:text-slate-900">
                      ₹{Number(payment.gross_amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Table Grid */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 bg-surface border border-border-custom rounded-2xl p-6 print:border-slate-200 print:bg-slate-50 print:text-slate-900">
            <div>
              <h4 className="text-xxs uppercase tracking-widest font-bold text-text-muted mb-2">Gateways Information</h4>
              <div className="space-y-1 text-xs font-medium">
                <p className="text-text-sub print:text-text-muted">Provider: <span className="font-bold font-mono text-text-main print:text-slate-900">{payment.provider}</span></p>
                {payment.provider_payment_id && (
                  <p className="text-text-sub print:text-text-muted">ID: <span className="font-bold font-mono text-text-main print:text-slate-900">{payment.provider_payment_id}</span></p>
                )}
                <p className="text-text-sub print:text-text-muted">Status: <span className="font-bold text-success font-mono">CAPTURED</span></p>
              </div>
            </div>
            <div className="w-full md:w-64 text-right space-y-2.5 font-mono text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal Due:</span>
                <span className="font-bold text-text-main print:text-slate-900">₹{Number(payment.gross_amount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Commission & Tax:</span>
                <span className="font-bold text-text-main print:text-slate-900">₹0.00</span>
              </div>
              <div className="flex justify-between text-base border-t border-border-custom/50 pt-3 font-sans print:border-slate-200">
                <span className="font-bold text-text-sub print:text-text-muted">Total Paid:</span>
                <span className="font-bold text-primary text-lg print:text-primary">₹{Number(payment.gross_amount).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-center text-text-muted mt-10 select-none leading-relaxed print:text-text-muted">
            This is a system generated statement receipt confirmation of payments processed securely through Razorpay. 
            No physical signature is required. Thank you for booking with Creative Marketplace.
          </p>
        </div>
      </div>
    </div>
  );
}
