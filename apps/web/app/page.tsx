"use client";

import React, { useState, useEffect } from "react";
import { DemoUser } from "@/lib/types";
import { api, getStoredSession, setStoredSession } from "@/lib/api";
import { RoleSwitcherBar } from "@/components/layout/RoleSwitcherBar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MockVerificationModal } from "@/components/ui/MockVerificationModal";

// Farmer components
import { FarmerOverview } from "@/components/farmer/FarmerOverview";
import { FarmerBookingWizard } from "@/components/farmer/FarmerBookingWizard";
import { FarmerLiveStatus } from "@/components/farmer/FarmerLiveStatus";
import { FarmerTransactions } from "@/components/farmer/FarmerTransactions";

// Staff components
import { StaffDashboard } from "@/components/staff/StaffDashboard";

// CSC components
import { AssistedBookingWizard } from "@/components/csc/AssistedBookingWizard";

// Admin components
import { AdminCentreManager } from "@/components/admin/AdminCentreManager";
import { AdminAuditLogViewer } from "@/components/admin/AdminAuditLogViewer";
import { AdminPaymentManager } from "@/components/admin/AdminPaymentManager";

export default function AnnaSetuApp() {
  const [allUsers, setAllUsers] = useState<DemoUser[]>([]);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load demo users and active session on mount
  useEffect(() => {
    api.getDemoUsers()
      .then((users) => {
        setAllUsers(users);
        const stored = getStoredSession();
        if (stored) {
          const matching = users.find((u) => u.id === stored.id);
          if (matching) {
            setCurrentUser(matching);
            setDefaultTabForRole(matching.role);
            return;
          }
        }
        // Default to Ramesh Patil (Farmer)
        const defaultFarmer = users.find((u) => u.role === "FARMER" && u.display_name.includes("Ramesh")) || users[0];
        setCurrentUser(defaultFarmer);
        setStoredSession(defaultFarmer);
        setDefaultTabForRole(defaultFarmer.role);
      })
      .catch((err) => console.error("Failed to load demo users:", err))
      .finally(() => setInitialLoading(false));
  }, []);

  const setDefaultTabForRole = (role: string) => {
    switch (role) {
      case "FARMER":
        setActiveTab("overview");
        break;
      case "STAFF":
        setActiveTab("dashboard");
        break;
      case "CSC":
        setActiveTab("csc_booking");
        break;
      case "ADMIN":
        setActiveTab("admin_overview");
        break;
      default:
        setActiveTab("overview");
    }
  };

  const handleUserChange = (newUser: DemoUser) => {
    setCurrentUser(newUser);
    setDefaultTabForRole(newUser.role);
  };

  const handleResetDemo = () => {
    // Reload users and reset tab
    api.getDemoUsers().then((users) => {
      setAllUsers(users);
      if (currentUser) {
        const refreshed = users.find((u) => u.id === currentUser.id) || users[0];
        setCurrentUser(refreshed);
        setStoredSession(refreshed);
      }
    });
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-gray-500 font-medium">
        Loading AnnaSetu Smart Agricultural Procurement Coordination Platform...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Sticky Role Switcher Bar */}
      <RoleSwitcherBar
        currentUser={currentUser}
        allUsers={allUsers}
        onUserChange={handleUserChange}
        onResetDemo={handleResetDemo}
      />

      {/* Main Header & Navigation */}
      <AppHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* FARMER VIEWS */}
        {currentUser?.role === "FARMER" && (
          <>
            {activeTab === "overview" && (
              <FarmerOverview
                currentUser={currentUser}
                onNavigate={setActiveTab}
                onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
              />
            )}
            {activeTab === "book" && (
              <FarmerBookingWizard
                currentUser={currentUser}
                onBookingConfirmed={() => setActiveTab("live_status")}
              />
            )}
            {activeTab === "live_status" && (
              <FarmerLiveStatus
                currentUser={currentUser}
                onNavigateToBooking={() => setActiveTab("book")}
              />
            )}
            {activeTab === "transactions" && (
              <FarmerTransactions currentUser={currentUser} />
            )}
          </>
        )}

        {/* STAFF VIEWS */}
        {currentUser?.role === "STAFF" && (
          <>
            {(activeTab === "dashboard" || activeTab === "queue" || activeTab === "simulation") && (
              <StaffDashboard currentUser={currentUser} />
            )}
          </>
        )}

        {/* CSC VIEWS */}
        {currentUser?.role === "CSC" && (
          <>
            {(activeTab === "csc_booking" || activeTab === "csc_directory") && (
              <AssistedBookingWizard currentUser={currentUser} />
            )}
          </>
        )}

        {/* ADMIN VIEWS */}
        {currentUser?.role === "ADMIN" && (
          <>
            {activeTab === "admin_overview" && (
              <AdminCentreManager currentUser={currentUser} />
            )}
            {activeTab === "admin_audit" && (
              <AdminAuditLogViewer />
            )}
            {activeTab === "admin_payments" && (
              <AdminPaymentManager currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-border py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AnnaSetu — Smart Agricultural Procurement Coordination Platform • Smart India Hackathon</span>
          <span>"Farmer chooses. Staff operates. AnnaSetu predicts, recommends and coordinates."</span>
        </div>
      </footer>

      {/* Mock Identity Verification Modal */}
      {currentUser && (
        <MockVerificationModal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
