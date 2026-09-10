"use client";

import React, { useState } from "react";
import { AlertTriangle, X, Send } from "lucide-react";
import { DemoUser, TransactionRecord } from "@/lib/types";
import { api } from "@/lib/api";

interface FarmerDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  procurement: TransactionRecord;
  currentUser: DemoUser;
  onDisputeSubmitted: () => void;
}

export const FarmerDisputeModal: React.FC<FarmerDisputeModalProps> = ({
  isOpen,
  onClose,
  procurement,
  currentUser,
  onDisputeSubmitted,
}) => {
  const [reportedQty, setReportedQty] = useState<number>(procurement.expected_quantity_q);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("Please specify the exact reason for the discrepancy.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await api.createDispute(procurement.id, {
        type: "QUANTITY_DISCREPANCY",
        reported_quantity_q: Number(reportedQty),
        reason: reason.trim(),
      }, currentUser);

      onDisputeSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit dispute ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-surface-border animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-rose-200 hover:text-white p-1 rounded-full hover:bg-rose-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-800 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-grain-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Report Weighing Discrepancy</h3>
              <p className="text-xs text-rose-200">Formal Grievance Ticket Submission</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
            <div className="flex justify-between font-medium">
              <span>Booking Number:</span>
              <span className="font-mono font-bold">{procurement.booking_number}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Expected Harvest Weight:</span>
              <span className="font-bold">{procurement.expected_quantity_q} q</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Recorded Weighed Weight:</span>
              <span className="font-bold text-rose-700">{procurement.actual_quantity_q} q</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Your Claimed Actual Weight (Quintals)
            </label>
            <input
              type="number"
              step="0.1"
              value={reportedQty}
              onChange={(e) => setReportedQty(Number(e.target.value))}
              className="w-full bg-surface-muted border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Reason / Ground Observation
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Weighbridge slip showed 49.8q at gate entry; scale operator entered 47.2q. Tare bag weight was deducted twice."
              className="w-full bg-surface-muted border border-gray-300 rounded-xl p-3 text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600"
              required
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
            <strong>Auditable Notice:</strong> Submitting a dispute freezes automated payment disbursal for this record until centre staff and supervisory admin review the weighbridge audit logs.
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
              className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? "Submitting..." : "Submit Grievance Ticket"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
