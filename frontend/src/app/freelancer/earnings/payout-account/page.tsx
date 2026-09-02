"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { paymentService } from "@/services/payment.service";

export default function PayoutAccountSetupPage() {
  const router = useRouter();

  const [accountId, setAccountId] = useState("");
  const [holderName, setHolderName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await paymentService.configurePayoutAccount(accountId, holderName);
      setSuccess(true);
      setTimeout(() => {
        router.push("/freelancer/earnings");
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to configure payout beneficiary details.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-transparent text-text-main flex flex-col justify-center items-center py-12 px-4 font-sans selection:bg-primary-hover selection:text-text-main">
      <div className="max-w-md w-full bg-surface/80 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 text-left">
          <Link href="/freelancer/earnings" className="text-xs uppercase tracking-widest font-black text-text-sub hover:text-primary flex items-center gap-2 group transition">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Earnings
          </Link>
        </div>

        <h1 className="text-2xl font-black mb-2 tracking-tight">Configure Payout Account</h1>
        <p className="text-text-sub text-sm mb-6 leading-relaxed">
          Link your Razorpay Route account credentials to receive marketplace payouts.
        </p>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-center gap-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-3 animate-pulse">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Payout account successfully configured! Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xxs font-black uppercase tracking-widest text-text-sub mb-2">
              Razorpay Connected Account ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. acc_Nxxxxxxxxx"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-background border border-border-custom focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-sm text-text-main placeholder-text-muted transition outline-none"
            />
          </div>

          <div>
            <label className="block text-xxs font-black uppercase tracking-widest text-text-sub mb-2">
              Account Holder Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Freelancer"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="w-full bg-background border border-border-custom focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-sm text-text-main placeholder-text-muted transition outline-none"
            />
          </div>

          <div className="bg-background border border-border-custom p-4 rounded-xl">
            <h4 className="text-xxs font-black uppercase tracking-widest text-text-sub mb-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payment Protection Policy
            </h4>
            <p className="text-[10px] text-text-muted leading-normal">
              We never store sensitive bank credentials (IFSC/Passwords) on our database servers. 
              Actual fund routing transfers are managed by Razorpay's verified distribution infrastructure.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !accountId}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/20 text-text-main font-black text-sm py-3.5 px-6 rounded-2xl transition duration-200 shadow-lg shadow-primary active:scale-[0.99]"
          >
            {submitting ? "Linking Payout Account..." : "Save Payout Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
