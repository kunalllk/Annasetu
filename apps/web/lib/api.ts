import { DemoUser } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

export function getStoredSession(): DemoUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("annasetu_demo_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(user: DemoUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("annasetu_demo_user", JSON.stringify(user));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("annasetu_demo_user");
}

function getHeaders(user?: DemoUser | null): HeadersInit {
  const session = user || getStoredSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session) {
    headers["X-Demo-Role"] = session.role;
    headers["X-Demo-User-Id"] = session.id;
    if (session.centre_id) {
      headers["X-Demo-Centre-Id"] = session.centre_id;
    }
  }
  return headers;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}, user?: DemoUser | null): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(user),
      ...(options.headers || {}),
    },
  });

  const json = await response.json();
  if (!response.ok) {
    const errorMsg = json.detail?.message || json.detail || json.message || "An unexpected error occurred";
    throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
  }
  return json.data as T;
}

export const api = {
  // Commodities & Centres
  getCommodities: () => apiFetch<any[]>("/commodities"),
  getCentres: () => apiFetch<any[]>("/centres"),
  getCentreDetail: (id: string) => apiFetch<any>(`/centres/${id}`),

  // Auth & Demo Users
  getDemoUsers: () => apiFetch<DemoUser[]>("/auth/demo-users"),
  registerFarmer: (payload: any) => apiFetch<DemoUser>("/farmers", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  // Bookings & Smart Recommendation
  recommendBooking: (payload: any) => apiFetch<any>("/bookings/recommend", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  createBooking: (payload: any, user?: DemoUser) => apiFetch<any>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  }, user),
  getBooking: (id: string) => apiFetch<any>(`/bookings/${id}`),
  getFarmerBookings: (farmerId: string) => apiFetch<any[]>(`/farmers/${farmerId}/bookings`),
  cancelBooking: (id: string, reason?: string) => apiFetch<any>(`/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }),
  rescheduleBooking: (id: string, payload: any) => apiFetch<any>(`/bookings/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  // Staff Operations
  getStaffDashboard: (user?: DemoUser) => apiFetch<any>("/staff/dashboard", {}, user),
  getStaffQueue: (user?: DemoUser) => apiFetch<any[]>("/staff/queue", {}, user),
  markArrived: (bookingId: string, arrivalNote?: string, user?: DemoUser) => apiFetch<any>(`/staff/bookings/${bookingId}/arrive`, {
    method: "POST",
    body: JSON.stringify({ arrival_note: arrivalNote }),
  }, user),
  markNoShow: (bookingId: string, reason: string, user?: DemoUser) => apiFetch<any>(`/staff/bookings/${bookingId}/no-show`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }, user),
  recordWeighing: (bookingId: string, actualQuantityQ: number, note?: string, user?: DemoUser) => apiFetch<any>(`/staff/procurements/${bookingId}/weigh`, {
    method: "POST",
    body: JSON.stringify({ actual_quantity_q: actualQuantityQ, operator_note: note }),
  }, user),
  recordQuality: (bookingId: string, status: string, reason: string, user?: DemoUser) => apiFetch<any>(`/staff/procurements/${bookingId}/quality`, {
    method: "POST",
    body: JSON.stringify({ status, reason }),
  }, user),
  completeProcurement: (bookingId: string, note?: string, user?: DemoUser) => apiFetch<any>(`/staff/procurements/${bookingId}/complete`, {
    method: "POST",
    body: JSON.stringify({ completion_note: note }),
  }, user),

  // Farmer Transparency & Dispute
  getFarmerTransactions: (farmerId: string) => apiFetch<any[]>(`/farmers/${farmerId}/transactions`),
  confirmQuantity: (procurementId: string, user?: DemoUser) => apiFetch<any>(`/procurements/${procurementId}/confirm-quantity`, {
    method: "POST",
    body: JSON.stringify({ confirmed: true }),
  }, user),
  createDispute: (procurementId: string, payload: any, user?: DemoUser) => apiFetch<any>(`/procurements/${procurementId}/disputes`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, user),
  getDisputes: () => apiFetch<any[]>("/disputes"),

  // Notifications
  getNotifications: (user?: DemoUser) => apiFetch<any[]>("/notifications", {}, user),

  // Simulation
  runSimulation: (centreId: string, action: string, user?: DemoUser) => apiFetch<any>("/simulation/run", {
    method: "POST",
    body: JSON.stringify({ centre_id: centreId, action }),
  }, user),
  resetSimulation: () => apiFetch<any>("/simulation/reset", {
    method: "POST",
    body: JSON.stringify({}),
  }),

  // Admin
  getAdminCentres: () => apiFetch<any[]>("/admin/centres"),
  updateAdminCentre: (id: string, payload: any, user?: DemoUser) => apiFetch<any>(`/admin/centres/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, user),
  getAuditLogs: (limit: number = 50, centreId?: string) => apiFetch<any[]>(`/admin/audit?limit=${limit}${centreId ? `&centre_id=${centreId}` : ""}`),
  updatePaymentStatus: (procurementId: string, status: string, user?: DemoUser) => apiFetch<any>(`/admin/payments/${procurementId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, user),
  getCentreAnalytics: (centreId?: string) => apiFetch<any>(`/analytics/centre${centreId ? `?centre_id=${centreId}` : ""}`),
};
