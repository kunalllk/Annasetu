"use client";

import React, { useState } from "react";
import { Scale, X, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { DemoUser } from "@/lib/types";

interface WeighingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  currentUser: DemoUser;
  onSuccess: () => void;
}

export const WeighingModal: React.FC<WeighingModalProps> = ({
  isOpen,
  onClose,
  booking,
  currentUser,
  onSuccess,
}) => {
  const [actualQty, setActualQty] = useState<number>(
    booking?.actual_quantity_q || (booking?.expected_quantity_q ? Number((booking.expected_quantity_q * 0.974).toFixed(1)) : 48.7)
  );
  const [operatorNote, setOperatorNote] = useState("Weighed on Platform Scale #2 — Tare bags deducted");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await api.recordWeighing(booking.booking_id, Number(actualQty), operatorNote, currentUser);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record weighing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-surface-border animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-agro-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-agro-300 hover:text-white p-1 rounded-full hover:bg-agro-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-agro-800 rounded-xl">
              <Scale className="w-5 h-5 text-grain-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Manual Weighbridge Entry</h3>
              <p className="text-xs text-agro-200">AnnaSetu Physical Intake Station</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Farmer Name:</span>
              <span className="font-bold text-gray-900">{booking.farmer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Booking Number:</span>
              <span className="font-mono font-bold">{booking.booking_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Commodity:</span>
              <span className="font-bold text-agro-900">{booking.commodity_name}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5">
              <span className="text-gray-700 font-semibold">Expected Planning Weight:</span>
              <span className="font-black text-gray-950 text-sm">{booking.expected_quantity_q} quintals</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Actual Weighed Produce (Quintals)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={actualQty}
                onChange={(e) => setActualQty(Number(e.target.value))}
                className="w-full bg-surface-muted border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-black text-agro-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-600 pr-16"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-500 pointer-events-none">
                quintals
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Recorded weight is transmitted directly to farmer’s digital receipt for immediate confirmation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Weighbridge Operator Note / Scale Reference
            </label>
            <input
              type="text"
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              className="w-full bg-surface-muted border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-600"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 bg-agro-800 hover:bg-agro-900 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-grain-400" />
              <span>{loading ? "Recording..." : "Save Weighed Quantity"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
