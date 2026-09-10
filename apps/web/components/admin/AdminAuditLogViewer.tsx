"use client";

import React, { useState, useEffect } from "react";
import { Shield, RefreshCw, Filter, Clock, FileText } from "lucide-react";
import { AuditLogItem } from "@/lib/types";
import { api } from "@/lib/api";

export const AdminAuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string>("ALL");

  const loadLogs = async () => {
    try {
      const res = await api.getAuditLogs(60);
      setLogs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = selectedAction === "ALL"
    ? logs
    : logs.filter((l) => l.action.includes(selectedAction));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-agro-800 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-grain-500" />
            <span>Statutory Audit & Traceability</span>
          </div>
          <h1 className="text-2xl font-black text-agro-950 font-serif">Immutable Operational Audit Trail</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Every gate arrival, no-show, actual weighed weight, quality inspection, and external payment update is cryptographically recorded.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-surface-muted border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700"
          >
            <option value="ALL">All Recorded Actions</option>
            <option value="ARRIVED">Arrival Actions</option>
            <option value="NO_SHOW">No-Show Events</option>
            <option value="ACTUAL_QUANTITY">Weighbridge Weights</option>
            <option value="QUALITY">Quality Results</option>
            <option value="PROCUREMENT">Procurement Completed</option>
            <option value="PAYMENT">Payment Disbursals</option>
          </select>

          <button
            onClick={loadLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-surface-border text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Old State</th>
                <th className="py-3 px-4">New State</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No audit logs matching selection.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      <span className="block text-[10px] text-gray-400">
                        {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-800 block">{log.actor_role}</span>
                      <span className="text-[10px] font-mono text-gray-400">{log.actor_user_id.slice(0, 8)}...</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-agro-100 text-agro-900 border border-agro-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-gray-500 max-w-[140px] truncate" title={log.old_value_json || ""}>
                      {log.old_value_json || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-emerald-800 font-semibold max-w-[160px] truncate" title={log.new_value_json || ""}>
                      {log.new_value_json || "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-xs max-w-[180px]">
                      {log.reason || "Operational update"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
