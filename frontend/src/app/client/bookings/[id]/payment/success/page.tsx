"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { bookingService } from "@/services/booking.service";

export default function ClientPaymentSuccessPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    bookingService.getBookingDetails(id as string)
      .then((data) => setBooking(data))
      .catch(() => {});
  }, [id]);

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col justify-center items-center py-12 px-4 font-sans selection:bg-primary-hover selection:text-text-main">
      <div className="max-w-md w-full bg-surface border border-border-custom rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Confetti Background gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary-hover rounded-full blur-3xl"></div>

        {/* Success Icon */}
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-xl shadow-emerald-500/5 animate-bounce">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-black mb-2 tracking-tight">Payment Successful!</h1>
        <p className="text-text-sub text-sm mb-6 leading-relaxed">
          Your booking is now financially secured. The freelancer has been notified and can now proceed with starting the project.
        </p>

        {booking && (
          <div className="bg-background border border-border-custom rounded-2xl p-5 mb-8 text-left space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted font-mono uppercase">Booking Number</span>
              <span className="font-bold font-mono text-text-sub">#{booking.booking_number}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted font-mono uppercase">Total Paid</span>
              <span className="font-bold text-primary font-mono">₹{Number(booking.agreed_amount).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted font-mono uppercase">Status</span>
              <span className="text-[10px] uppercase font-mono font-black tracking-widest bg-emerald-500/10 text-emerald-400 py-0.5 px-2 rounded-md border border-emerald-500/20">
                Financially Secured
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href={`/client/bookings/${id}/workspace`}
            className="w-full bg-primary hover:bg-primary-hover text-text-main font-black text-sm py-3.5 px-6 rounded-2xl transition duration-200 shadow-lg shadow-primary active:scale-[0.99]"
          >
            Open Project Workspace
          </Link>
          <Link
            href={`/client/bookings/${id}`}
            className="w-full bg-surface-elevated hover:bg-surface-elevated border border-border-custom text-text-sub hover:text-text-main font-bold text-xs py-3.5 px-6 rounded-2xl transition duration-200"
          >
            View Booking Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
