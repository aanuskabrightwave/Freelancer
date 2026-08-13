"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ClientPaymentCancelledPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>

        {/* Warning/Cancelled Icon */}
        <div className="w-20 h-20 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20 shadow-xl shadow-orange-500/5">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-black mb-2 tracking-tight">Payment Cancelled</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          The payment checkout attempt was cancelled or could not be completed. Your card has not been charged.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={`/client/bookings/${id}/payment`}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-3.5 px-6 rounded-2xl transition duration-200 shadow-lg shadow-indigo-600/10 active:scale-[0.99]"
          >
            Retry Checkout
          </Link>
          <Link
            href={`/client/bookings/${id}`}
            className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs py-3.5 px-6 rounded-2xl transition duration-200"
          >
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}
