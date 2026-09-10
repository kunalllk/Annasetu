"use client";

import React, { useState, useEffect } from "react";
import { Wheat, Calendar, Clock, MapPin, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";
import { Booking, DemoUser, TransactionRecord } from "@/lib/types";
import { api } from "@/lib/api";
import { StatusBadge } from "../ui/StatusBadge";

interface FarmerOverviewProps {
  currentUser: DemoUser;
  onNavigate: (tab: string) => void;
  onOpenVerifyModal: () => void;
}

export const FarmerOverview: React.FC<FarmerOverviewProps> = ({
  currentUser,
  onNavigate,
  onOpenVerifyModal,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getFarmerBookings(currentUser.id),
      api.getFarmerTransactions(currentUser.id)
    ])
      .then(([bRes, tRes]) => {
        setBookings(bRes);
        setTransactions(tRes);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const activeBooking = bookings.find((b) =>
    ["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING", "QUALITY_CHECK"].includes(b.status)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-agro-900 to-agro-800 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-agro-700/80 text-grain-300 border border-agro-600 mb-2">
            Rabi Season 2026 • Government Procurement
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-tight">
            Namaste, {currentUser.display_name}
          </h1>
          <p className="text-sm text-agro-200 mt-1">
            {currentUser.village ? `${currentUser.village}${currentUser.state ? `, ${currentUser.state}` : ""}` : "National Agricultural Division, India"} • Masked ID: XXXX-XXXX-4821
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("book")}
              className="bg-grain-500 hover:bg-grain-400 text-agro-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Wheat className="w-4 h-4" />
              <span>Book Produce Delivery</span>
            </button>
            <button
              onClick={onOpenVerifyModal}
              className="bg-agro-800/80 hover:bg-agro-700 text-agro-100 border border-agro-600 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
            >
              Verify Identity (eKYC)
            </button>
          </div>
        </div>

        {/* Decorative background wheat icon */}
        <Wheat className="absolute right-[-20px] bottom-[-30px] w-64 h-64 text-white/5 pointer-events-none" />
      </div>

      {/* Active Appointment Hero / Live Queue Card */}
      {activeBooking ? (
        <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Appointment</span>
              <StatusBadge status={activeBooking.status} />
            </div>
            <button
              onClick={() => onNavigate("live_status")}
              className="text-xs font-bold text-agro-800 hover:text-agro-950 flex items-center gap-1"
            >
              <span>View Live Queue & Timeline</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Procurement Centre</span>
              <span className="text-base font-bold text-gray-900">{activeBooking.centre_name}</span>
              <span className="text-xs text-gray-500 block">{activeBooking.booking_date}</span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Allocated Slot</span>
              <span className="text-base font-black text-agro-900">{activeBooking.slot_start} – {activeBooking.slot_end}</span>
              <span className="text-xs text-gray-500 block">{activeBooking.expected_quantity_q} q {activeBooking.commodity_name}</span>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">Queue Status</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-amber-950">
                  {activeBooking.queue_position ? `Queue #${activeBooking.queue_position}` : "Checked-in"}
                </span>
                <span className="text-xs text-amber-800 font-semibold">
                  (~{activeBooking.estimated_wait_min ?? 20}m wait)
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700">No active appointment today</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Book a slot using AnnaSetu’s Smart Engine to reserve your delivery window without long queues.
          </p>
          <button
            onClick={() => onNavigate("book")}
            className="mt-3 text-xs font-bold text-agro-800 hover:text-agro-950 bg-agro-50 px-4 py-2 rounded-xl border border-agro-200"
          >
            Schedule Produce Delivery →
          </button>
        </div>
      )}

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Weighing / Transaction Card */}
        <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-agro-700" />
                Latest Transaction Transparency
              </h3>
              <button
                onClick={() => onNavigate("transactions")}
                className="text-xs font-semibold text-agro-700 hover:underline"
              >
                All Records
              </button>
            </div>

            {transactions.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-surface-muted rounded-xl border border-surface-border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produce:</span>
                    <span className="font-bold text-gray-900">{transactions[0].commodity_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expected vs Actual Weighed:</span>
                    <span className="font-bold">
                      {transactions[0].expected_quantity_q} q →{" "}
                      <strong className="text-agro-900">{transactions[0].actual_quantity_q ?? "Pending"} q</strong>
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-500">Payment Status:</span>
                    <StatusBadge status={transactions[0].payment_status} />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Transaction truth is verified on physical weighbridge scale.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No completed transactions recorded yet.</p>
            )}
          </div>

          <button
            onClick={() => onNavigate("transactions")}
            className="mt-4 w-full text-center text-xs font-semibold text-agro-900 bg-agro-50 hover:bg-agro-100 py-2 rounded-xl transition border border-agro-200"
          >
            Review Weighed Receipts & Confirmations
          </button>
        </div>

        {/* Operational Policy & Fairness Guarantee */}
        <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900">AnnaSetu Farmer Guarantee</h3>
          <ul className="text-xs text-gray-600 space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-agro-700 shrink-0 mt-0.5" />
              <span>
                <strong>Farmer Chooses:</strong> The Smart Engine suggests best fit centres and slots, but you retain the right to pick any open slot.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-agro-700 shrink-0 mt-0.5" />
              <span>
                <strong>Fair Queue Order:</strong> Queue order is strictly based on slot & arrival timing. Neither algorithms nor staff can push anyone ahead.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-agro-700 shrink-0 mt-0.5" />
              <span>
                <strong>Grievance Recourse:</strong> Discrepancies between expected and weighed weight can be contested with formal audit protection.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
