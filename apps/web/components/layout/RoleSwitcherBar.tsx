"use client";

import React, { useState } from "react";
import { UserCheck, RefreshCw, ChevronDown, Check, Sparkles, Building2, User, Shield, Store } from "lucide-react";
import { DemoUser } from "@/lib/types";
import { api, setStoredSession } from "@/lib/api";

interface RoleSwitcherBarProps {
  currentUser: DemoUser | null;
  allUsers: DemoUser[];
  onUserChange: (user: DemoUser) => void;
  onResetDemo: () => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  currentUser,
  allUsers,
  onUserChange,
  onResetDemo,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Group default role representatives
  const farmerUser = allUsers.find((u) => u.role === "FARMER" && u.display_name.includes("Ramesh")) || allUsers.find((u) => u.role === "FARMER");
  const staffUser = allUsers.find((u) => u.role === "STAFF" && u.display_name.includes("Suresh")) || allUsers.find((u) => u.role === "STAFF");
  const cscUser = allUsers.find((u) => u.role === "CSC");
  const adminUser = allUsers.find((u) => u.role === "ADMIN");

  const roles = [
    { role: "FARMER", label: "Farmer", icon: User, user: farmerUser, desc: "Ramesh Patil (Khed)" },
    { role: "STAFF", label: "Centre Staff", icon: Building2, user: staffUser, desc: "Centre B (Hadapsar)" },
    { role: "CSC", label: "CSC Operator", icon: Store, user: cscUser, desc: "Assisted Kiosk" },
    { role: "ADMIN", label: "Super Admin", icon: Shield, user: adminUser, desc: "Directorate / FCI" },
  ];

  const handleRoleSelect = (targetUser: DemoUser | undefined) => {
    if (!targetUser) return;
    setStoredSession(targetUser);
    onUserChange(targetUser);
    setDropdownOpen(false);
  };

  const handleReset = async () => {
    if (confirm("Reset AnnaSetu database to pristine demo state? (5 centres, 35 farmers, fresh queue)")) {
      setResetting(true);
      try {
        await api.resetSimulation();
        onResetDemo();
      } catch (err) {
        alert("Reset failed: " + err);
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <div className="bg-agro-950 text-white border-b border-agro-800 text-xs px-4 py-2 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Current Active Role Indicator */}
        <div className="flex items-center gap-2">
          <span className="bg-grain-500 text-agro-950 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded shadow-sm">
            SIH Demo Sandbox
          </span>
          <span className="text-agro-300 hidden sm:inline">Active Persona:</span>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-agro-900 hover:bg-agro-800 border border-agro-700 px-3 py-1 rounded-lg text-white font-medium transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{currentUser?.display_name || "Select Role"}</span>
              <span className="text-[11px] bg-agro-800 text-agro-200 px-1.5 py-0.2 rounded border border-agro-700">
                {currentUser?.role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-agro-300" />
            </button>

            {/* Dropdown for picking any of 35 seeded farmers or staff */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-72 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  Switch Demo User
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {allUsers.map((u) => {
                    const isSelected = u.id === currentUser?.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleRoleSelect(u)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-agro-50 transition ${
                          isSelected ? "bg-agro-50/80 font-bold text-agro-900" : "text-gray-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{u.display_name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-agro-700" />}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {u.role} {u.centre_name ? `• ${u.centre_name}` : ""} {u.village ? `• ${u.village}` : ""}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Fast 1-Click Role Switcher */}
        <div className="flex items-center gap-1 bg-agro-900/90 p-1 rounded-xl border border-agro-800">
          {roles.map((r) => {
            const isActive = currentUser?.role === r.role;
            const Icon = r.icon;
            return (
              <button
                key={r.role}
                onClick={() => handleRoleSelect(r.user)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-agro-700 text-white shadow-sm font-bold border border-agro-600"
                    : "text-agro-200 hover:text-white hover:bg-agro-800/80"
                }`}
                title={r.desc}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-grain-400" : "text-agro-300"}`} />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Reset Demo state */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 bg-red-900/60 hover:bg-red-800/80 text-red-200 border border-red-700/60 px-2.5 py-1 rounded-lg transition text-[11px] font-medium disabled:opacity-50"
            title="Reset to clean baseline dataset"
          >
            <RefreshCw className={`w-3 h-3 ${resetting ? "animate-spin" : ""}`} />
            <span>{resetting ? "Resetting..." : "Reset Demo"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
