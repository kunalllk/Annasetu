"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, RefreshCw, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { DemoUser } from "@/lib/types";
import { api } from "@/lib/api";
import { StatusBadge } from "../ui/StatusBadge";

interface AdminPaymentManagerProps {
  currentUser: DemoUser;
}

export const AdminPaymentManager: React.FC<AdminPaymentManagerProps> = ({ currentUser }) => {
  const [procurements, setProcurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await api.getDemoUsers();
      // Fetch transactions across first 10 farmers to aggregate
      const farmers = res.filter((u) => u.role === "FARMER").slice(0, 15);
      const allTx = await Promise.all(farmers.map((f) => api.getFarmerTransactions(f.id).catch(() => [])));
      const flattened = allTx.flat();
      setProcurements(flattened);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePayment = async (procId: string, currentStatus: string) => {
    setUpdatingId(procId);
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      await api.updatePaymentStatus(procId, newStatus, currentUser);
      await loadData();
    } catch (err: any) {
      alert("Failed to update status: " + err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-agro-800 font-bold text-xs uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4 text-grain-500" />
            <span>Government PFMS Disbursal Simulation</span>
          </div>
          <h1 className="text-2xl font-black text-agro-950 font-serif">External Payment Status Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            AnnaSetu tracks payment status from the external government PFMS disbursal process. For demo purposes, Super Admin can simulate state transitions.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5">Architecture Scope Notice:</strong>
          AnnaSetu does not operate a payment gateway. Financial disbursements are executed exclusively by the State Agricultural Treasury via Public Financial Management System (PFMS) Direct Benefit Transfer (DBT). AnnaSetu monitors and reflects status transparency for farmers.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-surface-border text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Farmer</th>
                <th className="py-3 px-4">Centre</th>
                <th className="py-3 px-4">Weighed Qty</th>
                <th className="py-3 px-4">PFMS Reference</th>
                <th className="py-3 px-4">Disbursal Status</th>
                <th className="py-3 px-4 text-right">Demo Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {procurements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No completed procurements ready for payment disbursal.
                  </td>
                </tr>
              ) : (
                procurements.map((p) => {
                  const isCompleted = p.payment_status === "COMPLETED";
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{p.booking_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">{p.farmer_name}</td>
                      <td className="py-3.5 px-4 text-gray-600">{p.centre_name}</td>
                      <td className="py-3.5 px-4 font-black text-agro-900">{p.actual_quantity_q ?? p.expected_quantity_q} q</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                        {p.payment_reference || "PFMS-QUEUE-PENDING"}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={isCompleted ? "PAYMENT_COMPLETED" : "PAYMENT_PENDING"} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleTogglePayment(p.id, p.payment_status)}
                          disabled={updatingId === p.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                            isCompleted
                              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              : "bg-emerald-700 hover:bg-emerald-800 text-white"
                          }`}
                        >
                          {updatingId === p.id
                            ? "Updating..."
                            : isCompleted
                            ? "Revert to Pending"
                            : "Simulate Payment Disbursed"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
