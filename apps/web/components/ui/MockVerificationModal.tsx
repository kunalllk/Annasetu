"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, Smartphone, X, CheckCircle2 } from "lucide-react";
import { DemoUser } from "@/lib/types";

interface MockVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DemoUser;
}

export const MockVerificationModal: React.FC<MockVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = () => {
    setOtpSent(true);
    setOtp(["4", "8", "2", "1", "9", "0"]); // Demo auto-fill
  };

  const handleVerify = () => {
    setVerified(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-surface-border animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-agro-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-agro-200 hover:text-white p-1 rounded-full hover:bg-agro-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-agro-800/80 rounded-xl border border-agro-700">
              <ShieldCheck className="w-6 h-6 text-grain-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Farmer Identity Verification</h3>
              <p className="text-xs text-agro-200">Demonstration Architecture Preview</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <span className="font-bold block mb-1">🔒 Hackathon Demo Safety Notice:</span>
            Production AnnaSetu uses DigiLocker eKYC & UIDAI Aadhaar OTP verification. For this evaluation prototype, masked demo credentials are used. No real Aadhaar data is processed.
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Demo Aadhaar / Government ID</label>
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-700">
                <Lock className="w-4 h-4 text-gray-400 mr-2" />
                <span>XXXX - XXXX - 4821</span>
                <span className="ml-auto text-xs bg-agro-100 text-agro-800 px-2 py-0.5 rounded font-sans font-medium">Pre-Verified</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Registered Mobile Number</label>
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-700">
                <Smartphone className="w-4 h-4 text-gray-400 mr-2" />
                <span>{currentUser.mobile_masked || "+91 98XXX XX100"}</span>
              </div>
            </div>

            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                className="w-full mt-2 bg-agro-800 hover:bg-agro-900 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
              >
                Send Mock Verification OTP
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-gray-700">Enter 6-Digit Mobile OTP</label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={digit}
                      readOnly
                      className="w-10 h-11 text-center font-bold text-lg border border-gray-300 rounded-lg bg-gray-50 text-agro-950 focus:outline-none"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 text-center">Demo OTP autofilled: 482190</p>

                {verified ? (
                  <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-semibold border border-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Identity Authenticated Successfully!
                  </div>
                ) : (
                  <button
                    onClick={handleVerify}
                    className="w-full bg-agro-700 hover:bg-agro-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
                  >
                    Verify & Continue
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
