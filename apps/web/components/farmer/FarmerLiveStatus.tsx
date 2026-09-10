"use client";

import React, { useState, useEffect } from "react";
import { Clock, MapPin, CheckCircle, AlertTriangle, RefreshCw, Calendar, ArrowRight, XCircle } from "lucide-react";
import { Booking, DemoUser } from "@/lib/types";
import { api } from "@/lib/api";
import { StatusBadge } from "../ui/StatusBadge";

interface FarmerLiveStatusProps {
  currentUser: DemoUser;
  onNavigateToBooking: () => void;
}

export const FarmerLiveStatus: React.FC<FarmerLiveStatusProps> = ({
  currentUser,
  onNavigateToBooking,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getFarmerBookings(currentUser.id);
      setBookings(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000); // Polling every 6s for dynamic ETA
    return () => clearInterval(interval);
  }, [currentUser]);

  // Find active booking
  const activeBooking = bookings.find((b) =>
    ["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING", "QUALITY_CHECK"].includes(b.status)
  ) || bookings[0];

  const handleCancel = async (bookingId: string) => {
    if (confirm("Are you sure you want to cancel this booking? Planned capacity will be released for other farmers.")) {
      setActionLoading(true);
      try {
        await api.cancelBooking(bookingId, "Farmer cancelled appointment");
        await loadData();
      } catch (err: any) {
        alert(err.message || "Failed to cancel");
      } finally {
        setActionLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-agro-700" />
        Loading your live procurement queue and status...
      </div>
    );
  }

  if (!activeBooking) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-surface-border text-center shadow-xs">
        <div className="w-12 h-12 bg-agro-50 text-agro-700 rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Procurement Appointments</h2>
        <p className="text-sm text-gray-600 mb-6">
          You do not have any active appointments scheduled. Book a slot to coordinate your crop delivery with minimal waiting time.
        </p>
        <button
          onClick={onNavigateToBooking}
          className="bg-agro-800 hover:bg-agro-900 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-sm"
        >
          + Book Procurement Appointment
        </button>
      </div>
    );
  }

  const steps = [
    { key: "CONFIRMED", label: "Booked" },
    { key: "ARRIVED", label: "Arrived at Gate" },
    { key: "WAITING", label: "In Fair Queue" },
    { key: "WEIGHING", label: "Scale Weighing" },
    { key: "QUALITY_CHECK", label: "Quality Check" },
    { key: "COMPLETED", label: "Procured" },
  ];

  const currentStepIdx = steps.findIndex((s) => {
    if (activeBooking.status === "COMPLETED") return true;
    return s.key === activeBooking.status;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Live Status Hero Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-surface-border shadow-xs relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-gray-500">{activeBooking.booking_number}</span>
              <StatusBadge status={activeBooking.status} />
            </div>
            <h1 className="text-2xl font-black text-gray-950 font-serif">
              {activeBooking.commodity_name} Procurement
            </h1>
            <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-agro-700" />
              <span>{activeBooking.centre_name}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Expected Volume</span>
            <span className="text-2xl font-black text-agro-900">{activeBooking.expected_quantity_q} q</span>
            <span className="text-xs text-gray-500 block">({(activeBooking.expected_quantity_q / 10).toFixed(1)} tonnes)</span>
          </div>
        </div>

        {/* Dynamic ETA and Queue Position Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          <div className="bg-agro-50/80 rounded-2xl p-5 border border-agro-200/80">
            <span className="text-xs font-bold text-agro-900 uppercase tracking-wider block mb-1">
              Fair Queue Position
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-agro-950">
                {activeBooking.queue_position ? `#${activeBooking.queue_position}` : "Scheduled"}
              </span>
              <span className="text-xs font-semibold text-agro-700">in physical sequence</span>
            </div>
            <p className="text-[11px] text-agro-800 mt-2 leading-relaxed">
              Queue is strict & fair: Determined by scheduled window and verified gate arrival. Staff cannot reorder.
            </p>
          </div>

          <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200/80">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1">
              Dynamic Estimated Wait (ETA)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-950">
                ~{activeBooking.estimated_wait_min ?? 15} min
              </span>
              <span className="text-xs font-semibold text-amber-800">
                ({activeBooking.eta_at ? new Date(activeBooking.eta_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "On Time"})
              </span>
            </div>
            <p className="text-[11px] text-amber-900 mt-2 leading-relaxed">
              Recalculated dynamically as preceding farmers finish weighing and processing.
            </p>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="pt-2 pb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-4">
            Procurement Lifecycle Progress
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.key} className="text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1.5 text-xs font-bold border transition ${
                      isPast
                        ? "bg-agro-800 text-white border-agro-800"
                        : isCurrent
                        ? "bg-grain-500 text-agro-950 border-grain-600 ring-4 ring-grain-100 font-extrabold animate-pulse"
                        : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`text-[11px] font-semibold block leading-tight ${isCurrent ? "text-agro-950 font-bold" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Guidance */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <div>
            <strong>Operational Procedure:</strong> When you arrive at {activeBooking.centre_name}, present your booking number (<span className="font-mono font-bold text-gray-900">{activeBooking.booking_number}</span>) to the gate officer. Once checked in, your status updates to <span className="font-bold text-purple-700">ARRIVED</span> and ETA synchronizes automatically.
          </div>
        </div>

        {/* Actions */}
        {activeBooking.status === "CONFIRMED" && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={() => handleCancel(activeBooking.id)}
              disabled={actionLoading}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 px-3 py-2 rounded-lg transition"
            >
              Cancel Appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
