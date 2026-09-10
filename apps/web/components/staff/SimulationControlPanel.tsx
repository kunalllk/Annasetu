"use client";

import React, { useState } from "react";
import { Zap, FastForward, CheckCircle2, AlertTriangle, UserX, RotateCcw, Info } from "lucide-react";
import { api } from "@/lib/api";
import { DemoUser } from "@/lib/types";

interface SimulationControlPanelProps {
  centreId: string;
  currentUser: DemoUser;
  onSimulationTriggered: () => void;
}

export const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
  centreId,
  currentUser,
  onSimulationTriggered,
}) => {
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const triggerAction = async (action: string) => {
    setRunningAction(action);
    setStatusMsg("");
    try {
      const res = await api.runSimulation(centreId, action, currentUser);
      setStatusMsg(res.message);
      onSimulationTriggered();
    } catch (err: any) {
      alert("Simulation error: " + (err.message || err));
    } finally {
      setRunningAction(null);
    }
  };

  const handleReset = async () => {
    if (confirm("Reset AnnaSetu database to pristine baseline?")) {
      setRunningAction("RESET");
      try {
        await api.resetSimulation();
        setStatusMsg("Demo state has been reset to baseline.");
        onSimulationTriggered();
      } catch (err: any) {
        alert("Reset failed: " + err);
      } finally {
        setRunningAction(null);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-grain-400 p-6 shadow-xs space-y-4 relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grain-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-grain-100 text-grain-800 rounded-xl">
            <Zap className="w-5 h-5 fill-grain-500 text-grain-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-gray-950 font-serif">
                Run Procurement Simulation
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                DEMO / SIMULATION MODE
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Trigger operational events to demonstrate AnnaSetu’s real-time queue recalculation & dynamic ETA updates.
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        {/* Advance 10 Min */}
        <button
          onClick={() => triggerAction("ADVANCE_10_MIN")}
          disabled={!!runningAction}
          className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1.5">
            <FastForward className="w-4 h-4 text-agro-700" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Step Time</span>
          </div>
          <div className="text-xs font-bold text-gray-900">Advance 10 Minutes</div>
          <p className="text-[11px] text-gray-500 mt-1 leading-snug">
            Moves operational clock ahead and recomputes live queue ETAs.
          </p>
        </button>

        {/* Complete Current Farmer */}
        <button
          onClick={() => triggerAction("COMPLETE_CURRENT")}
          disabled={!!runningAction}
          className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Process</span>
          </div>
          <div className="text-xs font-bold text-gray-900">Complete Current Farmer</div>
          <p className="text-[11px] text-gray-500 mt-1 leading-snug">
            Finishes weighing/quality, frees daily capacity, summons next farmer.
          </p>
        </button>

        {/* Slow Processing / ETA Spike */}
        <button
          onClick={() => triggerAction("SLOW_PROCESSING")}
          disabled={!!runningAction}
          className="p-3.5 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span className="text-[10px] font-bold text-amber-700 uppercase">Simulate Delay</span>
          </div>
          <div className="text-xs font-bold text-amber-950">Slow Processing Rate</div>
          <p className="text-[11px] text-amber-800 mt-1 leading-snug">
            Cuts rate to simulate jam; triggers dynamic ETA surge and delay notification.
          </p>
        </button>

        {/* Mark Seeded No-Show */}
        <button
          onClick={() => triggerAction("MARK_SEEDED_NOSHOW")}
          disabled={!!runningAction}
          className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1.5">
            <UserX className="w-4 h-4 text-rose-600" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Absence</span>
          </div>
          <div className="text-xs font-bold text-gray-900">Mark Seeded No-Show</div>
          <p className="text-[11px] text-gray-500 mt-1 leading-snug">
            Planned capacity becomes <span className="font-bold">Potentially Available</span> without auto walk-ins.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
        <span>Updates real persisted database state in real time.</span>
        <button
          onClick={handleReset}
          disabled={!!runningAction}
          className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Baseline</span>
        </button>
      </div>
    </div>
  );
};
