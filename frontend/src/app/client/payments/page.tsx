"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { paymentService, PaymentResponse } from "@/services/payment.service";
import { bookingService } from "@/services/booking.service";
import {
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Inbox
} from "lucide-react";

export default function ClientPaymentsDashboardPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const [bookingsData, paymentsData] = await Promise.all([
        bookingService.getClientBookings(),
        paymentService.getClientPayments()
      ]);
      
      setBookings(bookingsData);
      setPayments(paymentsData);
    } catch (err) {
      setErrorMsg("We couldn't load your payments summary.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Shared Payment Display Helpers (Part 26)
  const getDepositStatus = (b: any) => {
    const payState = b.payment_completion_state;
    if (payState === "DEPOSIT_PAID" || payState === "FULLY_PAID") {
      return { label: "Paid", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
    }
    
    // Check if deposit is due (confirmed but unpaid)
    if (b.status === "CONFIRMED" && payState === "UNPAID") {
      return { label: "Deposit Due", style: "bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold animate-pulse" };
    }
    
    return { label: "Not Yet Due", style: "bg-surface-elevated border-border-custom text-text-muted" };
  };

  const getBalanceStatus = (b: any) => {
    const payState = b.payment_completion_state;
    if (payState === "FULLY_PAID") {
      return { label: "Paid", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
    }
    
    // Balance becomes due once deposit is paid and we are in progress / review work
    if (payState === "DEPOSIT_PAID") {
      // If delivery pending or completed or in progress with a draft, it is due
      if (["DELIVERY_PENDING", "COMPLETED"].includes(b.status)) {
        return { label: "Balance Due", style: "bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold animate-pulse" };
      }
      // If work in progress, it's not yet due until draft is reviewed/submitted
      return { label: "Not Yet Due", style: "bg-surface-elevated border-border-custom text-text-muted" };
    }
    
    return { label: "Not Yet Due", style: "bg-surface-elevated border-border-custom text-text-muted" };
  };

  const getOverallPaymentStatus = (b: any) => {
    const payState = b.payment_completion_state;
    if (payState === "FULLY_PAID") {
      return { label: "Paid in Full", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
    }
    if (payState === "DEPOSIT_PAID") {
      return { label: "Deposit Paid", style: "bg-blue-500/10 border-blue-500/30 text-blue-400" };
    }
    return { label: "Unpaid", style: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
  };

  const getActionConfig = (b: any) => {
    const depStatus = getDepositStatus(b).label;
    const balStatus = getBalanceStatus(b).label;

    if (depStatus === "Deposit Due") {
      return { label: "Pay Deposit", url: `/client/bookings/${b.id}/payment`, enabled: true };
    }
    if (balStatus === "Balance Due") {
      return { label: "Pay Balance", url: `/client/bookings/${b.id}/payment`, enabled: true };
    }
    return { label: "Paid", url: "", enabled: false };
  };

  // Metrics (Part 3)
  const dueBookingsCount = bookings.filter(b => {
    const dep = getDepositStatus(b).label;
    const bal = getBalanceStatus(b).label;
    return dep === "Deposit Due" || bal === "Balance Due";
  }).length;

  const totalPaidSum = payments
    .filter(p => p.status === "CAPTURED")
    .reduce((acc, curr) => acc + Number(curr.gross_amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 md:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="bg-surface border border-border-custom rounded-3xl p-6 h-32 flex flex-col justify-between">
            <div className="w-1/3 h-5 bg-surface-elevated rounded"></div>
            <div className="w-1/2 h-3 bg-surface-elevated rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-surface rounded-2xl border border-border-custom"></div>
            <div className="h-32 bg-surface rounded-2xl border border-border-custom"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">Payments Dashboard</h1>
            <p className="text-text-sub text-xs mt-1">
              Manage deposits, remaining balances and payment history for your bookings.
            </p>
          </div>
          <Link
            href="/client/dashboard"
            className="text-xs uppercase tracking-widest font-bold text-text-sub hover:text-primary flex items-center gap-2 group transition"
          >
            Dashboard →
          </Link>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Summary metrics widgets (Part 3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block">Payments Due</span>
              <span className="text-2xl font-black mt-1 block">{dueBookingsCount} Bookings</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block">Total Paid to Date</span>
              <span className="text-2xl font-black mt-1 block text-emerald-450">₹{totalPaidSum.toLocaleString("en-IN")}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface border border-border-custom rounded-2xl p-5 flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block">Reconciled Transactions</span>
              <span className="text-2xl font-black mt-1 block">{payments.length} Receipts</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Active Bookings Payments (Part 4) */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-6">
          <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Active Booking Balances</h3>
          
          {bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const dep = getDepositStatus(booking);
                const bal = getBalanceStatus(booking);
                const overall = getOverallPaymentStatus(booking);
                const action = getActionConfig(booking);
                const assignedName = booking.freelancer?.full_name || booking.freelancer?.user?.full_name || "Matching In Progress";

                return (
                  <div
                    key={booking.id}
                    className="border border-border-custom/50 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface-elevated/20"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] text-text-muted font-mono font-bold">{booking.booking_number}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${overall.style}`}>
                          {overall.label}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-text-main">{booking.title}</h4>
                      <p className="text-[10px] text-text-sub font-semibold">
                        Assigned Specialist: <span className="text-text-main font-bold">{assignedName}</span>
                      </p>
                    </div>

                    {/* Deposit & Balance grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-[10px] font-semibold border-t lg:border-t-0 lg:border-l border-border-custom/50 pt-4 lg:pt-0 lg:pl-6">
                      <div>
                        <span className="text-text-muted uppercase tracking-wider text-[8px] block">Total Amount</span>
                        <span className="text-text-main font-bold block mt-0.5">₹{Number(booking.agreed_amount).toLocaleString("en-IN")}</span>
                      </div>

                      <div>
                        <span className="text-text-muted uppercase tracking-wider text-[8px] block">Deposit (30%)</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-text-main font-bold">₹{Number(booking.deposit_amount).toLocaleString("en-IN")}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[7px] border font-bold uppercase ${dep.style}`}>{dep.label}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-text-muted uppercase tracking-wider text-[8px] block">Balance (70%)</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-text-main font-bold">₹{Number(booking.remaining_balance).toLocaleString("en-IN")}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[7px] border font-bold uppercase ${bal.style}`}>{bal.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pay CTA */}
                    <div className="shrink-0 flex items-center">
                      {action.enabled ? (
                        <Link
                          href={action.url}
                          className="px-5 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer block text-center w-full lg:w-auto"
                        >
                          {action.label}
                        </Link>
                      ) : (
                        <span className="px-4 py-2 text-text-muted text-[10px] font-bold uppercase tracking-wider border border-border-custom bg-surface-elevated rounded-xl block text-center w-full lg:w-auto">
                          Settled
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-text-muted bg-surface-elevated/20 border border-border-custom/50 rounded-2xl italic">
              No active bookings found.
            </div>
          )}
        </div>

        {/* Reconciled Transaction Receipts logs (Part 21) */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-6">
          <h3 className="text-xs font-black text-text-main uppercase tracking-wider">Transaction History</h3>

          {payments.length > 0 ? (
            <div className="overflow-x-auto border border-border-custom/50 rounded-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-semibold text-text-sub">
                <thead>
                  <tr className="border-b border-border-custom/50 text-[9px] uppercase tracking-widest text-text-muted font-bold bg-surface">
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/30 text-text-main">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-surface-elevated/25 transition">
                      <td className="py-4 px-4 font-mono text-[10px] font-bold text-text-main">{pay.payment_number}</td>
                      <td className="py-4 px-4 font-mono text-[10px] text-text-sub">Booking Details</td>
                      <td className="py-4 px-4 text-primary font-bold">₹{Number(pay.gross_amount).toLocaleString("en-IN")}</td>
                      <td className="py-4 px-4 uppercase font-bold text-[9px] text-text-muted">{pay.provider}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${
                          pay.status === "CAPTURED"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : pay.status === "FAILED"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        }`}>
                          {pay.status === "CAPTURED" ? "PAID" : pay.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-text-muted">
                        {pay.paid_at ? new Date(pay.paid_at).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/client/payments/${pay.id}`}
                          className="inline-flex items-center gap-1 hover:underline text-primary text-[10px] font-bold cursor-pointer"
                        >
                          <span>Receipt</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-text-muted flex flex-col justify-center items-center space-y-3">
              <Inbox className="w-8 h-8 text-text-muted" />
              <div>
                <h4 className="font-bold text-text-main text-[11px]">No payment activity yet</h4>
                <p className="text-[9px] text-text-sub mt-1">Payments will appear here when a booking reaches a payable stage.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
