"use client";

import React, { useState, useEffect } from "react";
import { Scale, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, FileText, ArrowUpRight } from "lucide-react";
import { DemoUser, TransactionRecord } from "@/lib/types";
import { api } from "@/lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { FarmerDisputeModal } from "./FarmerDisputeModal";

interface FarmerTransactionsProps {
  currentUser: DemoUser;
}

export const FarmerTransactions: React.FC<FarmerTransactionsProps> = ({ currentUser }) => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDisputeProcId, setActiveDisputeProcId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await api.getFarmerTransactions(currentUser.id);
      setTransactions(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleConfirmQuantity = async (procId: string) => {
    setConfirmingId(procId);
    try {
      await api.confirmQuantity(procId, currentUser);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Confirmation failed");
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-agro-700" />
        Loading your digital procurement transaction records...
      </div>
    );
  }

  const selectedForDispute = transactions.find((t) => t.id === activeDisputeProcId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs">
        <div className="flex items-center gap-2 text-agro-800 font-bold text-xs uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4 text-grain-500" />
          <span>Full Transaction Transparency</span>
        </div>
        <h1 className="text-2xl font-black text-agro-950 font-serif">Digital Weighing & Procurement Records</h1>
        <p className="text-sm text-gray-600 mt-1">
          AnnaSetu records both planned expected quantity and verified bridge scale weight separately. If you identify any variance, you have the statutory right to raise a formal discrepancy ticket before payment disbursement.
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center text-gray-500">
          No procurement transactions recorded yet. Once your harvest is weighed at the centre, digital receipts appear here.
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((t) => {
            const hasActual = t.actual_quantity_q !== null && t.actual_quantity_q !== undefined;
            const variance = hasActual ? (t.actual_quantity_q! - t.expected_quantity_q).toFixed(1) : null;
            const isConfirmed = !!t.farmer_confirmed_at;
            const openDispute = t.disputes?.find((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW");

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-surface-border p-6 shadow-xs space-y-5"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-500">{t.booking_number}</span>
                      <StatusBadge status={t.procurement_status} />
                      <StatusBadge status={t.payment_status === "COMPLETED" ? "PAYMENT_COMPLETED" : "PAYMENT_PENDING"} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-950 mt-1">
                      {t.commodity_name} • {t.centre_name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-gray-400 block">Record Timestamp</span>
                    <span className="text-xs font-medium text-gray-700">
                      {t.quantity_recorded_at ? new Date(t.quantity_recorded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}
                    </span>
                  </div>
                </div>

                {/* Expected vs Actual Weighing Comparison Box (Core Differentiator) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-muted border border-surface-border">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Expected Harvest Weight
                    </span>
                    <div className="text-xl font-black text-gray-800">
                      {t.expected_quantity_q} <span className="text-sm font-semibold">quintals</span>
                    </div>
                    <span className="text-xs text-gray-500">Planning estimate entered at booking</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-agro-900 uppercase tracking-wider block mb-1">
                      Actual Weighed Weight
                    </span>
                    <div className="text-2xl font-black text-agro-950">
                      {hasActual ? (
                        <>
                          {t.actual_quantity_q} <span className="text-sm font-semibold">quintals</span>
                        </>
                      ) : (
                        <span className="text-base text-gray-400 italic">Weighing pending...</span>
                      )}
                    </div>
                    {hasActual && (
                      <span className="text-xs font-semibold text-gray-600">
                        {variance && Number(variance) < 0 ? (
                          <span className="text-amber-700 font-bold">{variance} q moisture/cleaning variance</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Exact / Positive match</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Quality Inspection Result
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={t.quality_status} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5 leading-snug">
                      {t.quality_reason || "Visual inspection and moisture analysis."}
                    </p>
                  </div>
                </div>

                {/* Farmer Confirmation & Dispute Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="text-xs">
                    {isConfirmed ? (
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>You confirmed this weighed quantity ({t.actual_quantity_q} q)</span>
                      </div>
                    ) : openDispute ? (
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Discrepancy Ticket #{openDispute.id.slice(0, 8)}: {openDispute.status}</span>
                      </div>
                    ) : hasActual ? (
                      <span className="text-gray-600 font-medium">
                        Please review and confirm the recorded weight or report a discrepancy.
                      </span>
                    ) : null}
                  </div>

                  {hasActual && !isConfirmed && !openDispute && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveDisputeProcId(t.id)}
                        className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
                      >
                        Report Discrepancy
                      </button>

                      <button
                        onClick={() => handleConfirmQuantity(t.id)}
                        disabled={confirmingId === t.id}
                        className="flex items-center gap-1.5 bg-agro-800 hover:bg-agro-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-grain-400" />
                        <span>{confirmingId === t.id ? "Confirming..." : "Confirm Weighed Quantity"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Discrepancy Ticket Details if opened */}
                {t.disputes && t.disputes.length > 0 && (
                  <div className="mt-3 p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1.5">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>Discrepancy Complaint History</span>
                      <StatusBadge status={t.disputes[0].status} />
                    </div>
                    <p className="text-amber-900">
                      <strong>Reported Reason:</strong> {t.disputes[0].reason}
                    </p>
                    {t.disputes[0].resolution_note && (
                      <p className="text-emerald-900 font-semibold mt-1">
                        <strong>Official Resolution:</strong> {t.disputes[0].resolution_note}
                      </p>
                    )}
                  </div>
                )}

                {/* External PFMS Government Payment status explanation */}
                <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span>
                    Government Disbursal Reference: <strong className="font-mono text-gray-700">{t.payment_reference || "PFMS-QUEUE-PENDING"}</strong>
                  </span>
                  <span className="italic">
                    Disbursed directly by State Agri treasury via PFMS.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispute Modal */}
      {selectedForDispute && (
        <FarmerDisputeModal
          isOpen={true}
          onClose={() => setActiveDisputeProcId(null)}
          procurement={selectedForDispute}
          currentUser={currentUser}
          onDisputeSubmitted={loadData}
        />
      )}
    </div>
  );
};
