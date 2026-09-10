import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime, ForeignKey, 
    Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    role = Column(String(20), nullable=False)  # FARMER, STAFF, CSC, ADMIN
    display_name = Column(String(100), nullable=False)
    mobile_masked = Column(String(20), nullable=False)
    email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    staff_assignment = relationship("StaffAssignment", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    demo_gov_id_hash = Column(String(64), nullable=True)
    demo_gov_id_masked = Column(String(20), nullable=False, default="XXXX-XXXX-0000")
    village = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False, default="Maharashtra")
    preferred_language = Column(String(20), default="English")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="farmer_profile")

class Centre(Base):
    __tablename__ = "centres"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    address = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    operating_start = Column(String(10), default="09:00")  # HH:MM
    operating_end = Column(String(10), default="17:00")    # HH:MM
    
    # Capacity modeled in quintals (1 tonne = 10 quintals)
    storage_capacity_q = Column(Float, nullable=False)
    occupied_committed_q = Column(Float, nullable=False, default=0.0)
    daily_processing_capacity_q = Column(Float, nullable=False)
    processed_today_q = Column(Float, nullable=False, default=0.0)
    processing_rate_q_per_hr = Column(Float, nullable=False, default=15.0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    commodities = relationship("CentreCommodity", back_populates="centre", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="centre")
    staff_assignments = relationship("StaffAssignment", back_populates="centre")

    @property
    def remaining_storage_q(self) -> float:
        return max(0.0, self.storage_capacity_q - self.occupied_committed_q)

    @property
    def remaining_daily_processing_q(self) -> float:
        return max(0.0, self.daily_processing_capacity_q - self.processed_today_q)

class StaffAssignment(Base):
    __tablename__ = "staff_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    centre_id = Column(String(36), ForeignKey("centres.id", ondelete="CASCADE"), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="staff_assignment")
    centre = relationship("Centre", back_populates="staff_assignments")

class Commodity(Base):
    __tablename__ = "commodities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="Cereal")
    default_unit = Column(String(20), default="quintal")
    msp_inr_per_q = Column(Float, nullable=False, default=2275.0)
    active = Column(Boolean, default=True)

    centre_associations = relationship("CentreCommodity", back_populates="commodity")

class CentreCommodity(Base):
    __tablename__ = "centre_commodities"

    centre_id = Column(String(36), ForeignKey("centres.id", ondelete="CASCADE"), primary_key=True)
    commodity_id = Column(String(36), ForeignKey("commodities.id", ondelete="CASCADE"), primary_key=True)
    active = Column(Boolean, default=True)

    centre = relationship("Centre", back_populates="commodities")
    commodity = relationship("Commodity", back_populates="centre_associations")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    booking_number = Column(String(30), unique=True, nullable=False)
    farmer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    centre_id = Column(String(36), ForeignKey("centres.id"), nullable=False)
    commodity_id = Column(String(36), ForeignKey("commodities.id"), nullable=False)
    booking_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    slot_start = Column(String(5), nullable=False)    # HH:MM
    slot_end = Column(String(5), nullable=False)      # HH:MM
    expected_quantity_q = Column(Float, nullable=False)
    source = Column(String(20), default="FARMER")     # FARMER, CSC, ADMIN
    status = Column(String(30), default="CONFIRMED")  # CONFIRMED, ARRIVED, WAITING, WEIGHING, QUALITY_CHECK, COMPLETED, CANCELLED, NO_SHOW
    cancelled_at = Column(DateTime, nullable=True)
    rescheduled_from_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    farmer = relationship("User", foreign_keys=[farmer_id])
    centre = relationship("Centre", back_populates="bookings")
    commodity = relationship("Commodity")
    queue_entry = relationship("QueueEntry", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    procurement = relationship("Procurement", back_populates="booking", uselist=False, cascade="all, delete-orphan")

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    arrival_at = Column(DateTime, nullable=True)
    queue_position = Column(Integer, nullable=True)
    queue_status = Column(String(30), default="WAITING")  # WAITING, SERVING, COMPLETED, NO_SHOW, CANCELLED
    estimated_wait_min = Column(Integer, default=0)
    eta_at = Column(DateTime, nullable=True)
    serving_started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    booking = relationship("Booking", back_populates="queue_entry")

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    expected_quantity_q = Column(Float, nullable=False)
    actual_quantity_q = Column(Float, nullable=True)
    quantity_recorded_at = Column(DateTime, nullable=True)
    farmer_confirmed_at = Column(DateTime, nullable=True)
    quality_status = Column(String(20), default="PENDING")  # PENDING, PASSED, FAILED
    quality_reason = Column(String(255), nullable=True)
    procurement_status = Column(String(20), default="PENDING") # PENDING, ACCEPTED, REJECTED, COMPLETED
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    booking = relationship("Booking", back_populates="procurement")
    payment_status = relationship("PaymentStatus", back_populates="procurement", uselist=False, cascade="all, delete-orphan")
    disputes = relationship("Dispute", back_populates="procurement", cascade="all, delete-orphan")

class PaymentStatus(Base):
    __tablename__ = "payment_statuses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    procurement_id = Column(String(36), ForeignKey("procurements.id", ondelete="CASCADE"), unique=True, nullable=False)
    status = Column(String(20), default="PENDING")  # PENDING, COMPLETED
    source = Column(String(50), default="PFMS_GOV_EXTERNAL")
    external_reference_masked = Column(String(50), nullable=True)
    updated_by = Column(String(100), default="SYSTEM_SYNC")
    last_synced_at = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)

    procurement = relationship("Procurement", back_populates="payment_status")

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    procurement_id = Column(String(36), ForeignKey("procurements.id", ondelete="CASCADE"), nullable=False)
    farmer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    type = Column(String(40), default="QUANTITY_DISCREPANCY")  # QUANTITY_DISCREPANCY, FALSE_NO_SHOW
    reported_quantity_q = Column(Float, nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="OPEN")  # OPEN, UNDER_REVIEW, RESOLVED, REJECTED
    resolution_note = Column(Text, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    procurement = relationship("Procurement", back_populates="disputes")
    farmer = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    channel = Column(String(20), default="IN_APP")  # IN_APP, SMS_MOCK
    event_type = Column(String(50), nullable=False) # BOOKING_CONFIRMED, ARRIVED, DELAY_ALERT, QUANTITY_RECORDED, QUALITY_CHECK, PROCUREMENT_COMPLETED, PAYMENT_UPDATE, DISPUTE_UPDATE
    title = Column(String(150), nullable=False)
    body = Column(Text, nullable=False)
    delivery_status = Column(String(20), default="SENT")  # QUEUED, SENT, FAILED
    provider_message_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    sent_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_user_id = Column(String(36), nullable=False)
    actor_role = Column(String(20), nullable=False)
    centre_id = Column(String(36), nullable=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    action = Column(String(100), nullable=False)
    old_value_json = Column(Text, nullable=True)
    new_value_json = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    request_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now)

class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    centre_id = Column(String(36), ForeignKey("centres.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    payload_json = Column(Text, nullable=True)
    created_by = Column(String(100), default="SIMULATION_ENGINE")
    created_at = Column(DateTime, default=utc_now)
