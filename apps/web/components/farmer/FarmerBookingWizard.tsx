"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Calendar, Clock, Weight, MapPin, AlertCircle, ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { Commodity, DemoUser, RecommendationResult, RecommendedSlot } from "@/lib/types";
import { api } from "@/lib/api";

interface FarmerBookingWizardProps {
  currentUser: DemoUser;
  onBookingConfirmed: (booking: any) => void;
}

export const FarmerBookingWizard: React.FC<FarmerBookingWizardProps> = ({
  currentUser,
  onBookingConfirmed,
}) => {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCommodityId, setSelectedCommodityId] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState<number>(50);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTimeRange, setPreferredTimeRange] = useState("10:00-13:00");
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<RecommendedSlot | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    api.getCommodities().then((res) => {
      setCommodities(res);
      const wheat = res.find((c: Commodity) => c.code === "WHEAT");
      if (wheat) setSelectedCommodityId(wheat.id);
    });

    // Default to 2 days from now
    const d = new Date();
    d.setDate(d.getDate() + 2);
    setPreferredDate(d.toISOString().split("T")[0]);
  }, []);

  const handleGetRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoadingRecommendation(true);
    setRecommendation(null);
    setSelectedSlot(null);

    const [tStart, tEnd] = preferredTimeRange.split("-");

    try {
      const result = await api.recommendBooking({
        farmer_id: currentUser.id,
        commodity_id: selectedCommodityId,
        expected_quantity_q: Number(expectedQuantity),
        preferred_date: preferredDate,
        preferred_time_start: tStart,
        preferred_time_end: tEnd,
        origin_lat: currentUser.lat || 23.2010,
        origin_lng: currentUser.lng || 75.8210,
      });

      setRecommendation(result);
      if (result.recommended) {
        setSelectedSlot(result.recommended);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate recommendation");
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setBookingLoading(true);
    setErrorMsg("");

    try {
      const startTime = selectedSlot.slot_start.split("T")[1]?.slice(0, 5) || "10:30";
      const endTime = selectedSlot.slot_end.split("T")[1]?.slice(0, 5) || "11:00";

      const newBooking = await api.createBooking({
        farmer_id: currentUser.id,
        centre_id: selectedSlot.centre_id,
        commodity_id: selectedCommodityId,
        booking_date: preferredDate,
        slot_start: startTime,
        slot_end: endTime,
        expected_quantity_q: Number(expectedQuantity),
        source: "FARMER",
      }, currentUser);

      onBookingConfirmed(newBooking);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book slot");
    } finally {
      setBookingLoading(false);
    }
  };

  const selectedCommodity = commodities.find((c) => c.id === selectedCommodityId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs">
        <div className="flex items-center gap-2.5 text-agro-800 font-bold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 text-grain-500" />
          <span>Intelligent Procurement Coordination</span>
        </div>
        <h1 className="text-2xl font-black text-agro-950 font-serif">Book Agricultural Produce Procurement</h1>
        <p className="text-sm text-gray-600 mt-1">
          Enter your harvest quantity and schedule. AnnaSetu’s Smart Engine analyzes centre capacity, wait times, and physical throughput to recommend the optimal procurement slot.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Notice:</span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Step 1: Booking Preferences Form */}
      <form onSubmit={handleGetRecommendations} className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs space-y-6">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-agro-100 text-agro-800 text-xs flex items-center justify-center font-bold">1</span>
          Produce & Schedule Preferences
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Commodity */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Crop / Commodity
            </label>
            <select
              value={selectedCommodityId}
              onChange={(e) => setSelectedCommodityId(e.target.value)}
              className="w-full bg-surface-muted border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-600"
            >
              {commodities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (MSP: ₹{c.msp_inr_per_q}/q)
                </option>
              ))}
            </select>
            {selectedCommodity && (
              <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
                Official MSP: <span className="font-bold text-agro-800">₹{selectedCommodity.msp_inr_per_q} per quintal</span>
              </p>
            )}
          </div>

          {/* Expected Quantity in Quintals */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Expected Harvest Quantity (Quintals)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={500}
                value={expectedQuantity}
                onChange={(e) => setExpectedQuantity(Number(e.target.value))}
                className="w-full bg-surface-muted border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-600 pr-16"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-500 pointer-events-none">
                quintals
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              10 quintals = 1 Metric Tonne ({roundTonnes(expectedQuantity)} tonnes)
            </p>
          </div>

          {/* Preferred Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Preferred Appointment Date
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full bg-surface-muted border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-600"
              required
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
              Fairness policy: Exactly one active booking per day per farmer.
            </p>
          </div>

          {/* Preferred Time Window */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Preferred Time Window
            </label>
            <select
              value={preferredTimeRange}
              onChange={(e) => setPreferredTimeRange(e.target.value)}
              className="w-full bg-surface-muted border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-600"
            >
              <option value="09:00-12:00">Morning Session (09:00 AM – 12:00 PM)</option>
              <option value="10:00-13:00">Midday Session (10:00 AM – 01:00 PM)</option>
              <option value="13:00-16:00">Afternoon Session (01:00 PM – 04:00 PM)</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1.5">Centres operate in 30-minute appointment windows.</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loadingRecommendation}
            className="flex items-center gap-2 bg-agro-800 hover:bg-agro-900 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-grain-400" />
            <span>{loadingRecommendation ? "Analyzing Centres & Capacity..." : "Analyze & Recommend Centres"}</span>
          </button>
        </div>
      </form>

      {/* Step 2: Recommendation Results */}
      {recommendation && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-agro-800 text-white text-xs flex items-center justify-center font-bold">2</span>
              Smart Engine Recommendations
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              Weighted by: Wait (35%) • Capacity (25%) • Distance (20%)
            </span>
          </div>

          {recommendation.recommended ? (
            <div className="space-y-4">
              {/* HERO Recommended Card */}
              <div
                onClick={() => setSelectedSlot(recommendation.recommended!)}
                className={`relative rounded-2xl p-6 border-2 transition cursor-pointer shadow-md ${
                  selectedSlot?.centre_id === recommendation.recommended.centre_id
                    ? "bg-emerald-50/50 border-agro-700 ring-2 ring-agro-600/30"
                    : "bg-white border-gray-200 hover:border-agro-400"
                }`}
              >
                {/* Winner Ribbon */}
                <div className="absolute -top-3 left-6 bg-agro-800 text-grain-300 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>★ AnnaSetu Top Recommendation</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{recommendation.recommended.centre_name}</h3>
                      <span className="text-xs font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {recommendation.recommended.centre_code}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-2 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-agro-700" />
                        {recommendation.recommended.distance_km} km away
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Estimated Wait: <strong className="text-amber-900 font-bold">{recommendation.recommended.expected_wait_min} min</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Weight className="w-3.5 h-3.5 text-blue-600" />
                        Remaining Storage: <strong className="text-blue-900 font-bold">{roundTonnes(recommendation.recommended.remaining_capacity_q)} tonnes</strong>
                      </span>
                    </div>

                    {/* Explanations */}
                    <div className="flex flex-wrap gap-2 mt-3.5">
                      {recommendation.recommended.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs bg-emerald-100/80 text-emerald-900 font-semibold px-2.5 py-1 rounded-lg border border-emerald-200"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Recommended Slot
                    </span>
                    <div className="text-lg font-black text-agro-900">
                      {formatTime(recommendation.recommended.slot_start)} – {formatTime(recommendation.recommended.slot_end)}
                    </div>
                    <div className="mt-2">
                      <span className="text-xs bg-agro-100 text-agro-800 font-bold px-2 py-0.5 rounded">
                        Match Score: {(recommendation.recommended.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternatives List */}
              {recommendation.alternatives.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Alternative Available Centres (Farmer Chooses Freely)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recommendation.alternatives.map((alt) => {
                      const isSelected = selectedSlot?.centre_id === alt.centre_id;
                      return (
                        <div
                          key={alt.centre_id}
                          onClick={() => setSelectedSlot(alt)}
                          className={`p-4 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? "bg-agro-50/70 border-agro-700 ring-1 ring-agro-700"
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-gray-900">{alt.centre_name}</span>
                            <span className="text-[11px] font-semibold text-gray-500">{alt.distance_km} km</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Slot: {formatTime(alt.slot_start)} – {formatTime(alt.slot_end)}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                            <span>Wait: ~{alt.expected_wait_min} min</span>
                            <span className="text-[11px] font-medium text-agro-800 bg-agro-50 px-1.5 py-0.5 rounded border border-agro-100">
                              Cap: {roundTonnes(alt.remaining_capacity_q)} t
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Final Confirmation Action Bar */}
              {selectedSlot && (
                <div className="p-4 bg-agro-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                  <div>
                    <span className="text-xs text-agro-200 block">Chosen Appointment</span>
                    <span className="text-sm font-bold">
                      {selectedSlot.centre_name} • {preferredDate} ({formatTime(selectedSlot.slot_start)}–{formatTime(selectedSlot.slot_end)})
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmBooking}
                    disabled={bookingLoading}
                    className="w-full sm:w-auto bg-grain-500 hover:bg-grain-400 text-agro-950 font-black px-6 py-2.5 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{bookingLoading ? "Confirming Appointment..." : "Confirm My Appointment"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-2xl border border-gray-200 text-center text-gray-600">
              No suitable centres found for the requested criteria. Please adjust your date or quantity.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function roundTonnes(q: number): string {
  return (q / 10.0).toFixed(1);
}

function formatTime(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("T")[1];
  if (!parts) return isoStr;
  return parts.slice(0, 5);
}
