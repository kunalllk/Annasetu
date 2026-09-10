// In-memory persistent demo store for Vercel Serverless deployment
import {
  DemoUser, Commodity, Centre, RecommendedSlot, RecommendationResult,
  Booking, QueueRow, StaffDashboardKPIs, TransactionRecord, AuditLogItem, NotificationItem
} from "./types";

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Baseline Initial Seed State
function createInitialState() {
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const commodities: Commodity[] = [
    { id: "comm-1", code: "WHEAT", name: "Wheat (Kanak)", category: "Cereal", default_unit: "quintal", msp_inr_per_q: 2275.0, active: true },
    { id: "comm-2", code: "PADDY", name: "Paddy (Dhan - Common)", category: "Cereal", default_unit: "quintal", msp_inr_per_q: 2183.0, active: true },
    { id: "comm-3", code: "JOWAR", name: "Jowar (Hybrid)", category: "Coarse Grain / Millet", default_unit: "quintal", msp_inr_per_q: 3180.0, active: true },
    { id: "comm-4", code: "BAJRA", name: "Bajra", category: "Millet", default_unit: "quintal", msp_inr_per_q: 2500.0, active: true },
    { id: "comm-5", code: "RAGI", name: "Ragi (Finger Millet)", category: "Nutri-Cereal", default_unit: "quintal", msp_inr_per_q: 3846.0, active: true },
    { id: "comm-6", code: "MAIZE", name: "Maize (Makka)", category: "Coarse Grain", default_unit: "quintal", msp_inr_per_q: 2090.0, active: true },
  ];

  const centres: Centre[] = [
    {
      id: "centre-a",
      code: "CENTRE-A",
      name: "Karnal Central Grain Mandi",
      address: "APMC Market Complex, GT Road, Karnal 132001, Haryana",
      lat: 29.6857,
      lng: 76.9905,
      operating_start: "09:00",
      operating_end: "17:00",
      active: true,
      capacity: {
        storage_capacity_q: 6000.0,
        occupied_committed_q: 5200.0, // 86% full - Congested!
        remaining_storage_q: 800.0,
        storage_capacity_tonnes: 600.0,
        occupied_committed_tonnes: 520.0,
        remaining_storage_tonnes: 80.0,
        daily_processing_capacity_q: 300.0,
        processed_today_q: 180.0,
        remaining_daily_processing_q: 120.0,
        daily_processing_capacity_tonnes: 30.0,
        processed_today_tonnes: 18.0,
        remaining_daily_processing_tonnes: 12.0,
        processing_rate_q_per_hr: 8.0, // Slow rate
      },
      commodities: commodities.filter((c) => c.code !== "RAGI"),
    },
    {
      id: "centre-b",
      code: "CENTRE-B",
      name: "Ujjain Multi-Commodity Agro Hub",
      address: "Krishi Upaj Mandi Complex, Agar Road, Ujjain 456006, Madhya Pradesh",
      lat: 23.1765,
      lng: 75.7885,
      operating_start: "09:00",
      operating_end: "17:00",
      active: true,
      capacity: {
        storage_capacity_q: 5000.0,
        occupied_committed_q: 1800.0, // 320 tonnes free! High capacity fit
        remaining_storage_q: 3200.0,
        storage_capacity_tonnes: 500.0,
        occupied_committed_tonnes: 180.0,
        remaining_storage_tonnes: 320.0,
        daily_processing_capacity_q: 600.0,
        processed_today_q: 350.0,
        remaining_daily_processing_q: 250.0,
        daily_processing_capacity_tonnes: 60.0,
        processed_today_tonnes: 35.0,
        remaining_daily_processing_tonnes: 25.0,
        processing_rate_q_per_hr: 25.0, // Fast rate!
      },
      commodities: commodities, // Supports all 6
    },
    {
      id: "centre-c",
      code: "CENTRE-C",
      name: "Nizamabad Regional Mega Storage Depot",
      address: "State Warehousing & APMC Logistics Park, Nizamabad 503001, Telangana",
      lat: 18.6725,
      lng: 78.0941,
      operating_start: "09:00",
      operating_end: "17:00",
      active: true,
      capacity: {
        storage_capacity_q: 15000.0,
        occupied_committed_q: 4500.0,
        remaining_storage_q: 10500.0,
        storage_capacity_tonnes: 1500.0,
        occupied_committed_tonnes: 450.0,
        remaining_storage_tonnes: 1050.0,
        daily_processing_capacity_q: 1000.0,
        processed_today_q: 420.0,
        remaining_daily_processing_q: 580.0,
        daily_processing_capacity_tonnes: 100.0,
        processed_today_tonnes: 42.0,
        remaining_daily_processing_tonnes: 58.0,
        processing_rate_q_per_hr: 30.0,
      },
      commodities: commodities.filter((c) => ["WHEAT", "PADDY", "MAIZE"].includes(c.code)),
    },
    {
      id: "centre-d",
      code: "CENTRE-D",
      name: "Alwar Krishi Upaj Mandi Yard",
      address: "Matsya Industrial Area APMC Terminal, Alwar 301001, Rajasthan",
      lat: 27.5530,
      lng: 76.6346,
      operating_start: "09:00",
      operating_end: "17:00",
      active: true,
      capacity: {
        storage_capacity_q: 3500.0,
        occupied_committed_q: 2900.0,
        remaining_storage_q: 600.0,
        storage_capacity_tonnes: 350.0,
        occupied_committed_tonnes: 290.0,
        remaining_storage_tonnes: 60.0,
        daily_processing_capacity_q: 350.0,
        processed_today_q: 310.0, // Near full
        remaining_daily_processing_q: 40.0,
        daily_processing_capacity_tonnes: 35.0,
        processed_today_tonnes: 31.0,
        remaining_daily_processing_tonnes: 4.0,
        processing_rate_q_per_hr: 12.0,
      },
      commodities: commodities.filter((c) => ["WHEAT", "JOWAR", "BAJRA"].includes(c.code)),
    },
    {
      id: "centre-e",
      code: "CENTRE-E",
      name: "Burdwan Coarse Grain & Rice Depot",
      address: "FCI Complex & APMC Sub-Yard, Nababhat, Bardhaman 713101, West Bengal",
      lat: 23.2324,
      lng: 87.8615,
      operating_start: "09:00",
      operating_end: "17:00",
      active: true,
      capacity: {
        storage_capacity_q: 4000.0,
        occupied_committed_q: 1200.0,
        remaining_storage_q: 2800.0,
        storage_capacity_tonnes: 400.0,
        occupied_committed_tonnes: 120.0,
        remaining_storage_tonnes: 280.0,
        daily_processing_capacity_q: 400.0,
        processed_today_q: 150.0,
        remaining_daily_processing_q: 250.0,
        daily_processing_capacity_tonnes: 40.0,
        processed_today_tonnes: 15.0,
        remaining_daily_processing_tonnes: 25.0,
        processing_rate_q_per_hr: 16.0,
      },
      commodities: commodities.filter((c) => ["JOWAR", "BAJRA", "RAGI", "MAIZE"].includes(c.code)), // NO WHEAT
    },
  ];

  // 35 Pan-India Farmers & Administrative Staff
  const users: DemoUser[] = [
    // Primary Demo Farmers representing North, Central, South, West, and East India
    { id: "farmer-01", role: "FARMER", display_name: "Ramkishore Yadav", mobile_masked: "+91 98XXX XX101", village: "Tarana, Ujjain", state: "Madhya Pradesh", lat: 23.201, lng: 75.821 },
    { id: "farmer-02", role: "FARMER", display_name: "Harpreet Singh", mobile_masked: "+91 98XXX XX102", village: "Nilokheri, Karnal", state: "Haryana", lat: 29.721, lng: 76.952 },
    { id: "farmer-03", role: "FARMER", display_name: "Gurpreet Singh Gill", mobile_masked: "+91 98XXX XX103", village: "Khanna, Ludhiana", state: "Punjab", lat: 30.702, lng: 76.215 },
    { id: "farmer-04", role: "FARMER", display_name: "Venkata Subba Rao", mobile_masked: "+91 98XXX XX104", village: "Armoor, Nizamabad", state: "Telangana", lat: 18.791, lng: 78.291 },
    { id: "farmer-05", role: "FARMER", display_name: "Manoj Meena", mobile_masked: "+91 98XXX XX105", village: "Behror, Alwar", state: "Rajasthan", lat: 27.887, lng: 76.281 },
    { id: "farmer-06", role: "FARMER", display_name: "Subhash Mondal", mobile_masked: "+91 98XXX XX106", village: "Memari, Bardhaman", state: "West Bengal", lat: 23.181, lng: 88.112 },
    { id: "farmer-07", role: "FARMER", display_name: "Rajeshwar Patil", mobile_masked: "+91 98XXX XX107", village: "Niphad, Nashik", state: "Maharashtra", lat: 20.082, lng: 74.112 },
    { id: "farmer-08", role: "FARMER", display_name: "Annamalai Reddiar", mobile_masked: "+91 98XXX XX108", village: "Kumbakonam, Thanjavur", state: "Tamil Nadu", lat: 10.961, lng: 79.382 },
    { id: "farmer-09", role: "FARMER", display_name: "Manjunath Gowda", mobile_masked: "+91 98XXX XX109", village: "Maddur, Mandya", state: "Karnataka", lat: 12.584, lng: 77.042 },
    { id: "farmer-10", role: "FARMER", display_name: "Bhupendra Chaudhari", mobile_masked: "+91 98XXX XX110", village: "Kadi, Mehsana", state: "Gujarat", lat: 23.298, lng: 72.331 },
    { id: "farmer-11", role: "FARMER", display_name: "Dinesh Chandra Sharma", mobile_masked: "+91 98XXX XX111", village: "Nawabganj, Barabanki", state: "Uttar Pradesh", lat: 26.928, lng: 81.189 },
    { id: "farmer-12", role: "FARMER", display_name: "Birendra Prasad Singh", mobile_masked: "+91 98XXX XX112", village: "Dumraon, Buxar", state: "Bihar", lat: 25.564, lng: 83.977 },
    { id: "farmer-13", role: "FARMER", display_name: "Joginder Pal", mobile_masked: "+91 98XXX XX113", village: "Pehowa, Kurukshetra", state: "Haryana", lat: 29.982, lng: 76.582 },
    { id: "farmer-14", role: "FARMER", display_name: "Balwant Dhillon", mobile_masked: "+91 98XXX XX114", village: "Baghapurana, Moga", state: "Punjab", lat: 30.816, lng: 75.172 },
    { id: "farmer-15", role: "FARMER", display_name: "Shivram Patel", mobile_masked: "+91 98XXX XX115", village: "Sonkatch, Dewas", state: "Madhya Pradesh", lat: 22.967, lng: 76.053 },
    { id: "farmer-16", role: "FARMER", display_name: "K. Srirama Murthy", mobile_masked: "+91 98XXX XX116", village: "Tenali, Guntur", state: "Andhra Pradesh", lat: 16.243, lng: 80.640 },
    { id: "farmer-17", role: "FARMER", display_name: "Prabhat Ranjan Jena", mobile_masked: "+91 98XXX XX117", village: "Attabira, Bargarh", state: "Odisha", lat: 21.334, lng: 83.621 },
    { id: "farmer-18", role: "FARMER", display_name: "Dipankar Saikia", mobile_masked: "+91 98XXX XX118", village: "Raha, Nagaon", state: "Assam", lat: 26.348, lng: 92.684 },
    { id: "farmer-19", role: "FARMER", display_name: "Raghunath Soren", mobile_masked: "+91 98XXX XX119", village: "Shikaripara, Dumka", state: "Jharkhand", lat: 24.268, lng: 87.249 },
    { id: "farmer-20", role: "FARMER", display_name: "Sukhwinder Kaur", mobile_masked: "+91 98XXX XX120", village: "Amloh, Fatehgarh Sahib", state: "Punjab", lat: 30.642, lng: 76.388 },
    { id: "farmer-21", role: "FARMER", display_name: "Sunita Devi Kushwaha", mobile_masked: "+91 98XXX XX121", village: "Dehri, Rohtas", state: "Bihar", lat: 24.952, lng: 84.031 },
    { id: "farmer-22", role: "FARMER", display_name: "Laxmi Narayan Rathore", mobile_masked: "+91 98XXX XX122", village: "Sangod, Kota", state: "Rajasthan", lat: 25.180, lng: 75.834 },
    { id: "farmer-23", role: "FARMER", display_name: "Chandrashekhar Hegde", mobile_masked: "+91 98XXX XX123", village: "Yellapur, Uttara Kannada", state: "Karnataka", lat: 14.619, lng: 74.844 },
    { id: "farmer-24", role: "FARMER", display_name: "Karthikeyan Selvam", mobile_masked: "+91 98XXX XX124", village: "Anaimalai, Coimbatore", state: "Tamil Nadu", lat: 10.660, lng: 77.008 },
    { id: "farmer-25", role: "FARMER", display_name: "Devendra Solanki", mobile_masked: "+91 98XXX XX125", village: "Petlad, Anand", state: "Gujarat", lat: 22.564, lng: 72.928 },
    { id: "farmer-26", role: "FARMER", display_name: "Gajanan Deshmukh", mobile_masked: "+91 98XXX XX126", village: "Morshi, Amravati", state: "Maharashtra", lat: 20.932, lng: 77.752 },
    { id: "farmer-27", role: "FARMER", display_name: "Babu Lal Verma", mobile_masked: "+91 98XXX XX127", village: "Ashta, Sehore", state: "Madhya Pradesh", lat: 23.203, lng: 77.084 },
    { id: "farmer-28", role: "FARMER", display_name: "Mahendra Pratap Singh", mobile_masked: "+91 98XXX XX128", village: "Maholi, Sitapur", state: "Uttar Pradesh", lat: 27.572, lng: 80.679 },
    { id: "farmer-29", role: "FARMER", display_name: "Tapan Kumar Roy", mobile_masked: "+91 98XXX XX129", village: "Dinhata, Cooch Behar", state: "West Bengal", lat: 26.323, lng: 89.451 },
    { id: "farmer-30", role: "FARMER", display_name: "Santosh Kumar Sahu", mobile_masked: "+91 98XXX XX130", village: "Abhanpur, Raipur", state: "Chhattisgarh", lat: 21.251, lng: 81.629 },
    { id: "farmer-31", role: "FARMER", display_name: "Ravinder Reddy", mobile_masked: "+91 98XXX XX131", village: "Miryalaguda, Nalgonda", state: "Telangana", lat: 16.871, lng: 79.562 },
    { id: "farmer-32", role: "FARMER", display_name: "Choudhary Ranjeet Ram", mobile_masked: "+91 98XXX XX132", village: "Pilibanga, Hanumangarh", state: "Rajasthan", lat: 29.581, lng: 74.321 },
    { id: "farmer-33", role: "FARMER", display_name: "Amarjit Singh Sandhu", mobile_masked: "+91 98XXX XX133", village: "Patti, Tarn Taran", state: "Punjab", lat: 31.452, lng: 74.928 },
    { id: "farmer-34", role: "FARMER", display_name: "Kishore Naik", mobile_masked: "+91 98XXX XX134", village: "Kuchinda, Sambalpur", state: "Odisha", lat: 21.468, lng: 83.978 },
    { id: "farmer-35", role: "FARMER", display_name: "Pooja Shrikant Shinde", mobile_masked: "+91 98XXX XX135", village: "Hatkanangle, Kolhapur", state: "Maharashtra", lat: 16.705, lng: 74.243 },
    // Staff & Administrative Officers
    { id: "staff-01", role: "STAFF", display_name: "S. K. Verma (Senior Procurement Officer)", mobile_masked: "+91 98XXX XX001", centre_id: "centre-b", centre_name: "Ujjain Multi-Commodity Agro Hub" },
    { id: "staff-02", role: "STAFF", display_name: "Manpreet Singh Sodhi (Gate Inspector)", mobile_masked: "+91 98XXX XX002", centre_id: "centre-a", centre_name: "Karnal Central Grain Mandi" },
    { id: "csc-01", role: "CSC", display_name: "Pravin Kumar (CSC Digital Seva Kendra)", mobile_masked: "+91 98XXX XX003" },
    { id: "admin-01", role: "ADMIN", display_name: "Dr. Rajeshwar Sharma (Director General)", mobile_masked: "+91 98XXX XX004" },
  ];

  // Today's Bookings
  const bookings: Booking[] = [
    {
      id: "bk-01",
      booking_number: "BK-2026-0901",
      farmer_id: "farmer-27",
      farmer_name: "Babu Lal Verma",
      farmer_mobile: "+91 98XXX XX127",
      centre_id: "centre-b",
      centre_name: "Ujjain Multi-Commodity Agro Hub",
      commodity_id: "comm-1",
      commodity_name: "Wheat (Kanak)",
      booking_date: todayStr,
      slot_start: "09:30",
      slot_end: "10:00",
      expected_quantity_q: 45.0,
      source: "FARMER",
      status: "WEIGHING",
      created_at: new Date().toISOString(),
      queue_position: 1,
      estimated_wait_min: 0,
    },
    {
      id: "bk-02",
      booking_number: "BK-2026-0902",
      farmer_id: "farmer-15",
      farmer_name: "Shivram Patel",
      farmer_mobile: "+91 98XXX XX115",
      centre_id: "centre-b",
      centre_name: "Ujjain Multi-Commodity Agro Hub",
      commodity_id: "comm-1",
      commodity_name: "Wheat (Kanak)",
      booking_date: todayStr,
      slot_start: "10:00",
      slot_end: "10:30",
      expected_quantity_q: 50.0,
      source: "FARMER",
      status: "ARRIVED",
      created_at: new Date().toISOString(),
      queue_position: 2,
      estimated_wait_min: 15,
      arrival_at: new Date().toISOString(),
    },
    {
      id: "bk-03",
      booking_number: "BK-2026-0903",
      farmer_id: "farmer-01",
      farmer_name: "Ramkishore Yadav",
      farmer_mobile: "+91 98XXX XX101",
      centre_id: "centre-b",
      centre_name: "Ujjain Multi-Commodity Agro Hub",
      commodity_id: "comm-1",
      commodity_name: "Wheat (Kanak)",
      booking_date: todayStr,
      slot_start: "10:30",
      slot_end: "11:00",
      expected_quantity_q: 60.0,
      source: "FARMER",
      status: "ARRIVED",
      created_at: new Date().toISOString(),
      queue_position: 3,
      estimated_wait_min: 30,
      arrival_at: new Date().toISOString(),
    },
    {
      id: "bk-04",
      booking_number: "BK-2026-0904",
      farmer_id: "farmer-21",
      farmer_name: "Sunita Devi Kushwaha",
      farmer_mobile: "+91 98XXX XX121",
      centre_id: "centre-b",
      centre_name: "Ujjain Multi-Commodity Agro Hub",
      commodity_id: "comm-2",
      commodity_name: "Paddy (Dhan)",
      booking_date: todayStr,
      slot_start: "11:00",
      slot_end: "11:30",
      expected_quantity_q: 40.0,
      source: "FARMER",
      status: "CONFIRMED",
      created_at: new Date().toISOString(),
      queue_position: 4,
      estimated_wait_min: 45,
    },
    {
      id: "bk-05",
      booking_number: "BK-2026-0905",
      farmer_id: "farmer-22",
      farmer_name: "Laxmi Narayan Rathore",
      farmer_mobile: "+91 98XXX XX122",
      centre_id: "centre-b",
      centre_name: "Ujjain Multi-Commodity Agro Hub",
      commodity_id: "comm-1",
      commodity_name: "Wheat (Kanak)",
      booking_date: todayStr,
      slot_start: "11:30",
      slot_end: "12:00",
      expected_quantity_q: 55.0,
      source: "FARMER",
      status: "CONFIRMED",
      created_at: new Date().toISOString(),
      queue_position: 5,
      estimated_wait_min: 60,
    }
  ];

  // Transactions
  const transactions: TransactionRecord[] = [
    {
      id: "tx-01",
      booking_id: "bk-cmpl-01",
      booking_number: "BK-CMPL-201",
      farmer_id: "farmer-01", // Ramkishore Yadav
      farmer_name: "Ramkishore Yadav",
      centre_name: "Ujjain Multi-Commodity Agro Hub",
      commodity_name: "Wheat (Kanak)",
      expected_quantity_q: 50.0,
      actual_quantity_q: 48.7,
      quantity_recorded_at: yesterdayStr,
      farmer_confirmed_at: null,
      quality_status: "PASSED",
      quality_reason: "Moisture 11.2%, Foreign matter <0.5% (FAQ Standard)",
      procurement_status: "ACCEPTED",
      payment_status: "PENDING",
      payment_reference: "PFMS-2026-GOI-90142",
      completed_at: yesterdayStr,
      disputes: [],
    },
    {
      id: "tx-02",
      booking_id: "bk-cmpl-02",
      booking_number: "BK-CMPL-202",
      farmer_id: "farmer-01",
      farmer_name: "Ramkishore Yadav",
      centre_name: "Ujjain Multi-Commodity Agro Hub",
      commodity_name: "Wheat (Kanak)",
      expected_quantity_q: 60.0,
      actual_quantity_q: 59.2,
      quantity_recorded_at: yesterdayStr,
      farmer_confirmed_at: yesterdayStr,
      quality_status: "PASSED",
      quality_reason: "Moisture 11.5% (FAQ Standard)",
      procurement_status: "ACCEPTED",
      payment_status: "COMPLETED",
      payment_reference: "PFMS-2026-GOI-90143",
      completed_at: yesterdayStr,
      disputes: [],
    },
  ];

  // Audit Logs
  const auditLogs: AuditLogItem[] = [
    {
      id: "aud-01",
      actor_user_id: "staff-01",
      actor_role: "STAFF",
      centre_id: "centre-b",
      entity_type: "procurement",
      entity_id: "tx-01",
      action: "ACTUAL_QUANTITY_RECORDED",
      old_value_json: '{"expected_q": 50.0, "actual_q": null}',
      new_value_json: '{"expected_q": 50.0, "actual_q": 48.7}',
      reason: "Manual entry from weighbridge scale",
      request_id: "req-101",
      created_at: new Date().toISOString(),
    },
    {
      id: "aud-02",
      actor_user_id: "staff-01",
      actor_role: "STAFF",
      centre_id: "centre-b",
      entity_type: "booking",
      entity_id: "bk-02",
      action: "FARMER_ARRIVED",
      old_value_json: '{"status": "CONFIRMED"}',
      new_value_json: '{"status": "ARRIVED"}',
      reason: "Gate check-in verified",
      request_id: "req-102",
      created_at: new Date().toISOString(),
    },
  ];

  // Notifications
  const notifications: NotificationItem[] = [
    {
      id: "notif-01",
      user_id: "farmer-01",
      channel: "IN_APP",
      event_type: "BOOKING_REMINDER",
      title: "Rabi Procurement Window Open",
      body: "Wheat and Jowar procurement slots are now active across Pune district centres. Book your slot on AnnaSetu.",
      delivery_status: "SENT",
      created_at: new Date().toISOString(),
    },
    {
      id: "notif-02",
      user_id: "farmer-01",
      channel: "IN_APP",
      event_type: "QUANTITY_RECORDED",
      title: "Weighing Complete — Review & Confirm",
      body: "Recorded Weight: 48.7 q (Expected: 50.0 q). Please review your digital receipt in AnnaSetu.",
      delivery_status: "SENT",
      created_at: new Date().toISOString(),
    }
  ];

  return {
    commodities,
    centres,
    users,
    bookings,
    transactions,
    auditLogs,
    notifications,
  };
}

// Global in-memory storage instance across serverless requests
class GlobalStore {
  state = createInitialState();

  reset() {
    this.state = createInitialState();
  }

  // Commodities & Centres
  getCommodities() {
    return this.state.commodities.filter((c) => c.active);
  }

  getCentres() {
    return this.state.centres.filter((c) => c.active);
  }

  getCentre(id: string) {
    return this.state.centres.find((c) => c.id === id);
  }

  getUsers() {
    return this.state.users;
  }

  // Smart Recommendation Engine (Deterministic & Explainable)
  recommendBooking(req: {
    farmer_id: string;
    commodity_id: string;
    expected_quantity_q: number;
    preferred_date: string;
    preferred_time_start?: string;
    preferred_time_end?: string;
    origin_lat?: number;
    origin_lng?: number;
  }): RecommendationResult {
    const farmer = this.state.users.find((u) => u.id === req.farmer_id);
    const fLat = req.origin_lat || farmer?.lat || 23.2010;
    const fLng = req.origin_lng || farmer?.lng || 75.8210;

    // Filter centres supporting commodity and with sufficient capacity
    const candidates = this.state.centres.filter((c) => {
      if (!c.active) return false;
      const supports = c.commodities.some((comm) => comm.id === req.commodity_id);
      if (!supports) return false;
      if (c.capacity.remaining_storage_q < req.expected_quantity_q) return false;
      if (c.capacity.remaining_daily_processing_q < req.expected_quantity_q) return false;
      return true;
    });

    if (candidates.length === 0) {
      return { recommended: null, alternatives: [], engine_version: "rules-v1" };
    }

    const scored: RecommendedSlot[] = candidates.map((c) => {
      const rawDist = haversineDistanceKm(fLat, fLng, c.lat, c.lng);
      const dist = Number(rawDist.toFixed(1));

      // Pending quantity in today's bookings for this centre
      const centreBookings = this.state.bookings.filter(
        (b) => b.centre_id === c.id && ["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING"].includes(b.status)
      );
      const pendingQ = centreBookings.reduce((sum, b) => sum + b.expected_quantity_q, 0);
      const ratePerMin = Math.max(0.1, c.capacity.processing_rate_q_per_hr / 60);
      const waitMin = Math.max(15, Math.round(pendingQ / ratePerMin));

      // Scoring weights: Wait (35%), Capacity (25%), Distance (20%), Time (10%), Congestion (10%)
      const distScore = dist <= 60 ? Math.max(0.2, 1 - dist / 60) : Math.max(0.05, 1 / (1 + dist / 150));
      const waitScore = Math.max(0, 1 - waitMin / 100);
      const capScore = Math.min(1, c.capacity.remaining_storage_q / 5000);
      const totalScore = Number((distScore * 0.2 + waitScore * 0.35 + capScore * 0.25 + 0.2).toFixed(2));

      // Explainable reasons
      const reasons: string[] = [];
      if (waitMin <= 35) reasons.push(`Lower expected wait (~${waitMin} min)`);
      if (c.capacity.remaining_storage_q >= 2000) reasons.push(`High remaining capacity (${(c.capacity.remaining_storage_q / 10).toFixed(0)} tonnes free)`);
      if (c.capacity.processing_rate_q_per_hr >= 20) reasons.push(`Fast processing throughput (${c.capacity.processing_rate_q_per_hr} q/hr)`);
      if (dist <= 30) reasons.push(`Local centre proximity (${dist} km away)`);
      else if (dist <= 120) reasons.push(`Accessible regional corridor (${dist} km away)`);
      else reasons.push(`Interstate procurement terminal (${dist} km away)`);
      if (reasons.length === 0) reasons.push("Balanced operational capacity");

      const slotStart = req.preferred_time_start || "10:30";
      const slotEnd = req.preferred_time_end || "11:00";

      return {
        centre_id: c.id,
        centre_name: c.name,
        centre_code: c.code,
        slot_start: `${req.preferred_date}T${slotStart}:00+05:30`,
        slot_end: `${req.preferred_date}T${slotEnd}:00+05:30`,
        distance_km: dist,
        remaining_capacity_q: c.capacity.remaining_storage_q,
        expected_wait_min: waitMin,
        score: totalScore,
        reasons: reasons.slice(0, 3),
        processing_rate_q_per_hr: c.capacity.processing_rate_q_per_hr,
      };
    });

    // Sort descending by total score
    scored.sort((a, b) => b.score - a.score);

    return {
      recommended: scored[0] || null,
      alternatives: scored.slice(1, 3),
      engine_version: "rules-v1",
    };
  }

  // Create Booking
  createBooking(payload: {
    farmer_id: string;
    centre_id: string;
    commodity_id: string;
    booking_date: string;
    slot_start: string;
    slot_end: string;
    expected_quantity_q: number;
    source?: string;
  }) {
    // Fairness: 1 active booking per day per farmer
    const existing = this.state.bookings.find(
      (b) =>
        b.farmer_id === payload.farmer_id &&
        b.booking_date === payload.booking_date &&
        ["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING"].includes(b.status)
    );
    if (existing) {
      throw new Error(`Farmer already has an active booking (${existing.booking_number}) on ${payload.booking_date}. Under fair procurement rules, only one booking per day is permitted.`);
    }

    const centre = this.getCentre(payload.centre_id);
    if (!centre) throw new Error("Centre not found");

    const comm = this.state.commodities.find((c) => c.id === payload.commodity_id);
    const farmer = this.state.users.find((u) => u.id === payload.farmer_id);

    const bookingNum = `BK-2026-${1000 + this.state.bookings.length + 1}`;
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      booking_number: bookingNum,
      farmer_id: payload.farmer_id,
      farmer_name: farmer?.display_name || "Farmer",
      farmer_mobile: farmer?.mobile_masked || "",
      centre_id: payload.centre_id,
      centre_name: centre.name,
      commodity_id: payload.commodity_id,
      commodity_name: comm?.name || "Crop",
      booking_date: payload.booking_date,
      slot_start: payload.slot_start,
      slot_end: payload.slot_end,
      expected_quantity_q: payload.expected_quantity_q,
      source: payload.source || "FARMER",
      status: "CONFIRMED",
      created_at: new Date().toISOString(),
      queue_position: this.state.bookings.filter((b) => b.centre_id === payload.centre_id).length + 1,
      estimated_wait_min: 20,
    };

    // Commit capacity
    centre.capacity.occupied_committed_q += payload.expected_quantity_q;
    centre.capacity.remaining_storage_q = Math.max(0, centre.capacity.storage_capacity_q - centre.capacity.occupied_committed_q);

    this.state.bookings.unshift(newBooking);

    // Audit Log
    this.logAudit({
      actor_user_id: payload.farmer_id,
      actor_role: payload.source || "FARMER",
      centre_id: centre.id,
      entity_type: "booking",
      entity_id: newBooking.id,
      action: "BOOKING_CREATED",
      old_value_json: null,
      new_value_json: JSON.stringify({ booking_number: bookingNum, quantity_q: payload.expected_quantity_q }),
      reason: "Farmer confirmed appointment slot",
    });

    // In-app notification
    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: payload.farmer_id,
      channel: "IN_APP",
      event_type: "BOOKING_CONFIRMED",
      title: `Booking Confirmed: ${bookingNum}`,
      body: `Your slot at ${centre.name} is booked for ${payload.booking_date} (${payload.slot_start}–${payload.slot_end}) for ${payload.expected_quantity_q} q.`,
      delivery_status: "SENT",
      created_at: new Date().toISOString(),
    });

    return newBooking;
  }

  getFarmerBookings(farmerId: string) {
    return this.state.bookings.filter((b) => b.farmer_id === farmerId);
  }

  cancelBooking(id: string, reason?: string) {
    const booking = this.state.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");

    booking.status = "CANCELLED";
    const centre = this.getCentre(booking.centre_id);
    if (centre) {
      centre.capacity.occupied_committed_q = Math.max(0, centre.capacity.occupied_committed_q - booking.expected_quantity_q);
      centre.capacity.remaining_storage_q = Math.max(0, centre.capacity.storage_capacity_q - centre.capacity.occupied_committed_q);
    }

    this.logAudit({
      actor_user_id: booking.farmer_id,
      actor_role: "FARMER",
      centre_id: booking.centre_id,
      entity_type: "booking",
      entity_id: booking.id,
      action: "BOOKING_CANCELLED",
      old_value_json: '{"status": "CONFIRMED"}',
      new_value_json: '{"status": "CANCELLED"}',
      reason: reason || "Farmer requested cancellation",
    });

    return booking;
  }

  // Staff Dashboard & Queue
  getStaffDashboard(centreId?: string): StaffDashboardKPIs {
    const cId = centreId || "centre-b";
    const centre = this.getCentre(cId) || this.state.centres[1];
    const todayStr = new Date().toISOString().split("T")[0];

    const todayBookings = this.state.bookings.filter((b) => b.centre_id === centre.id);
    const expToday = todayBookings.reduce((sum, b) => sum + (b.status !== "CANCELLED" ? b.expected_quantity_q : 0), 0);
    const waitingCount = todayBookings.filter((b) => ["ARRIVED", "WAITING"].includes(b.status)).length;
    const servingB = todayBookings.find((b) => ["WEIGHING", "QUALITY_CHECK"].includes(b.status));

    const utilPct = Math.round((centre.capacity.occupied_committed_q / centre.capacity.storage_capacity_q) * 100);

    return {
      centre_id: centre.id,
      centre_name: centre.name,
      today_date: todayStr,
      expected_quantity_today_q: expToday,
      remaining_storage_q: centre.capacity.remaining_storage_q,
      remaining_storage_tonnes: Number((centre.capacity.remaining_storage_q / 10).toFixed(1)),
      daily_processing_capacity_q: centre.capacity.daily_processing_capacity_q,
      processed_today_q: centre.capacity.processed_today_q,
      processed_today_tonnes: Number((centre.capacity.processed_today_q / 10).toFixed(1)),
      waiting_count: waitingCount,
      currently_serving: servingB
        ? {
            booking_id: servingB.id,
            booking_number: servingB.booking_number,
            farmer_name: servingB.farmer_name || "Farmer",
            commodity_name: servingB.commodity_name || "Crop",
            expected_quantity_q: servingB.expected_quantity_q,
            actual_quantity_q: 48.7,
            status: servingB.status,
            started_at: new Date().toISOString(),
          }
        : null,
      processing_rate_q_per_hr: centre.capacity.processing_rate_q_per_hr,
      utilization_pct: utilPct,
    };
  }

  getStaffQueue(centreId?: string): QueueRow[] {
    const cId = centreId || "centre-b";
    const bookings = this.state.bookings.filter((b) => b.centre_id === cId);

    return bookings.map((b, idx) => {
      const isServing = b.status === "WEIGHING" || b.status === "QUALITY_CHECK";
      return {
        id: `q-${b.id}`,
        booking_id: b.id,
        booking_number: b.booking_number,
        queue_position: isServing ? 1 : idx + 1,
        farmer_name: b.farmer_name || "Farmer",
        farmer_mobile_masked: b.farmer_mobile || "",
        commodity_name: b.commodity_name || "Wheat",
        expected_quantity_q: b.expected_quantity_q,
        actual_quantity_q: b.status === "COMPLETED" || isServing ? 48.7 : null,
        slot_window: `${b.slot_start} – ${b.slot_end}`,
        arrival_status: b.status,
        queue_status: isServing ? "SERVING" : "WAITING",
        estimated_wait_min: isServing ? 0 : Math.max(5, (idx + 1) * 15),
        eta_time_str: "10:45 AM",
        can_mark_arrived: b.status === "CONFIRMED",
        can_mark_noshow: b.status === "CONFIRMED" || b.status === "ARRIVED",
        can_start_procurement: b.status === "ARRIVED" || isServing,
      };
    });
  }

  markArrived(bookingId: string, note?: string) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking not found");

    booking.status = "ARRIVED";
    booking.arrival_at = new Date().toISOString();

    this.logAudit({
      actor_user_id: "staff-01",
      actor_role: "STAFF",
      centre_id: booking.centre_id,
      entity_type: "booking",
      entity_id: booking.id,
      action: "FARMER_ARRIVED",
      old_value_json: '{"status": "CONFIRMED"}',
      new_value_json: '{"status": "ARRIVED"}',
      reason: note || "Gate arrival verified",
    });

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: booking.farmer_id,
      channel: "IN_APP",
      event_type: "ARRIVED",
      title: "Checked In at Procurement Gate",
      body: `Your arrival at ${booking.centre_name} has been verified. You are now in the active service queue.`,
      delivery_status: "SENT",
      created_at: new Date().toISOString(),
    });

    return booking;
  }

  markNoShow(bookingId: string, reason?: string) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking not found");

    booking.status = "NO_SHOW";
    const centre = this.getCentre(booking.centre_id);
    if (centre) {
      centre.capacity.occupied_committed_q = Math.max(0, centre.capacity.occupied_committed_q - booking.expected_quantity_q);
      centre.capacity.remaining_storage_q = Math.max(0, centre.capacity.storage_capacity_q - centre.capacity.occupied_committed_q);
    }

    this.logAudit({
      actor_user_id: "staff-01",
      actor_role: "STAFF",
      centre_id: booking.centre_id,
      entity_type: "booking",
      entity_id: booking.id,
      action: "NO_SHOW_MARKED",
      old_value_json: '{"status": "CONFIRMED"}',
      new_value_json: '{"status": "NO_SHOW", "capacity_state": "POTENTIALLY_AVAILABLE"}',
      reason: reason || "Farmer absent during arrival window",
    });

    return {
      status: "NO_SHOW",
      capacity_state: "POTENTIALLY_AVAILABLE",
      message: "Booking marked as NO-SHOW. Planned capacity is released as POTENTIALLY AVAILABLE without auto-assigning walk-ins.",
    };
  }

  recordWeighing(bookingId: string, actualQ: number, note?: string) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking not found");

    booking.status = "QUALITY_CHECK";

    // Update or create transaction record
    let tx = this.state.transactions.find((t) => t.booking_id === bookingId);
    if (!tx) {
      tx = {
        id: `tx-${Date.now()}`,
        booking_id: booking.id,
        booking_number: booking.booking_number,
        farmer_id: booking.farmer_id,
        farmer_name: booking.farmer_name || "Farmer",
        centre_name: booking.centre_name || "Ujjain Multi-Commodity Agro Hub",
        commodity_name: booking.commodity_name || "Wheat",
        expected_quantity_q: booking.expected_quantity_q,
        actual_quantity_q: actualQ,
        quantity_recorded_at: new Date().toISOString(),
        farmer_confirmed_at: null,
        quality_status: "PENDING",
        quality_reason: null,
        procurement_status: "PENDING",
        payment_status: "PENDING",
        payment_reference: null,
        completed_at: null,
        disputes: [],
      };
      this.state.transactions.unshift(tx);
    } else {
      tx.actual_quantity_q = actualQ;
      tx.quantity_recorded_at = new Date().toISOString();
    }

    this.logAudit({
      actor_user_id: "staff-01",
      actor_role: "STAFF",
      centre_id: booking.centre_id,
      entity_type: "procurement",
      entity_id: tx.id,
      action: "ACTUAL_QUANTITY_RECORDED",
      old_value_json: JSON.stringify({ expected_q: booking.expected_quantity_q, actual_q: null }),
      new_value_json: JSON.stringify({ expected_q: booking.expected_quantity_q, actual_q: actualQ }),
      reason: note || "Weighed on Platform Scale #2",
    });

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: booking.farmer_id,
      channel: "IN_APP",
      event_type: "QUANTITY_RECORDED",
      title: "Weighing Complete — Review & Confirm",
      body: `Recorded Weight: ${actualQ} q (Expected: ${booking.expected_quantity_q} q). Please confirm in your AnnaSetu portal or report a discrepancy.`,
      delivery_status: "SENT",
      created_at: new Date().toISOString(),
    });

    return {
      procurement_id: tx.id,
      expected_quantity_q: tx.expected_quantity_q,
      actual_quantity_q: tx.actual_quantity_q,
      farmer_confirmation_required: true,
      status: booking.status,
    };
  }

  recordQuality(bookingId: string, status: "PASSED" | "FAILED", reason: string) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    let tx = this.state.transactions.find((t) => t.booking_id === bookingId);
    if (tx) {
      tx.quality_status = status;
      tx.quality_reason = reason;
    }

    this.logAudit({
      actor_user_id: "staff-01",
      actor_role: "STAFF",
      centre_id: booking?.centre_id || "centre-b",
      entity_type: "procurement",
      entity_id: tx?.id || bookingId,
      action: "QUALITY_CHECK_RECORDED",
      old_value_json: '{"quality": "PENDING"}',
      new_value_json: JSON.stringify({ quality: status, reason }),
      reason,
    });

    return { quality_status: status, quality_reason: reason };
  }

  completeProcurement(bookingId: string, note?: string) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (booking) {
      booking.status = "COMPLETED";
      booking.queue_position = undefined;
    }

    const tx = this.state.transactions.find((t) => t.booking_id === bookingId);
    if (tx) {
      tx.procurement_status = "ACCEPTED";
      tx.completed_at = new Date().toISOString();
      tx.payment_status = "PENDING";
      tx.payment_reference = `PFMS-2026-GOI-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const centre = booking ? this.getCentre(booking.centre_id) : null;
    if (centre && tx?.actual_quantity_q) {
      centre.capacity.processed_today_q += tx.actual_quantity_q;
    }

    this.logAudit({
      actor_user_id: "staff-01",
      actor_role: "STAFF",
      centre_id: booking?.centre_id || "centre-b",
      entity_type: "procurement",
      entity_id: tx?.id || bookingId,
      action: "PROCUREMENT_COMPLETED",
      old_value_json: '{"status": "QUALITY_CHECK"}',
      new_value_json: JSON.stringify({ status: "ACCEPTED", payment_status: "PENDING" }),
      reason: note || "Procurement batch completed",
    });

    return {
      procurement_status: "ACCEPTED",
      payment_status: "PENDING",
      completed_at: new Date().toISOString(),
    };
  }

  // Farmer Transparency & Dispute
  getFarmerTransactions(farmerId: string) {
    return this.state.transactions.filter((t) => t.farmer_id === farmerId);
  }

  confirmQuantity(procurementId: string) {
    const tx = this.state.transactions.find((t) => t.id === procurementId);
    if (!tx) throw new Error("Transaction not found");

    tx.farmer_confirmed_at = new Date().toISOString();

    this.logAudit({
      actor_user_id: tx.farmer_id,
      actor_role: "FARMER",
      centre_id: "centre-b",
      entity_type: "procurement",
      entity_id: tx.id,
      action: "FARMER_CONFIRMED_QUANTITY",
      old_value_json: '{"farmer_confirmed_at": null}',
      new_value_json: JSON.stringify({ confirmed_at: tx.farmer_confirmed_at, quantity_q: tx.actual_quantity_q }),
      reason: "Farmer verified physical scale weight on digital portal",
    });

    return tx;
  }

  createDispute(procurementId: string, payload: { type: string; reported_quantity_q?: number; reason: string }) {
    const tx = this.state.transactions.find((t) => t.id === procurementId);
    if (!tx) throw new Error("Transaction not found");

    const dispute = {
      id: `disp-${Date.now()}`,
      type: payload.type || "QUANTITY_DISCREPANCY",
      reported_quantity_q: payload.reported_quantity_q || null,
      reason: payload.reason,
      status: "OPEN",
      resolution_note: null,
      resolved_by: null,
      created_at: new Date().toISOString(),
    };

    tx.disputes.unshift(dispute);

    this.logAudit({
      actor_user_id: tx.farmer_id,
      actor_role: "FARMER",
      centre_id: "centre-b",
      entity_type: "dispute",
      entity_id: dispute.id,
      action: "DISPUTE_OPENED",
      old_value_json: null,
      new_value_json: JSON.stringify(dispute),
      reason: payload.reason,
    });

    return dispute;
  }

  // Simulation Controls
  runSimulation(centreId: string, action: string) {
    const centre = this.getCentre(centreId) || this.state.centres[1];
    let message = "";

    if (action === "ADVANCE_10_MIN") {
      message = "Advanced operational clock by 10 minutes. Queue positions refreshed.";
    } else if (action === "COMPLETE_CURRENT") {
      const serving = this.state.bookings.find((b) => ["WEIGHING", "QUALITY_CHECK", "ARRIVED"].includes(b.status));
      if (serving) {
        serving.status = "COMPLETED";
        message = `Farmer ${serving.farmer_name} completed. Next farmer summoned.`;
      } else {
        message = "No active farmer in queue to complete.";
      }
    } else if (action === "SLOW_PROCESSING" || action === "TRIGGER_ETA_SPIKE") {
      centre.capacity.processing_rate_q_per_hr = Math.max(6.0, Number((centre.capacity.processing_rate_q_per_hr * 0.5).toFixed(1)));
      message = `Processing throughput reduced to ${centre.capacity.processing_rate_q_per_hr} q/hr. Dynamic ETAs recalculated and delay alerts dispatched.`;

      // Dispatch delay alerts
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: "farmer-01",
        channel: "IN_APP",
        event_type: "DELAY_ALERT",
        title: "Centre Delay Notification",
        body: `Processing rate at ${centre.name} has temporarily slowed. Your revised ETA has been updated.`,
        delivery_status: "SENT",
        created_at: new Date().toISOString(),
      });
    } else if (action === "MARK_SEEDED_NOSHOW") {
      const confirmed = this.state.bookings.find((b) => b.status === "CONFIRMED");
      if (confirmed) {
        this.markNoShow(confirmed.id, "Simulated missed window");
        message = `Booking ${confirmed.booking_number} marked as NO-SHOW. Planned capacity flagged as POTENTIALLY AVAILABLE without auto walk-ins.`;
      } else {
        message = "No confirmed booking found to mark no-show.";
      }
    }

    return {
      success: true,
      action,
      centre_id: centre.id,
      message,
      current_rate_q_per_hr: centre.capacity.processing_rate_q_per_hr,
    };
  }

  // Audit Logs
  logAudit(entry: Omit<AuditLogItem, "id" | "created_at" | "request_id">) {
    this.state.auditLogs.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...entry,
      request_id: `req-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    });
  }

  getAuditLogs(limit: number = 50) {
    return this.state.auditLogs.slice(0, limit);
  }

  updatePaymentStatus(procurementId: string, status: string) {
    const tx = this.state.transactions.find((t) => t.id === procurementId);
    if (tx) {
      tx.payment_status = status as any;
      if (!tx.payment_reference) {
        tx.payment_reference = `PFMS-2026-GOI-${Math.floor(10000 + Math.random() * 90000)}`;
      }
    }

    this.logAudit({
      actor_user_id: "admin-01",
      actor_role: "ADMIN",
      centre_id: "centre-b",
      entity_type: "payment",
      entity_id: procurementId,
      action: "PAYMENT_STATUS_SYNCED",
      old_value_json: '{"status": "PENDING"}',
      new_value_json: JSON.stringify({ status, reference: tx?.payment_reference }),
      reason: "Simulated government PFMS disbursal reconciliation",
    });

    return { procurement_id: procurementId, payment_status: status };
  }
}

// Singleton reference
const globalForStore = globalThis as unknown as { storeInstance?: GlobalStore };
export const globalStore = globalForStore.storeInstance ?? new GlobalStore();
if (process.env.NODE_ENV !== "production") globalForStore.storeInstance = globalStore;
