"use client";

import React, { useState, useEffect } from "react";
import { Wheat, Bell, Shield, Calendar, Clock, HelpCircle, Layers } from "lucide-react";
import { DemoUser, NotificationItem } from "@/lib/types";
import { api } from "@/lib/api";

interface AppHeaderProps {
  currentUser: DemoUser | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenVerifyModal: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onOpenVerifyModal,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (currentUser) {
      api.getNotifications(currentUser).then((res) => setNotifications(res)).catch(() => {});
    }
  }, [currentUser, activeTab]);

  return (
    <header className="bg-white border-b border-surface-border sticky top-[37px] z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-agro-900 text-grain-400 flex items-center justify-center shadow-md border border-agro-800">
            <Wheat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-agro-950 font-serif">AnnaSetu</span>
              <span className="text-xs bg-agro-100 text-agro-800 font-semibold px-2 py-0.5 rounded-full border border-agro-200">
                अन्नसेतू
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Smart Agricultural Procurement Coordination</p>
          </div>
        </div>

        {/* Dynamic Nav according to Role */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-surface-border">
          {currentUser?.role === "FARMER" && (
            <>
              <button
                onClick={() => onTabChange("overview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "overview" ? "bg-white text-agro-900 shadow-xs border border-gray-200" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Farmer Home
              </button>
              <button
                onClick={() => onTabChange("book")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "book" ? "bg-agro-800 text-white shadow-xs" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                + Book Procurement
              </button>
              <button
                onClick={() => onTabChange("live_status")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "live_status" ? "bg-white text-agro-900 shadow-xs border border-gray-200" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Live Queue & ETA
              </button>
              <button
                onClick={() => onTabChange("transactions")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "transactions" ? "bg-white text-agro-900 shadow-xs border border-gray-200" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Transactions & Transparency
              </button>
            </>
          )}

          {currentUser?.role === "STAFF" && (
            <>
              <button
                onClick={() => onTabChange("dashboard")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "dashboard" ? "bg-agro-800 text-white shadow-xs" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Centre Operations Dashboard
              </button>
              <button
                onClick={() => onTabChange("queue")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "queue" ? "bg-white text-agro-900 shadow-xs border border-gray-200" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Operational Queue
              </button>
              <button
                onClick={() => onTabChange("simulation")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "simulation" ? "bg-amber-600 text-white shadow-xs font-bold" : "text-amber-800 hover:bg-amber-100"
                }`}
              >
                ⚡ Simulation Controls
              </button>
            </>
          )}

          {currentUser?.role === "CSC" && (
            <>
              <button
                onClick={() => onTabChange("csc_booking")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "csc_booking" ? "bg-agro-800 text-white shadow-xs" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Assisted Farmer Booking
              </button>
              <button
                onClick={() => onTabChange("csc_directory")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "csc_directory" ? "bg-white text-agro-900 shadow-xs border border-gray-200" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Farmer Directory
              </button>
            </>
          )}

          {currentUser?.role === "ADMIN" && (
            <>
              <button
                onClick={() => onTabChange("admin_overview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "admin_overview" ? "bg-agro-800 text-white shadow-xs" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Overview & Capacity
              </button>
              <button
                onClick={() => onTabChange("admin_audit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "admin_audit" ? "bg-white text-agro-900 shadow-xs border border-gray-200" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                Immutable Audit Trail
              </button>
              <button
                onClick={() => onTabChange("admin_payments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "admin_payments" ? "bg-white text-agro-900 shadow-xs border border-gray-200" : "text-gray-600 hover:text-agro-900"
                }`}
              >
                External PFMS Disbursal
              </button>
            </>
          )}
        </nav>

        {/* Right Utility Icons */}
        <div className="flex items-center gap-3">
          {/* Identity verification badge */}
          <button
            onClick={onOpenVerifyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-agro-50 hover:bg-agro-100 text-agro-900 border border-agro-200 rounded-xl text-xs font-medium transition"
            title="Inspect Demo Identity Verification architecture"
          >
            <Shield className="w-3.5 h-3.5 text-agro-700" />
            <span className="hidden sm:inline">Demo eKYC</span>
          </button>

          {/* In-app Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-gray-600 hover:text-agro-900 hover:bg-gray-100 transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">In-App Notification Centre</span>
                  <span className="text-[11px] bg-agro-100 text-agro-800 font-semibold px-2 py-0.5 rounded-full">
                    {notifications.length} alerts
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">No recent notifications.</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3.5 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-agro-950">{n.title}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-snug">{n.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
