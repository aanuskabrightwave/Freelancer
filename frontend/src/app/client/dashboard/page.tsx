"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/ui/Container";
import Link from "next/link";
import { bookingService } from "@/services/booking.service";

export default function ClientDashboardPage() {
  const { user } = useAuth();
  
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const bookings = await bookingService.getClientBookings();
        
        let active = 0;
        let completed = 0;
        let spent = 0;

        bookings.forEach(b => {
          if (["REQUESTED", "CONFIRMED", "IN_PROGRESS", "DELIVERY_PENDING", "RESCHEDULE_REQUESTED"].includes(b.status)) {
            active += 1;
          } else if (b.status === "COMPLETED") {
            completed += 1;
            spent += parseFloat(b.agreed_amount || b.price || "0");
          }
        });

        setActiveCount(active);
        setCompletedCount(completed);
        setTotalSpent(spent);
      } catch (err) {
        console.error("Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadStats();
    }
  }, [user]);

  return (
    <div className="flex flex-col flex-grow bg-slate-950 py-12 px-4 text-slate-100 font-sans">
      <Container size="md">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
          
          <div className="border-b border-slate-850 pb-4">
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
              Welcome back, {user?.full_name || "Client"}
            </h1>
            <p className="text-slate-400 text-xs mt-1">Client Workspace & Activity Metrics</p>
          </div>
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">Active Hirings</span>
              <h3 className="font-black text-2xl text-white">
                {loading ? "..." : activeCount}
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Ongoing shoot schedules or pending confirmations.
              </p>
              <Link href="/client/bookings" className="text-xs text-indigo-400 font-bold block pt-2 hover:underline">
                Manage Bookings →
              </Link>
            </div>
            
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">Completed Deliveries</span>
              <h3 className="font-black text-2xl text-white">
                {loading ? "..." : completedCount}
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Projects completed and deliverables released.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider block">Total Spent</span>
              <h3 className="font-black text-2xl text-indigo-400">
                {loading ? "..." : `₹${totalSpent.toLocaleString()}`}
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Accumulated payments cleared to creatives.
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Profile Summary */}
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Account Information</h4>
              <div className="space-y-2 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500 font-medium block">Verification status:</span>
                  <span className="text-slate-200 font-bold">{user?.is_verified ? "✅ Email Verified" : "⚠️ Pending"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Registered Email:</span>
                  <span className="font-mono text-slate-200">{user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Contact Number:</span>
                  <span className="font-mono text-slate-200">{user?.phone}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2">Hire Top Talents</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Browse physical wedding locations photogs, video editors, colorists, and virtual designers in our creative marketplace.
                </p>
              </div>
              <Link
                href="/services"
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition text-center"
              >
                Browse Services
              </Link>
            </div>
          </div>

        </div>
      </Container>
    </div>
  );
}
