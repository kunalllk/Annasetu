import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  let color = "bg-gray-100 text-gray-800 border-gray-200";
  let label = status.replace(/_/g, " ");

  switch (status) {
    case "CONFIRMED":
    case "BOOKED":
      color = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "ARRIVED":
      color = "bg-purple-50 text-purple-700 border-purple-200";
      break;
    case "WAITING":
      color = "bg-amber-50 text-amber-800 border-amber-200";
      break;
    case "WEIGHING":
    case "SERVING":
      color = "bg-orange-50 text-orange-800 border-orange-200 animate-pulse";
      break;
    case "QUALITY_CHECK":
      color = "bg-indigo-50 text-indigo-700 border-indigo-200";
      break;
    case "COMPLETED":
    case "ACCEPTED":
    case "PASSED":
    case "PAYMENT_COMPLETED":
      color = "bg-emerald-50 text-emerald-800 border-emerald-200";
      break;
    case "NO_SHOW":
    case "REJECTED":
    case "FAILED":
    case "CANCELLED":
      color = "bg-rose-50 text-rose-700 border-rose-200";
      break;
    case "PAYMENT_PENDING":
    case "PENDING":
      color = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "OPEN":
      color = "bg-red-50 text-red-700 border-red-200";
      break;
    case "UNDER_REVIEW":
      color = "bg-yellow-50 text-yellow-800 border-yellow-200";
      break;
    case "RESOLVED":
      color = "bg-teal-50 text-teal-700 border-teal-200";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color} ${className}`}
    >
      {label}
    </span>
  );
};
