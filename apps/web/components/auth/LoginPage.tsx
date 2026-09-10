"use client";

import React, { useState } from "react";
import { 
  User, 
  Building2, 
  Store, 
  Shield, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  KeyRound, 
  Phone, 
  CreditCard, 
  MapPin, 
  Sparkles,
  Wheat,
  Lock,
  BadgeCheck,
  Building
} from "lucide-react";
import { DemoUser } from "@/lib/types";
import { api, setStoredSession } from "@/lib/api";

interface LoginPageProps {
  allUsers: DemoUser[];
  onLoginSuccess: (user: DemoUser) => void;
  onResetDemo: () => void;
}

type RoleType = "FARMER" | "STAFF" | "CSC" | "ADMIN";

export const LoginPage: React.FC<LoginPageProps> = ({
  allUsers,
  onLoginSuccess,
  onResetDemo,
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [farmerMode, setFarmerMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Farmer Sign-up Form State
  const [signupForm, setSignupForm] = useState({
    name: "",
    aadhaar: "",
    mobile: "",
    village: "",
    district: "",
    state: "Madhya Pradesh",
    landholding: "Small (2-5 Acres)",
    commodity: "Wheat (Kanak)",
  });

  // Farmer Login Form State
  const [farmerMobile, setFarmerMobile] = useState("");
  const [farmerOtp, setFarmerOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Staff Form State
  const [staffOfficerId, setStaffOfficerId] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffCentre, setStaffCentre] = useState("centre-b");

  // CSC Form State
  const [cscVleId, setCscVleId] = useState("");
  const [cscPassword, setCscPassword] = useState("");

  // Admin Form State
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // --- Auto-Fill Demo Handlers ---

  const handleFillDemoSignup = () => {
    setSignupForm({
      name: "Balram Singh Yadav",
      aadhaar: "7841-9023-4512",
      mobile: "98765 43210",
      village: "Tarana",
      district: "Ujjain",
      state: "Madhya Pradesh",
      landholding: "Small (2.5 Acres)",
      commodity: "Wheat (Kanak)",
    });
  };

  const handleQuickFarmerLogin = (farmerId: string) => {
    const target = allUsers.find((u) => u.id === farmerId) || allUsers.find((u) => u.role === "FARMER");
    if (!target) return;
    setFarmerMobile(target.mobile_masked.replace(/\s+/g, "").replace("+91", ""));
    setFarmerOtp("749102");
    setOtpSent(true);

    // Auto log in after slight visual delay
    setLoading(true);
    setTimeout(() => {
      setStoredSession(target);
      onLoginSuccess(target);
      setLoading(false);
    }, 400);
  };

  const handleQuickStaffLogin = () => {
    setStaffOfficerId("OFFICER-MP-042");
    setStaffPassword("secure@mandi2026");
    setStaffCentre("centre-b");

    const staffUser = allUsers.find((u) => u.id === "staff-01") || allUsers.find((u) => u.role === "STAFF");
    if (staffUser) {
      setLoading(true);
      setTimeout(() => {
        setStoredSession(staffUser);
        onLoginSuccess(staffUser);
        setLoading(false);
      }, 400);
    }
  };

  const handleQuickCscLogin = () => {
    setCscVleId("CSC-VLE-5421");
    setCscPassword("vle@digital2026");

    const cscUser = allUsers.find((u) => u.role === "CSC");
    if (cscUser) {
      setLoading(true);
      setTimeout(() => {
        setStoredSession(cscUser);
        onLoginSuccess(cscUser);
        setLoading(false);
      }, 400);
    }
  };

  const handleQuickAdminLogin = () => {
    setAdminId("ADMIN-DIR-01");
    setAdminPassword("director@fci2026");

    const adminUser = allUsers.find((u) => u.role === "ADMIN");
    if (adminUser) {
      setLoading(true);
      setTimeout(() => {
        setStoredSession(adminUser);
        onLoginSuccess(adminUser);
        setLoading(false);
      }, 400);
    }
  };

  // --- Submission Handlers ---

  const handleFarmerSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.name.trim()) {
      setErrorMsg("Please enter farmer name");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const newFarmer = await api.registerFarmer({
        display_name: signupForm.name,
        mobile: signupForm.mobile || "98765 43210",
        aadhaar: signupForm.aadhaar,
        village: signupForm.village || "Tarana",
        district: signupForm.district || "Ujjain",
        state: signupForm.state,
      });

      setStoredSession(newFarmer);
      onLoginSuccess(newFarmer);
    } catch (err: any) {
      setErrorMsg(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFarmerLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerMobile) {
      setErrorMsg("Please enter mobile number");
      return;
    }
    if (!otpSent) {
      setOtpSent(true);
      setFarmerOtp("749102");
      return;
    }

    setLoading(true);
    // Find matching farmer or fallback to primary demo farmer
    const matchedFarmer = allUsers.find((u) => 
      u.role === "FARMER" && u.mobile_masked.replace(/\D/g, "").includes(farmerMobile.replace(/\D/g, "").slice(-4))
    ) || allUsers.find((u) => u.id === "farmer-01") || allUsers.find((u) => u.role === "FARMER");

    if (matchedFarmer) {
      setStoredSession(matchedFarmer);
      onLoginSuccess(matchedFarmer);
    } else {
      setErrorMsg("Farmer credentials not found");
    }
    setLoading(false);
  };

  const handleStaffLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const staff = allUsers.find((u) => u.id === "staff-01") || allUsers.find((u) => u.role === "STAFF");
    if (staff) {
      setStoredSession(staff);
      onLoginSuccess(staff);
    }
    setLoading(false);
  };

  const handleCscLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const csc = allUsers.find((u) => u.role === "CSC");
    if (csc) {
      setStoredSession(csc);
      onLoginSuccess(csc);
    }
    setLoading(false);
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const admin = allUsers.find((u) => u.role === "ADMIN");
    if (admin) {
      setStoredSession(admin);
      onLoginSuccess(admin);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 flex flex-col justify-between selection:bg-grain-500 selection:text-agro-950">
      {/* Top Gov Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-grain-400 to-grain-600 flex items-center justify-center text-agro-950 font-black shadow-inner shadow-grain-200">
              <Wheat className="w-6 h-6 text-agro-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white font-serif">AnnaSetu</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-grain-500/20 text-grain-400 border border-grain-500/30">
                  National Grid
                </span>
              </div>
              <p className="text-xs text-slate-400">अन्नसेतु • Smart Agricultural Procurement Coordination Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm("Reset AnnaSetu database to pristine initial demo state?")) {
                  api.resetSimulation().then(onResetDemo);
                }
              }}
              className="text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col justify-center">
        {!selectedRole ? (
          /* STEP 1: Persona Selection */
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-agro-800/80 text-grain-300 border border-agro-700">
                Secure National Portal Login
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white font-serif tracking-tight">
                Who is logging in today?
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Select your designated role to enter the AnnaSetu unified agricultural procurement ecosystem.
              </p>
            </div>

            {/* 4 Persona Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto pt-4">
              {/* Card 1: Farmer */}
              <button
                onClick={() => {
                  setSelectedRole("FARMER");
                  setFarmerMode("login");
                  setErrorMsg("");
                }}
                className="group relative bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-grain-500/60 rounded-3xl p-6 text-left transition-all duration-300 shadow-lg hover:shadow-grain-500/10 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-agro-900/80 border border-agro-700 text-grain-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wheat className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold text-grain-400 uppercase tracking-wider mb-1">
                    किसान पोर्टल
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-grain-300 transition-colors">
                    Farmer
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Book delivery slots, view real-time Mandi token queues, download digital weighing receipts, and check PFMS payments.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-grain-400 group-hover:text-grain-300">
                  <span>Login / Register</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Card 2: Procurement Center */}
              <button
                onClick={() => {
                  setSelectedRole("STAFF");
                  setErrorMsg("");
                }}
                className="group relative bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 rounded-3xl p-6 text-left transition-all duration-300 shadow-lg hover:shadow-amber-500/10 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                    खरीद केंद्र कर्मचारी
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    Procurement Center
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Mandi gate arrival verification, electronic weighbridge logging, FAQ grain quality testing, and active queue coordination.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
                  <span>Officer Login</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Card 3: CSC Operator */}
              <button
                onClick={() => {
                  setSelectedRole("CSC");
                  setErrorMsg("");
                }}
                className="group relative bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/60 rounded-3xl p-6 text-left transition-all duration-300 shadow-lg hover:shadow-sky-500/10 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-sky-950/60 border border-sky-800/80 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Store className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
                    डिजिटल सेवा केंद्र
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                    CSC Operator
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Assisted village kiosk portal operated by VLEs to register new farmers and book procurement slots for non-digital growers.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-sky-400 group-hover:text-sky-300">
                  <span>Kiosk Login</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Card 4: Super Admin */}
              <button
                onClick={() => {
                  setSelectedRole("ADMIN");
                  setErrorMsg("");
                }}
                className="group relative bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/60 rounded-3xl p-6 text-left transition-all duration-300 shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-800/80 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                    खाद्य एवं नागरिक आपूर्ति
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    Super Admin
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    National directorate overview, live mandi congestion alerts, storage capacity rebalancing, and tamper-proof audit trails.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300">
                  <span>Directorate Entry</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: Role-Specific Auth Form */
          <div className="max-w-xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setSelectedRole(null);
                setErrorMsg("");
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-6 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Role Selection</span>
            </button>

            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              {/* FARMER AUTH */}
              {selectedRole === "FARMER" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-grain-400 uppercase">
                        <Wheat className="w-4 h-4 text-grain-400" />
                        <span>Farmer Portal</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white font-serif mt-1">
                        {farmerMode === "login" ? "Farmer Login" : "New Farmer Registration"}
                      </h2>
                    </div>

                    {/* Mode Toggle Tabs */}
                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setFarmerMode("login");
                          setErrorMsg("");
                        }}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          farmerMode === "login"
                            ? "bg-grain-500 text-agro-950 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Login
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFarmerMode("signup");
                          setErrorMsg("");
                        }}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          farmerMode === "signup"
                            ? "bg-grain-500 text-agro-950 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  {/* FARMER SIGN UP */}
                  {farmerMode === "signup" && (
                    <form onSubmit={handleFarmerSignupSubmit} className="space-y-4">
                      <div className="flex justify-between items-center bg-agro-950/80 border border-agro-800 rounded-2xl p-3 text-xs">
                        <div className="text-grain-300 font-medium">
                          Quick Demo Hackathon Mode
                        </div>
                        <button
                          type="button"
                          onClick={handleFillDemoSignup}
                          className="bg-grain-500 hover:bg-grain-400 text-agro-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Fill Demo Details</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Farmer Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Balram Singh"
                            value={signupForm.name}
                            onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-grain-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Mobile Number *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 98765 43210"
                            value={signupForm.mobile}
                            onChange={(e) => setSignupForm({ ...signupForm, mobile: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-grain-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                            <span>Aadhaar Number *</span>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                              <BadgeCheck className="w-3 h-3" /> UIDAI Linked
                            </span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 7841-9023-4512"
                            value={signupForm.aadhaar}
                            onChange={(e) => setSignupForm({ ...signupForm, aadhaar: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-grain-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            State *
                          </label>
                          <select
                            value={signupForm.state}
                            onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-grain-500"
                          >
                            <option value="Madhya Pradesh">Madhya Pradesh (MP)</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Uttar Pradesh">Uttar Pradesh (UP)</option>
                            <option value="Bihar">Bihar</option>
                            <option value="West Bengal">West Bengal</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Maharashtra">Maharashtra</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Village & Tehsil
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Tarana"
                            value={signupForm.village}
                            onChange={(e) => setSignupForm({ ...signupForm, village: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-grain-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            District
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Ujjain"
                            value={signupForm.district}
                            onChange={(e) => setSignupForm({ ...signupForm, district: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-grain-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-grain-500 hover:bg-grain-400 text-agro-950 font-black py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? "Registering Farmer..." : "Register & Enter Farmer Portal"}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* FARMER LOGIN */}
                  {farmerMode === "login" && (
                    <form onSubmit={handleFarmerLoginSubmit} className="space-y-4">
                      {/* One-Click Quick Login Buttons */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-grain-400" />
                            One-Click Demo Farmer Logins:
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickFarmerLogin("farmer-01")}
                            className="text-left bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-grain-500/50 p-2.5 rounded-xl transition cursor-pointer"
                          >
                            <div className="text-xs font-bold text-white">Ramkishore Yadav</div>
                            <div className="text-[11px] text-grain-400">Tarana, Ujjain (MP)</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickFarmerLogin("farmer-02")}
                            className="text-left bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-grain-500/50 p-2.5 rounded-xl transition cursor-pointer"
                          >
                            <div className="text-xs font-bold text-white">Harpreet Singh</div>
                            <div className="text-[11px] text-grain-400">Nilokheri, Karnal (HR)</div>
                          </button>
                        </div>
                      </div>

                      <div className="relative flex py-1 items-center">
                        <div className="grow border-t border-slate-800"></div>
                        <span className="shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Or Enter Mobile Number</span>
                        <div className="grow border-t border-slate-800"></div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Registered Mobile Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm font-bold">
                            +91
                          </div>
                          <input
                            type="tel"
                            required
                            placeholder="98XXX XX101"
                            value={farmerMobile}
                            onChange={(e) => setFarmerMobile(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-grain-500"
                          />
                        </div>
                      </div>

                      {otpSent ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                            <span>One-Time Password (OTP)</span>
                            <span className="text-[10px] text-grain-400">OTP Sent: 749102</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="6-digit OTP"
                            value={farmerOtp}
                            onChange={(e) => setFarmerOtp(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono tracking-widest text-center focus:outline-hidden focus:border-grain-500"
                          />
                        </div>
                      ) : null}

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-grain-500 hover:bg-grain-400 text-agro-950 font-black py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {otpSent ? "Verify & Enter Portal" : "Send OTP"}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* PROCUREMENT CENTER AUTH */}
              {selectedRole === "STAFF" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>Procurement Center Depot</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white font-serif mt-1">
                      Mandi Officer Login
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Authorized procurement staff for gate check-in, moisture analysis, and weighing.
                    </p>
                  </div>

                  {/* One-Click Quick Demo Login */}
                  <div className="bg-amber-950/40 border border-amber-900/60 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-300">Demo Officer Login</div>
                      <div className="text-[11px] text-slate-300">S. K. Verma (Ujjain Agro Hub)</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickStaffLogin}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quick Login</span>
                    </button>
                  </div>

                  <form onSubmit={handleStaffLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Procurement Mandi Centre
                      </label>
                      <select
                        value={staffCentre}
                        onChange={(e) => setStaffCentre(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500"
                      >
                        <option value="centre-b">Ujjain Multi-Commodity Agro Hub (MP)</option>
                        <option value="centre-a">Karnal Central Grain Mandi (Haryana)</option>
                        <option value="centre-c">Nizamabad Regional Mega Depot (Telangana)</option>
                        <option value="centre-d">Alwar Krishi Upaj Mandi Yard (Rajasthan)</option>
                        <option value="centre-e">Burdwan Coarse Grain Depot (West Bengal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Officer / Employee ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. OFFICER-MP-042"
                        value={staffOfficerId}
                        onChange={(e) => setStaffOfficerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Security PIN / Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Access Mandi Gate & Queue Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* CSC OPERATOR AUTH */}
              {selectedRole === "CSC" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase">
                      <Store className="w-4 h-4 text-sky-400" />
                      <span>Digital Seva Kendra</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white font-serif mt-1">
                      CSC Kiosk Operator Login
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Village Level Entrepreneur (VLE) portal for assisted farmer registrations and slot allocations.
                    </p>
                  </div>

                  {/* One-Click Quick Demo Login */}
                  <div className="bg-sky-950/40 border border-sky-900/60 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-sky-300">Demo VLE Login</div>
                      <div className="text-[11px] text-slate-300">Pravin Kumar (CSC Digital Seva)</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickCscLogin}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quick Login</span>
                    </button>
                  </div>

                  <form onSubmit={handleCscLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        CSC VLE ID / Kiosk Code
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CSC-VLE-5421"
                        value={cscVleId}
                        onChange={(e) => setCscVleId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••"
                        value={cscPassword}
                        onChange={(e) => setCscPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-sky-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Open Assisted Farmer Kiosk</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUPER ADMIN AUTH */}
              {selectedRole === "ADMIN" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Directorate of Food & Public Distribution</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white font-serif mt-1">
                      Super Admin Access
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Government supervisory terminal for national grid balancing and PFMS integration logs.
                    </p>
                  </div>

                  {/* One-Click Quick Demo Login */}
                  <div className="bg-purple-950/40 border border-purple-900/60 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-purple-300">Demo Directorate Login</div>
                      <div className="text-[11px] text-slate-300">Dr. Rajeshwar Sharma (Director General)</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickAdminLogin}
                      className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quick Login</span>
                    </button>
                  </div>

                  <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Directorate Admin ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ADMIN-DIR-01"
                        value={adminId}
                        onChange={(e) => setAdminId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Administrative Passkey
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-purple-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-500 hover:bg-purple-400 text-slate-950 font-black py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Enter Directorate Control Center</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-4 text-center text-xs text-slate-500">
        <p>AnnaSetu • Designed for Digital India & National Agricultural Fair Procurement • Rabi 2026</p>
      </footer>
    </div>
  );
};
