"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { bookingService } from "@/services/booking.service";
import { paymentService } from "@/services/payment.service";

export default function ClientPaymentCheckoutPage() {
  const { id } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    bookingService.getBookingDetails(id as string)
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to retrieve booking information.");
        setLoading(false);
      });
  }, [id]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async (simulate: boolean = false) => {
    if (!booking) return;
    setPaying(true);
    setError(null);

    try {
      // 1. Create order
      const order = await paymentService.createPaymentOrder(booking.id);

      if (simulate) {
        // Dev Sandbox check bypass
        const verifyData = {
          razorpay_order_id: order.provider_order_id,
          razorpay_payment_id: `pay_simulated_${Math.random().toString(36).substring(4)}`,
          razorpay_signature: "mock_signature_bypass_for_pytest"
        };
        await paymentService.verifyPayment(booking.id, verifyData);
        router.push(`/client/bookings/${booking.id}/payment/success`);
        return;
      }

      // Load SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK checkout script failed to load.");
      }

      const options = {
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Creative Marketplace",
        description: `Booking #${booking.booking_number}`,
        order_id: order.provider_order_id,
        handler: async (response: any) => {
          try {
            setPaying(true);
            const verifyData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };
            await paymentService.verifyPayment(booking.id, verifyData);
            router.push(`/client/bookings/${booking.id}/payment/success`);
          } catch (e: any) {
            setError(e.response?.data?.detail || "Payment verification failed. Please contact support.");
            setPaying(false);
          }
        },
        prefill: {
          name: booking.client?.full_name || "",
          email: booking.client?.email || "",
        },
        theme: {
          color: "#6366f1"
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setError(response.error?.description || "Payment failed. Please try again.");
        setPaying(false);
      });
      rzp.open();

    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to initiate payment transaction.");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Retrieving checkout invoice...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-100 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Checkout Error</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Link href="/client/bookings" className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-6 rounded-xl transition duration-200">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-12 px-4 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-xl w-full">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center justify-between">
          <Link href={`/client/bookings/${booking.id}`} className="text-xs uppercase tracking-widest font-black text-slate-400 hover:text-indigo-400 flex items-center gap-2 group transition">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Booking
          </Link>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 py-1 px-3 rounded-full font-mono uppercase">
            Secured Checkout
          </span>
        </div>

        {/* Card Body */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-8 border-b border-slate-800 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.2),transparent)]"></div>
            <h1 className="text-2xl font-black tracking-tight mb-1">Financially Secure Booking</h1>
            <p className="text-xs text-indigo-200 uppercase tracking-widest font-bold font-mono">Invoice #{booking.booking_number}</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3.5 px-4 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            {/* Summary List */}
            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-start border-b border-slate-800/60 pb-4">
                <div>
                  <h3 className="font-semibold text-slate-200">Freelancer Specialist</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Beneficiary</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-100">{booking.freelancer_profile?.user?.full_name}</p>
                  <p className="text-xs text-slate-400">Professional Studio Partner</p>
                </div>
              </div>

              <div className="flex justify-between items-start border-b border-slate-800/60 pb-4">
                <div>
                  <h3 className="font-semibold text-slate-200">Chosen Service Type</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{booking.title}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 py-1 px-2.5 rounded-md font-bold">
                    {booking.booking_type}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-start border-b border-slate-800/60 pb-4">
                <div>
                  <h3 className="font-semibold text-slate-200">Package Level</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Details</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-400">{booking.service_package?.name || "Project Agreement"}</p>
                  {booking.service_package?.delivery_time_days && (
                    <p className="text-xs text-slate-400">{booking.service_package.delivery_time_days} Days Delivery Schedule</p>
                  )}
                </div>
              </div>

              {/* Total Due */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Total Price Due</h4>
                  <p className="text-xxs text-slate-500 font-mono mt-0.5">Commission & Gateway Inclusive</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-indigo-400 tracking-tight">₹{Number(booking.agreed_amount).toLocaleString("en-IN")}</p>
                  <p className="text-xxs text-slate-400 uppercase font-mono font-black tracking-widest">INR Currency</p>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="space-y-3">
              <button
                onClick={() => handlePay(false)}
                disabled={paying}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800 text-white font-black text-sm py-4 px-6 rounded-2xl transition duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.99]"
              >
                {paying ? "Processing Order Payment..." : `Secure Checkout - Pay ₹${Number(booking.agreed_amount).toLocaleString("en-IN")}`}
              </button>

              <button
                onClick={() => handlePay(true)}
                disabled={paying}
                className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs py-3 px-6 rounded-2xl transition duration-200"
              >
                Simulate Sandbox Checkout Success (Test Bypass)
              </button>
            </div>
            
            <p className="text-[10px] text-center text-slate-500 mt-6 select-none leading-relaxed">
              Your payments are processed securely. The funds will be secured until you review the final delivery. 
              By checking out, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
