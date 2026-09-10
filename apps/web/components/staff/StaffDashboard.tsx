"use client";

import React, { useState, useEffect } from "react";
import {
  Building2, Users, Scale, Clock, RefreshCw, CheckCircle2,
  AlertTriangle, UserX, ArrowRight, ShieldCheck, Flame, Check
} from "lucide-react";
import { DemoUser, QueueRow, StaffDashboardKPIs } from "@/lib/types";
import { api } from "@/lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { WeighingModal } from "./WeighingModal";
import { QualityCheckModal } from "./QualityCheckModal";
import { SimulationControlPanel } from "./SimulationControlPanel";

interface StaffDashboardProps {
  currentUser: DemoUser;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [kpis, setKpis] = useState<StaffDashboardKPIs | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForWeigh, setSelectedBookingForWeigh] = useState<any | null>(null);
  const [selectedBookingForQuality, setSelectedBookingForQuality] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [kpiRes, queueRes] = await Promise.all([
        api.getStaffDashboard(currentUser),
        api.getStaffQueue(currentUser)
      ]);
      setKpis(kpiRes);
      setQueue(queueRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Polling every 5 seconds per spec
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkArrived = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await api.markArrived(bookingId, "Gate check-in verified by staff", currentUser);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to mark arrived");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkNoShow = async (bookingId: string) => {
    if (confirm("Mark this farmer as NO-SHOW? Note: This marks capacity as POTENTIALLY AVAILABLE for centre consideration. It does NOT automatically assign a walk-in.")) {
      setActionLoading(bookingId);
      try {
        await api.markNoShow(bookingId, "Farmer missed arrival window", currentUser);
        await loadData();
      } catch (err: any) {
        alert(err.message || "Failed to mark no-show");
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleCompleteProcurement = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await api.completeProcurement(bookingId, "Procurement batch finalized", currentUser);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to complete procurement");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !kpis) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-agro-700" />
        Loading procurement centre operational dashboard...
      </div>
    );
  }

  const storagePct = kpis ? Math.min(100, Math.round((kpis.remaining_storage_q / 5000) * 100)) : 60;
  const processingPct = kpis ? Math.min(100, Math.round((kpis.processed_today_q / (kpis.daily_processing_capacity_q || 1)) * 100)) : 50;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Centre Header Strip */}
      <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-agro-100 text-agro-800 px-2 py-0.5 rounded uppercase">
              Centre Operations
            </span>
            <span className="text-xs text-gray-400 font-medium">Assigned Officer: {currentUser.display_name}</span>
          </div>
          <h1 className="text-2xl font-black text-agro-950 font-serif">
            {kpis?.centre_name || "Procurement Operations Center"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Physical Queue Coordination • Weighbridge Management • Quality Grading
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live State</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Expected Today */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-xs">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Expected Today
            </span>
            <div className="text-2xl font-black text-gray-950">{kpis.expected_quantity_today_q} q</div>
            <span className="text-[11px] text-gray-500">{(kpis.expected_quantity_today_q / 10).toFixed(1)} tonnes committed</span>
          </div>

          {/* Remaining Storage */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-xs">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
              Remaining Storage
            </span>
            <div className="text-2xl font-black text-blue-950">{kpis.remaining_storage_tonnes} t</div>
            <span className="text-[11px] text-blue-700 font-medium">{kpis.remaining_storage_q} quintals free</span>
          </div>

          {/* Processed Today */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Processed Today
            </span>
            <div className="text-2xl font-black text-emerald-950">{kpis.processed_today_tonnes} t</div>
            <span className="text-[11px] text-emerald-700 font-medium">{kpis.processed_today_q} quintals weighed</span>
          </div>

          {/* Waiting Count */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
              Waiting in Queue
            </span>
            <div className="text-2xl font-black text-amber-950">{kpis.waiting_count}</div>
            <span className="text-[11px] text-amber-700 font-medium">farmers present at gate</span>
          </div>

          {/* Processing Rate */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-xs">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">
              Processing Rate
            </span>
            <div className="text-2xl font-black text-purple-950">{kpis.processing_rate_q_per_hr} q/h</div>
            <span className="text-[11px] text-purple-700 font-medium">current throughput</span>
          </div>

          {/* Capacity Utilization */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Warehouse Load
            </span>
            <div className="text-2xl font-black text-gray-900">{kpis.utilization_pct}%</div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-agro-700 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, kpis.utilization_pct)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Currently Serving Station Card (If Active) */}
      {kpis?.currently_serving && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Scale className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-200/80 px-2 py-0.5 rounded">
                  Now Serving at Intake Scale
                </span>
                <span className="text-xs font-mono font-bold text-gray-600">{kpis.currently_serving.booking_number}</span>
              </div>
              <h2 className="text-lg font-black text-gray-950 mt-0.5">
                {kpis.currently_serving.farmer_name} • {kpis.currently_serving.expected_quantity_q} q {kpis.currently_serving.commodity_name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedBookingForWeigh(kpis.currently_serving)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              {kpis.currently_serving.actual_quantity_q !== null
                ? `Weight: ${kpis.currently_serving.actual_quantity_q} q (Edit)`
                : "Record Weighed Weight"}
            </button>
            <button
              onClick={() => setSelectedBookingForQuality(kpis.currently_serving)}
              className="bg-agro-800 hover:bg-agro-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              Quality Check (Pass/Fail)
            </button>
          </div>
        </div>
      )}

      {/* Real-time Fair Queue Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-950">Daily Operational Queue (Fair Order)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Strict sequence determined by scheduled window and verified gate arrival. Reordering is disabled.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-600 bg-surface-muted px-2.5 py-1 rounded-lg border border-surface-border">
            Total {queue.length} bookings today
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-surface-border text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pos</th>
                <th className="py-3 px-4">Farmer</th>
                <th className="py-3 px-4">Crop</th>
                <th className="py-3 px-4">Expected</th>
                <th className="py-3 px-4">Actual (Weighed)</th>
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dynamic ETA</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    No farmers in queue right now.
                  </td>
                </tr>
              ) : (
                queue.map((row) => {
                  const isServing = row.queue_status === "SERVING" || row.arrival_status === "WEIGHING";
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50/80 transition ${
                        isServing ? "bg-orange-50/40 font-semibold" : ""
                      }`}
                    >
                      {/* Position */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm">
                        {row.queue_position ? (
                          <span className={`px-2 py-0.5 rounded ${isServing ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                            #{row.queue_position}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Farmer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.farmer_name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{row.farmer_mobile_masked}</div>
                      </td>

                      {/* Crop */}
                      <td className="py-3.5 px-4 font-medium text-gray-700">{row.commodity_name}</td>

                      {/* Expected */}
                      <td className="py-3.5 px-4 font-bold text-gray-900">{row.expected_quantity_q} q</td>

                      {/* Actual Weighed */}
                      <td className="py-3.5 px-4">
                        {row.actual_quantity_q !== null ? (
                          <span className="font-black text-agro-900 bg-agro-50 px-2 py-0.5 rounded border border-agro-200">
                            {row.actual_quantity_q} q
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not weighed</span>
                        )}
                      </td>

                      {/* Slot */}
                      <td className="py-3.5 px-4 text-gray-600 font-mono">{row.slot_window}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={row.arrival_status} />
                      </td>

                      {/* Dynamic ETA */}
                      <td className="py-3.5 px-4">
                        {row.eta_time_str ? (
                          <div>
                            <span className="font-bold text-amber-950">{row.eta_time_str}</span>
                            <span className="text-[10px] text-gray-400 block">(~{row.estimated_wait_min} min)</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Contextual Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark Arrived */}
                          {row.can_mark_arrived && (
                            <button
                              onClick={() => handleMarkArrived(row.booking_id)}
                              disabled={actionLoading === row.booking_id}
                              className="bg-purple-700 hover:bg-purple-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                              title="Farmer has physically arrived at gate counter"
                            >
                              Mark Arrived
                            </button>
                          )}

                          {/* Weighing */}
                          {row.can_start_procurement && (
                            <button
                              onClick={() => setSelectedBookingForWeigh(row)}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                              {row.actual_quantity_q !== null ? "Re-weigh" : "Weigh"}
                            </button>
                          )}

                          {/* Quality Check */}
                          {row.arrival_status === "QUALITY_CHECK" && (
                            <button
                              onClick={() => setSelectedBookingForQuality(row)}
                              className="bg-indigo-700 hover:bg-indigo-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                              Quality
                            </button>
                          )}

                          {/* Complete Procurement */}
                          {(row.arrival_status === "QUALITY_CHECK" || row.actual_quantity_q !== null) && (
                            <button
                              onClick={() => handleCompleteProcurement(row.booking_id)}
                              disabled={actionLoading === row.booking_id}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                              Complete
                            </button>
                          )}

                          {/* Mark No-Show */}
                          {row.can_mark_noshow && (
                            <button
                              onClick={() => handleMarkNoShow(row.booking_id)}
                              disabled={actionLoading === row.booking_id}
                              className="text-rose-700 hover:text-rose-900 hover:bg-rose-50 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                              title="Mark No-Show: releases planned capacity without auto walk-ins"
                            >
                              No-Show
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embedded Simulation Controls */}
      {kpis && (
        <SimulationControlPanel
          centreId={kpis.centre_id}
          currentUser={currentUser}
          onSimulationTriggered={loadData}
        />
      )}

      {/* Weighing Modal */}
      {selectedBookingForWeigh && (
        <WeighingModal
          isOpen={true}
          onClose={() => setSelectedBookingForWeigh(null)}
          booking={selectedBookingForWeigh}
          currentUser={currentUser}
          onSuccess={loadData}
        />
      )}

      {/* Quality Modal */}
      {selectedBookingForQuality && (
        <QualityCheckModal
          isOpen={true}
          onClose={() => setSelectedBookingForQuality(null)}
          booking={selectedBookingForQuality}
          currentUser={currentUser}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
