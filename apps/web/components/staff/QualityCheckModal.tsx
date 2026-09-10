"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { DemoUser } from "@/lib/types";

interface QualityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  currentUser: DemoUser;
  onSuccess: () => void;
}

export const QualityCheckModal: React.FC<QualityCheckModalProps> = ({
  isOpen,
  onClose,
  booking,
  currentUser,
  onSuccess,
}) => {
  const [status, setStatus] = useState<"PASSED" | "FAILED">("PASSED");
  const [reason, setReason] = useState("Meets FAQ criteria: Moisture 11.4% (<12% standard), foreign matter <0.75%");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await api.recordQuality(booking.booking_id, status, reason, currentUser);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record quality check");
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
          <h3 className="text-lg font-bold">Produce Quality Inspection</h3>
          <p className="text-xs text-agro-200">{booking.commodity_name} • {booking.farmer_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Inspection Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatus("PASSED");
                  setReason("Meets FAQ criteria: Moisture 11.4% (<12% standard), foreign matter <0.75%");
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  status === "PASSED"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>PASS (Accepted)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus("FAILED");
                  setReason("Moisture content 15.2% exceeds permissible limits; excessive chaff.");
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  status === "FAILED"
                    ? "bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-500/20"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>FAIL (Rejected)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Moisture & Laboratory Analysis Notes
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surface-muted border border-gray-300 rounded-xl p-3 text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-600"
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
              className="bg-agro-800 hover:bg-agro-900 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving..." : "Save Inspection Result"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
