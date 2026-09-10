export interface DemoUser {
  id: string;
  role: "FARMER" | "STAFF" | "CSC" | "ADMIN";
  display_name: string;
  mobile_masked: string;
  email?: string;
  centre_id?: string;
  centre_name?: string;
  village?: string;
}

export interface Commodity {
  id: string;
  code: string;
  name: string;
  category: string;
  default_unit: string;
  msp_inr_per_q: number;
  active: boolean;
}

export interface CentreCapacity {
  storage_capacity_q: number;
  occupied_committed_q: number;
  remaining_storage_q: number;
  storage_capacity_tonnes: number;
  occupied_committed_tonnes: number;
  remaining_storage_tonnes: number;
  daily_processing_capacity_q: number;
  processed_today_q: number;
  remaining_daily_processing_q: number;
  daily_processing_capacity_tonnes: number;
  processed_today_tonnes: number;
  remaining_daily_processing_tonnes: number;
  processing_rate_q_per_hr: number;
}

export interface Centre {
  id: string;
  code: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  operating_start: string;
  operating_end: string;
  active: boolean;
  capacity: CentreCapacity;
  commodities: Commodity[];
}

export interface RecommendedSlot {
  centre_id: string;
  centre_name: string;
  centre_code: string;
  slot_start: string;
  slot_end: string;
  distance_km: number;
  remaining_capacity_q: number;
  expected_wait_min: number;
  score: number;
  reasons: string[];
  processing_rate_q_per_hr: number;
}

export interface RecommendationResult {
  recommended: RecommendedSlot | null;
  alternatives: RecommendedSlot[];
  engine_version: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_mobile?: string;
  centre_id: string;
  centre_name?: string;
  commodity_id: string;
  commodity_name?: string;
  booking_date: string;
  slot_start: string;
  slot_end: string;
  expected_quantity_q: number;
  source: string;
  status: "CONFIRMED" | "ARRIVED" | "WAITING" | "WEIGHING" | "QUALITY_CHECK" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  created_at: string;
  queue_position?: number;
  estimated_wait_min?: number;
  eta_at?: string;
  arrival_at?: string;
}

export interface QueueRow {
  id: string;
  booking_id: string;
  booking_number: string;
  queue_position: number | null;
  farmer_name: string;
  farmer_mobile_masked: string;
  commodity_name: string;
  expected_quantity_q: number;
  actual_quantity_q: number | null;
  slot_window: string;
  arrival_status: string;
  queue_status: string;
  estimated_wait_min: number;
  eta_time_str: string | null;
  can_mark_arrived: boolean;
  can_mark_noshow: boolean;
  can_start_procurement: boolean;
}

export interface StaffDashboardKPIs {
  centre_id: string;
  centre_name: string;
  today_date: string;
  expected_quantity_today_q: number;
  remaining_storage_q: number;
  remaining_storage_tonnes: number;
  daily_processing_capacity_q: number;
  processed_today_q: number;
  processed_today_tonnes: number;
  waiting_count: number;
  currently_serving: {
    booking_id: string;
    booking_number: string;
    farmer_name: string;
    commodity_name: string;
    expected_quantity_q: number;
    actual_quantity_q: number | null;
    status: string;
    started_at: string | null;
  } | null;
  processing_rate_q_per_hr: number;
  utilization_pct: number;
}

export interface TransactionRecord {
  id: string;
  booking_id: string;
  booking_number: string;
  farmer_id: string;
  farmer_name: string;
  centre_name: string;
  commodity_name: string;
  expected_quantity_q: number;
  actual_quantity_q: number | null;
  quantity_recorded_at: string | null;
  farmer_confirmed_at: string | null;
  quality_status: "PENDING" | "PASSED" | "FAILED";
  quality_reason: string | null;
  procurement_status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
  payment_status: "PENDING" | "COMPLETED";
  payment_reference: string | null;
  completed_at: string | null;
  disputes: Array<{
    id: string;
    type: string;
    reported_quantity_q: number | null;
    reason: string;
    status: string;
    resolution_note: string | null;
    resolved_by: string | null;
    created_at: string;
  }>;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  booking_id?: string;
  channel: string;
  event_type: string;
  title: string;
  body: string;
  delivery_status: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  actor_user_id: string;
  actor_role: string;
  centre_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value_json: string | null;
  new_value_json: string | null;
  reason: string | null;
  request_id: string | null;
  created_at: string;
}
