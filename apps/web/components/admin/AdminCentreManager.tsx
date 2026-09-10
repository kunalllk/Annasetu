"use client";

import React, { useState, useEffect } from "react";
import { Building2, Edit2, Check, X, RefreshCw, Layers } from "lucide-react";
import { Centre, DemoUser } from "@/lib/types";
import { api } from "@/lib/api";

interface AdminCentreManagerProps {
  currentUser: DemoUser;
}

export const AdminCentreManager: React.FC<AdminCentreManagerProps> = ({ currentUser }) => {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCentreId, setEditingCentreId] = useState<string | null>(null);
  const [editStorageQ, setEditStorageQ] = useState<number>(0);
  const [editDailyQ, setEditDailyQ] = useState<number>(0);
  const [editRate, setEditRate] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const loadCentres = async () => {
    try {
      const res = await api.getAdminCentres();
      setCentres(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCentres();
  }, []);

  const startEdit = (c: Centre) => {
    setEditingCentreId(c.id);
    setEditStorageQ(c.capacity.storage_capacity_q);
    setEditDailyQ(c.capacity.daily_processing_capacity_q);
    setEditRate(c.capacity.processing_rate_q_per_hr);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await api.updateAdminCentre(id, {
        storage_capacity_q: Number(editStorageQ),
        daily_processing_capacity_q: Number(editDailyQ),
        processing_rate_q_per_hr: Number(editRate),
      }, currentUser);
      setEditingCentreId(null);
      await loadCentres();
    } catch (err: any) {
      alert("Failed to update centre: " + err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-agro-800 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-grain-500" />
            <span>State Procurement Infrastructure</span>
          </div>
          <h1 className="text-2xl font-black text-agro-950 font-serif">Procurement Centre & Capacity Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure storage limits, daily intake targets, and processing throughput rates across division depots.
          </p>
        </div>

        <button
          onClick={loadCentres}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {centres.map((c) => {
          const isEditing = editingCentreId === c.id;
          const storageTonnes = (c.capacity.storage_capacity_q / 10).toFixed(0);
          const remainingTonnes = (c.capacity.remaining_storage_q / 10).toFixed(1);
          const utilPct = Math.round((c.capacity.occupied_committed_q / (c.capacity.storage_capacity_q || 1)) * 100);

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-surface-border p-6 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold bg-agro-100 text-agro-900 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{c.operating_start} – {c.operating_end}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-950">{c.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{c.address}</p>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => startEdit(c)}
                    className="p-2 text-gray-500 hover:text-agro-900 hover:bg-gray-100 rounded-lg transition"
                    title="Edit Centre Capacity"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 bg-surface-muted p-4 rounded-xl border border-surface-border">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase">
                      Total Storage Capacity (q)
                    </label>
                    <input
                      type="number"
                      value={editStorageQ}
                      onChange={(e) => setEditStorageQ(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-900 mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase">
                      Daily Processing Capacity (q/day)
                    </label>
                    <input
                      type="number"
                      value={editDailyQ}
                      onChange={(e) => setEditDailyQ(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-900 mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase">
                      Throughput Rate (q/hour)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={editRate}
                      onChange={(e) => setEditRate(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-900 mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingCentreId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(c.id)}
                      disabled={saving}
                      className="px-4 py-1.5 bg-agro-800 hover:bg-agro-900 text-white rounded-lg text-xs font-bold transition"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-surface-muted rounded-xl">
                      <span className="text-gray-500 block">Warehouse Storage</span>
                      <strong className="text-base text-gray-900">{storageTonnes} tonnes</strong>
                      <span className="text-[11px] text-gray-400 block">({c.capacity.storage_capacity_q} q)</span>
                    </div>

                    <div className="p-3 bg-surface-muted rounded-xl">
                      <span className="text-gray-500 block">Remaining Available</span>
                      <strong className="text-base text-emerald-800">{remainingTonnes} tonnes</strong>
                      <span className="text-[11px] text-emerald-600 block">({c.capacity.remaining_storage_q} q)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                      <span>Warehouse Committed Load</span>
                      <span>{utilPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          utilPct > 80 ? "bg-rose-600" : "bg-agro-700"
                        }`}
                        style={{ width: `${Math.min(100, utilPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.commodities.map((comm) => (
                      <span
                        key={comm.id}
                        className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                      >
                        {comm.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
