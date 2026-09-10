"use client";

import React, { useState } from "react";
import { RefreshCw, LogOut, ShieldCheck, User } from "lucide-react";
import { DemoUser } from "@/lib/types";
import { api } from "@/lib/api";

interface RoleSwitcherBarProps {
  currentUser: DemoUser | null;
  onLogout: () => void;
  onResetDemo: () => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  currentUser,
  onLogout,
  onResetDemo,
}) => {
  const [resetting, setResetting] = useState(false);

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

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "FARMER":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "STAFF":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "CSC":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      case "ADMIN":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "FARMER":
        return "Farmer (किसान)";
      case "STAFF":
        return "Mandi Staff (खरीद केंद्र)";
      case "CSC":
        return "CSC Kiosk (डिजिटल सेवा)";
      case "ADMIN":
        return "Super Admin (प्रशासन)";
      default:
        return role || "User";
    }
  };

  return (
    <div className="bg-slate-950 text-white border-b border-slate-800 text-xs px-4 py-2 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active Logged In Persona Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-xs hidden sm:inline">Logged In:</span>
            <span className="font-bold text-white text-xs">{currentUser?.display_name || "Authenticated User"}</span>
          </div>

          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadgeColor(currentUser?.role)}`}>
            {getRoleLabel(currentUser?.role)}
          </span>

          {(currentUser?.village || currentUser?.centre_name) && (
            <span className="text-[11px] text-slate-400 hidden md:inline border-l border-slate-800 pl-3">
              {currentUser.village || currentUser.centre_name}
            </span>
          )}
        </div>

        {/* Right: Switch Role / Logout & Reset Demo */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 px-3 py-1 rounded-lg transition text-xs font-semibold cursor-pointer shadow-xs"
            title="Log out and return to the Persona Selection & Login page"
          >
            <LogOut className="w-3.5 h-3.5 text-grain-400" />
            <span>Switch Role / Logout</span>
          </button>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 px-2.5 py-1 rounded-lg transition text-[11px] font-medium disabled:opacity-50 cursor-pointer"
            title="Reset database to clean baseline dataset"
          >
            <RefreshCw className={`w-3 h-3 ${resetting ? "animate-spin" : ""}`} />
            <span>{resetting ? "Resetting..." : "Reset Demo"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
