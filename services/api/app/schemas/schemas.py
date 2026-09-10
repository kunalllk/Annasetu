from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

# Envelopes
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail

class DataResponse(BaseModel):
    data: Any
    meta: Optional[Dict[str, Any]] = None

# Commodities
class CommoditySchema(BaseModel):
    id: str
    code: str
    name: str
    category: str
    default_unit: str
    msp_inr_per_q: float
    active: bool

    class Config:
        from_attributes = True

# Centres
class CentreCapacitySchema(BaseModel):
    storage_capacity_q: float
    occupied_committed_q: float
    remaining_storage_q: float
    storage_capacity_tonnes: float
    occupied_committed_tonnes: float
    remaining_storage_tonnes: float
    daily_processing_capacity_q: float
    processed_today_q: float
    remaining_daily_processing_q: float
    daily_processing_capacity_tonnes: float
    processed_today_tonnes: float
    remaining_daily_processing_tonnes: float
    processing_rate_q_per_hr: float

class CentreSchema(BaseModel):
    id: str
    code: str
    name: str
    address: str
    lat: float
    lng: float
    operating_start: str
    operating_end: str
    capacity: CentreCapacitySchema
    active: bool
    commodities: List[CommoditySchema] = []

    class Config:
        from_attributes = True

# Recommendation
class RecommendationRequest(BaseModel):
    farmer_id: str
    commodity_id: str
    expected_quantity_q: float = Field(gt=0, description="Quantity in quintals")
    preferred_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    preferred_time_start: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    preferred_time_end: str = Field(default="17:00", pattern=r"^\d{2}:\d{2}$")
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    preferred_centre_id: Optional[str] = None

class RecommendedSlot(BaseModel):
    centre_id: str
    centre_name: str
    centre_code: str
    slot_start: str
    slot_end: str
    distance_km: float
    remaining_capacity_q: float
    expected_wait_min: int
    score: float
    reasons: List[str]
    processing_rate_q_per_hr: float

class RecommendationResult(BaseModel):
    recommended: Optional[RecommendedSlot]
    alternatives: List[RecommendedSlot] = []
    engine_version: str = "rules-v1"

# Booking
class BookingCreate(BaseModel):
    farmer_id: str
    centre_id: str
    commodity_id: str
    booking_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    slot_start: str = Field(pattern=r"^\d{2}:\d{2}$")
    slot_end: str = Field(pattern=r"^\d{2}:\d{2}$")
    expected_quantity_q: float = Field(gt=0)
    source: str = "FARMER"  # FARMER, CSC, ADMIN

class BookingCancel(BaseModel):
    reason: Optional[str] = "Farmer requested cancellation"

class BookingReschedule(BaseModel):
    new_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    new_slot_start: str = Field(pattern=r"^\d{2}:\d{2}$")
    new_slot_end: str = Field(pattern=r"^\d{2}:\d{2}$")
    reason: Optional[str] = "Farmer requested reschedule"

class BookingSchema(BaseModel):
    id: str
    booking_number: str
    farmer_id: str
    farmer_name: Optional[str] = None
    farmer_mobile: Optional[str] = None
    centre_id: str
    centre_name: Optional[str] = None
    commodity_id: str
    commodity_name: Optional[str] = None
    booking_date: str
    slot_start: str
    slot_end: str
    expected_quantity_q: float
    source: str
    status: str
    created_at: datetime
    queue_position: Optional[int] = None
    estimated_wait_min: Optional[int] = None
    eta_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Queue
class QueueRowSchema(BaseModel):
    id: str
    booking_id: str
    queue_position: Optional[int]
    farmer_name: str
    farmer_mobile_masked: str
    commodity_name: str
    expected_quantity_q: float
    actual_quantity_q: Optional[float]
    slot_window: str
    arrival_status: str  # BOOKED, ARRIVED, NO_SHOW, SERVING, COMPLETED
    queue_status: str    # WAITING, SERVING, COMPLETED, NO_SHOW
    estimated_wait_min: int
    eta_time_str: Optional[str]
    can_mark_arrived: bool
    can_mark_noshow: bool
    can_start_procurement: bool

class StaffDashboardKPIs(BaseModel):
    centre_id: str
    centre_name: str
    today_date: str
    expected_quantity_today_q: float
    remaining_storage_q: float
    remaining_storage_tonnes: float
    daily_processing_capacity_q: float
    processed_today_q: float
    processed_today_tonnes: float
    waiting_count: int
    currently_serving: Optional[Dict[str, Any]] = None
    processing_rate_q_per_hr: float
    utilization_pct: float

# Staff Operations
class MarkArrivedRequest(BaseModel):
    arrival_note: Optional[str] = "Arrived at procurement gate"

class MarkNoShowRequest(BaseModel):
    reason: str = "Farmer absent when called"

class WeighingRequest(BaseModel):
    actual_quantity_q: float = Field(ge=0, description="Manual weighed quantity in quintals")
    operator_note: Optional[str] = "Manual entry from scale"

class QualityCheckRequest(BaseModel):
    status: str = Field(description="PASSED or FAILED")
    reason: str = Field(description="Moisture content, foreign matter or inspection result")

class ProcurementCompleteRequest(BaseModel):
    completion_note: Optional[str] = "Procurement accepted and logged"

class ProcurementDetailSchema(BaseModel):
    id: str
    booking_id: str
    booking_number: str
    farmer_id: str
    farmer_name: str
    commodity_name: str
    expected_quantity_q: float
    actual_quantity_q: Optional[float]
    quantity_recorded_at: Optional[datetime]
    farmer_confirmed_at: Optional[datetime]
    quality_status: str
    quality_reason: Optional[str]
    procurement_status: str
    payment_status: str
    disputes: List[Dict[str, Any]] = []

# Farmer Transparency
class ConfirmQuantityRequest(BaseModel):
    confirmed: bool = True

class DisputeCreateRequest(BaseModel):
    type: str = "QUANTITY_DISCREPANCY" # QUANTITY_DISCREPANCY, FALSE_NO_SHOW
    reported_quantity_q: Optional[float] = None
    reason: str

class DisputeSchema(BaseModel):
    id: str
    procurement_id: str
    farmer_id: str
    type: str
    reported_quantity_q: Optional[float]
    reason: str
    status: str
    resolution_note: Optional[str]
    resolved_by: Optional[str]
    created_at: datetime
    updated_at: datetime

# Simulation
class SimulationRunRequest(BaseModel):
    centre_id: str
    action: str # ADVANCE_10_MIN, COMPLETE_CURRENT, SLOW_PROCESSING, TRIGGER_ETA_SPIKE, MARK_SEEDED_NOSHOW
    minutes: Optional[int] = 10
    processing_multiplier: Optional[float] = 1.0

class SimulationResetRequest(BaseModel):
    centre_id: Optional[str] = None

# Notifications
class NotificationSchema(BaseModel):
    id: str
    user_id: str
    channel: str
    event_type: str
    title: str
    body: str
    delivery_status: str
    created_at: datetime

# Audit
class AuditLogSchema(BaseModel):
    id: str
    actor_user_id: str
    actor_role: str
    centre_id: Optional[str]
    entity_type: str
    entity_id: str
    action: str
    old_value_json: Optional[str]
    new_value_json: Optional[str]
    reason: Optional[str]
    request_id: Optional[str]
    created_at: datetime

# Analytics
class AnalyticsResponse(BaseModel):
    average_wait_min: int
    average_processing_min: int
    quantity_procured_q: float
    utilization_pct: float
    no_show_rate_pct: float
    payment_pending_count: int
    payment_completed_count: int
    disputes_open_count: int
    series: List[Dict[str, Any]] = []
