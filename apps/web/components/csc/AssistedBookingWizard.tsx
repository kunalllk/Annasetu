"use client";

import React, { useState, useEffect } from "react";
import { Store, Search, Sparkles, CheckCircle2, User, ArrowRight, Printer } from "lucide-react";
import { Commodity, DemoUser, RecommendationResult, RecommendedSlot } from "@/lib/types";
import { api } from "@/lib/api";

interface AssistedBookingWizardProps {
  currentUser: DemoUser;
}

export const AssistedBookingWizard: React.FC<AssistedBookingWizardProps> = ({ currentUser }) => {
  const [farmers, setFarmers] = useState<DemoUser[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCommodityId, setSelectedCommodityId] = useState("");
  const [expectedQty, setExpectedQty] = useState(50);
  const [preferredDate, setPreferredDate] = useState("");
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<RecommendedSlot | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Inline Add Farmer State
  const [showAddFarmer, setShowAddFarmer] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerMobile, setNewFarmerMobile] = useState("");
  const [newFarmerAadhaar, setNewFarmerAadhaar] = useState("");
  const [newFarmerVillage, setNewFarmerVillage] = useState("");
  const [newFarmerState, setNewFarmerState] = useState("Madhya Pradesh");
  const [addingFarmerLoading, setAddingFarmerLoading] = useState(false);
  const [addedSuccessName, setAddedSuccessName] = useState("");

  const handleAutoFillNewFarmer = () => {
    setNewFarmerName("Gurcharan Singh Brar");
    setNewFarmerMobile("98765 99421");
    setNewFarmerAadhaar("8921-4321-7654");
    setNewFarmerVillage("Kotkapura");
    setNewFarmerState("Punjab");
  };

  const handleRegisterNewFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmerName.trim()) return;
    setAddingFarmerLoading(true);
    try {
      const created = await api.registerFarmer({
        display_name: newFarmerName.trim(),
        mobile: newFarmerMobile.trim() || "98765 99421",
        aadhaar: newFarmerAadhaar.trim(),
        village: newFarmerVillage.trim() || "Kotkapura",
        state: newFarmerState,
      });

      setFarmers((prev) => [created, ...prev]);
      setSelectedFarmerId(created.id);
      setAddedSuccessName(created.display_name);
      setShowAddFarmer(false);
      setNewFarmerName("");
      setNewFarmerMobile("");
      setNewFarmerAadhaar("");
      setNewFarmerVillage("");
    } catch (err: any) {
      alert("Failed to register farmer: " + err.message);
    } finally {
      setAddingFarmerLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.getDemoUsers(), api.getCommodities()]).then(([users, comms]) => {
      const fList = users.filter((u) => u.role === "FARMER");
      setFarmers(fList);
      if (fList.length > 0) setSelectedFarmerId(fList[0].id);

      setCommodities(comms);
      if (comms.length > 0) setSelectedCommodityId(comms[0].id);
    });

    const d = new Date();
    d.setDate(d.getDate() + 2);
    setPreferredDate(d.toISOString().split("T")[0]);
  }, []);

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setConfirmedBooking(null);
    const farmerObj = farmers.find((f) => f.id === selectedFarmerId);
    try {
      const res = await api.recommendBooking({
        farmer_id: selectedFarmerId,
        commodity_id: selectedCommodityId,
        expected_quantity_q: Number(expectedQty),
        preferred_date: preferredDate,
        preferred_time_start: "10:00",
        preferred_time_end: "13:00",
        origin_lat: farmerObj?.lat || 23.2010,
        origin_lng: farmerObj?.lng || 75.8210,
      });
      setRecommendation(res);
      if (res.recommended) setSelectedSlot(res.recommended);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const startT = selectedSlot.slot_start.split("T")[1]?.slice(0, 5) || "10:00";
      const endT = selectedSlot.slot_end.split("T")[1]?.slice(0, 5) || "11:00";

      const bk = await api.createBooking({
        farmer_id: selectedFarmerId,
        centre_id: selectedSlot.centre_id,
        commodity_id: selectedCommodityId,
        booking_date: preferredDate,
        slot_start: startT,
        slot_end: endT,
        expected_quantity_q: Number(expectedQty),
        source: "CSC",
      });
      setConfirmedBooking(bk);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs">
        <div className="flex items-center gap-2 text-agro-800 font-bold text-xs uppercase tracking-wider mb-1">
          <Store className="w-4 h-4 text-grain-500" />
          <span>CSC Digital Seva Rural Kiosk Mode</span>
        </div>
        <h1 className="text-2xl font-black text-agro-950 font-serif">Assisted Farmer Booking Portal</h1>
        <p className="text-sm text-gray-600 mt-1">
          Operated by Village Level Entrepreneurs (VLEs) to assist farmers who require digital coordination support for government agricultural procurement.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Booking Confirmation Slip if successful */}
      {confirmedBooking && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">Appointment Successfully Booked</h3>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-bold text-agro-900 bg-agro-50 px-3 py-1.5 rounded-lg border border-agro-200"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Acknowledgement Slip</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-emerald-50/50 rounded-xl text-xs">
            <div>
              <span className="text-gray-500 block">Booking Reference:</span>
              <strong className="font-mono text-sm text-agro-950">{confirmedBooking.booking_number}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Farmer Name:</span>
              <strong className="text-gray-900">{confirmedBooking.farmer_name}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Procurement Centre:</span>
              <strong className="text-gray-900">{confirmedBooking.centre_name}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Slot Window:</span>
              <strong className="text-agro-900">{confirmedBooking.booking_date} ({confirmedBooking.slot_start}–{confirmedBooking.slot_end})</strong>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-snug">
            Hand over this printed acknowledgment or SMS confirmation to the farmer. When they arrive at the centre, staff will scan or verify this booking number.
          </p>

          <button
            onClick={() => setConfirmedBooking(null)}
            className="text-xs font-bold text-agro-800 hover:underline"
          >
            ← Book for Another Visiting Farmer
          </button>
        </div>
      )}

      {/* Step 1: Form */}
      {!confirmedBooking && (
        <form onSubmit={handleRecommend} className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Select Visiting Farmer
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddFarmer(!showAddFarmer)}
                  className="text-xs font-bold text-agro-800 hover:text-agro-950 flex items-center gap-1 bg-agro-50 hover:bg-agro-100 border border-agro-200 px-2 py-0.5 rounded-lg transition cursor-pointer shadow-xs"
                >
                  <span>{showAddFarmer ? "− Cancel" : "+ Add Farmer"}</span>
                </button>
              </div>

              {addedSuccessName && (
                <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Registered & Selected: {addedSuccessName}</span>
                </div>
              )}

              {/* Inline Add Farmer Form */}
              {showAddFarmer && (
                <div className="mb-3 p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-grain-400">Register New Farmer at Kiosk</span>
                    <button
                      type="button"
                      onClick={handleAutoFillNewFarmer}
                      className="bg-grain-500 hover:bg-grain-400 text-agro-950 font-black px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Fill Demo</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Full Name *</label>
                      <input
                        type="text"
                        placeholder="Farmer Name"
                        value={newFarmerName}
                        onChange={(e) => setNewFarmerName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Mobile Number *</label>
                      <input
                        type="tel"
                        placeholder="98XXX XXXXX"
                        value={newFarmerMobile}
                        onChange={(e) => setNewFarmerMobile(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Aadhaar (UIDAI)</label>
                      <input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX"
                        value={newFarmerAadhaar}
                        onChange={(e) => setNewFarmerAadhaar(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Village</label>
                      <input
                        type="text"
                        placeholder="Village"
                        value={newFarmerVillage}
                        onChange={(e) => setNewFarmerVillage(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">State</label>
                      <select
                        value={newFarmerState}
                        onChange={(e) => setNewFarmerState(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value="Punjab">Punjab</option>
                        <option value="Haryana">Haryana</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Bihar">Bihar</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Maharashtra">Maharashtra</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={addingFarmerLoading}
                    onClick={handleRegisterNewFarmer}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {addingFarmerLoading ? "Registering..." : "Save & Select This Farmer"}
                  </button>
                </div>
              )}

              <select
                value={selectedFarmerId}
                onChange={(e) => {
                  setSelectedFarmerId(e.target.value);
                  setAddedSuccessName("");
                }}
                className="w-full bg-surface-muted border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.display_name} ({f.village || "Village"}) • {f.mobile_masked}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Produce / Crop
              </label>
              <select
                value={selectedCommodityId}
                onChange={(e) => setSelectedCommodityId(e.target.value)}
                className="w-full bg-surface-muted border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900"
              >
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (MSP: ₹{c.msp_inr_per_q}/q)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Expected Harvest Weight (Quintals)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={expectedQty}
                onChange={(e) => setExpectedQty(Number(e.target.value))}
                className="w-full bg-surface-muted border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Preferred Appointment Date
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full bg-surface-muted border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-agro-800 hover:bg-agro-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-grain-400" />
              <span>{loading ? "Calculating..." : "Find Best Allocation"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Confirmation on Recommended Centre */}
      {recommendation?.recommended && !confirmedBooking && (
        <div className="bg-white rounded-2xl border-2 border-agro-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-agro-800 bg-agro-100 px-2 py-0.5 rounded">
              Recommended Centre
            </span>
            <span className="text-xs font-bold text-gray-700">
              Est. Wait: {recommendation.recommended.expected_wait_min} min
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-950">{recommendation.recommended.centre_name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {recommendation.recommended.distance_km} km away • Remaining Capacity: {(recommendation.recommended.remaining_capacity_q / 10).toFixed(1)} tonnes
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-agro-900 block">Slot Time:</span>
              <span className="text-sm font-black">{recommendation.recommended.slot_start.split("T")[1]?.slice(0, 5)} – {recommendation.recommended.slot_end.split("T")[1]?.slice(0, 5)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleBook}
              disabled={loading}
              className="flex items-center gap-2 bg-grain-500 hover:bg-grain-400 text-agro-950 font-black px-6 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Booking..." : "Confirm Booking for Farmer"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
