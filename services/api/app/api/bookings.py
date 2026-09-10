import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_demo_session, DemoSession
from app.models.entities import Booking, Centre, Commodity, CentreCommodity, QueueEntry, User
from app.schemas.schemas import (
    RecommendationRequest, RecommendationResult, BookingCreate, BookingSchema,
    BookingCancel, BookingReschedule
)
from app.smart_engine.engine import SmartRecommendationEngine
from app.services.queue_service import QueueService
from app.services.notification_service import NotificationService
from app.audit.audit_service import AuditService

router = APIRouter(tags=["Bookings & Smart Recommendation"])

@router.post("/bookings/recommend", response_model=dict)
def recommend_centre_and_slot(
    request: RecommendationRequest,
    db: Session = Depends(get_db)
):
    result = SmartRecommendationEngine.recommend(db, request)
    return {"data": result.dict()}

def serialize_booking(b: Booking) -> dict:
    qe = b.queue_entry
    return {
        "id": b.id,
        "booking_number": b.booking_number,
        "farmer_id": b.farmer_id,
        "farmer_name": b.farmer.display_name if b.farmer else "Unknown Farmer",
        "farmer_mobile": b.farmer.mobile_masked if b.farmer else None,
        "centre_id": b.centre_id,
        "centre_name": b.centre.name if b.centre else "Unknown Centre",
        "commodity_id": b.commodity_id,
        "commodity_name": b.commodity.name if b.commodity else "Unknown Commodity",
        "booking_date": b.booking_date,
        "slot_start": b.slot_start,
        "slot_end": b.slot_end,
        "expected_quantity_q": b.expected_quantity_q,
        "source": b.source,
        "status": b.status,
        "created_at": b.created_at,
        "queue_position": qe.queue_position if qe else None,
        "estimated_wait_min": qe.estimated_wait_min if qe else None,
        "eta_at": qe.eta_at if qe else None,
        "arrival_at": qe.arrival_at if qe else None,
    }

@router.post("/bookings", response_model=dict)
def create_booking(
    req: BookingCreate,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    # 1. Fairness Rule: A farmer may have only one active booking on a particular day
    existing_active = db.query(Booking).filter(
        Booking.farmer_id == req.farmer_id,
        Booking.booking_date == req.booking_date,
        Booking.status.in_(["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING", "QUALITY_CHECK"])
    ).first()

    if existing_active:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "BOOKING_CONFLICT",
                "message": f"Farmer already has an active booking ({existing_active.booking_number}) on {req.booking_date}. Under fair procurement rules, only one active booking per day is allowed."
            }
        )

    # 2. Centre and Commodity validation
    centre = db.query(Centre).filter(Centre.id == req.centre_id, Centre.active == True).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Procurement centre not found or inactive")

    assoc = db.query(CentreCommodity).filter(
        CentreCommodity.centre_id == req.centre_id,
        CentreCommodity.commodity_id == req.commodity_id,
        CentreCommodity.active == True
    ).first()
    if not assoc:
        raise HTTPException(
            status_code=400,
            detail={"code": "COMMODITY_UNSUPPORTED", "message": "Selected centre does not procure this commodity."}
        )

    # 3. Capacity verification
    if centre.remaining_storage_q < req.expected_quantity_q:
        raise HTTPException(
            status_code=400,
            detail={"code": "CAPACITY_INSUFFICIENT", "message": "Centre does not have sufficient remaining storage capacity."}
        )

    # 4. Generate booking number
    b_count = db.query(Booking).count()
    booking_num = f"BK-2026-{1000 + b_count + 1}"

    booking = Booking(
        id=str(uuid.uuid4()),
        booking_number=booking_num,
        farmer_id=req.farmer_id,
        centre_id=req.centre_id,
        commodity_id=req.commodity_id,
        booking_date=req.booking_date,
        slot_start=req.slot_start,
        slot_end=req.slot_end,
        expected_quantity_q=req.expected_quantity_q,
        source=req.source or session.role,
        status="CONFIRMED"
    )
    db.add(booking)
    db.flush()

    # Reserve planned capacity on centre
    centre.occupied_committed_q += req.expected_quantity_q

    # Create initial QueueEntry
    qe = QueueEntry(
        id=str(uuid.uuid4()),
        booking_id=booking.id,
        queue_status="WAITING"
    )
    db.add(qe)
    db.flush()

    # Log audit event
    AuditService.log(
        db=db,
        actor_user_id=session.user_id,
        actor_role=session.role,
        centre_id=centre.id,
        entity_type="booking",
        entity_id=booking.id,
        action="BOOKING_CREATED",
        new_value={
            "booking_number": booking_num,
            "centre": centre.name,
            "expected_quantity_q": req.expected_quantity_q,
            "date": req.booking_date,
            "slot": f"{req.slot_start}-{req.slot_end}"
        },
        reason="Farmer confirmed appointment slot"
    )

    # Dispatch in-app notification
    NotificationService.send(
        db=db,
        user_id=req.farmer_id,
        event_type="BOOKING_CONFIRMED",
        title=f"Booking Confirmed: {booking_num}",
        body=f"Your appointment at {centre.name} is scheduled for {req.booking_date} ({req.slot_start}–{req.slot_end}) for {req.expected_quantity_q} q.",
        booking_id=booking.id
    )

    db.commit()

    # Recalculate queue ordering for the centre
    QueueService.recalculate_centre_queue(db, centre.id, req.booking_date)

    return {"data": serialize_booking(booking)}

@router.get("/bookings/{id}", response_model=dict)
def get_booking(id: str, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"data": serialize_booking(booking)}

@router.get("/farmers/{farmer_id}/bookings", response_model=dict)
def get_farmer_bookings(farmer_id: str, db: Session = Depends(get_db)):
    bookings = db.query(Booking).filter(
        Booking.farmer_id == farmer_id
    ).order_by(Booking.created_at.desc()).all()
    return {"data": [serialize_booking(b) for b in bookings]}

@router.post("/bookings/{id}/cancel", response_model=dict)
def cancel_booking(
    id: str,
    payload: BookingCancel,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status in ["COMPLETED", "CANCELLED", "NO_SHOW"]:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_STATE_TRANSITION", "message": f"Cannot cancel booking in status {booking.status}"}
        )

    old_status = booking.status
    booking.status = "CANCELLED"
    booking.cancelled_at = datetime.now(timezone.utc)

    if booking.queue_entry:
        booking.queue_entry.queue_status = "CANCELLED"
        booking.queue_entry.queue_position = None

    # Release committed capacity
    centre = booking.centre
    centre.occupied_committed_q = max(0.0, centre.occupied_committed_q - booking.expected_quantity_q)

    AuditService.log(
        db=db,
        actor_user_id=session.user_id,
        actor_role=session.role,
        centre_id=centre.id,
        entity_type="booking",
        entity_id=booking.id,
        action="BOOKING_CANCELLED",
        old_value={"status": old_status},
        new_value={"status": "CANCELLED"},
        reason=payload.reason
    )

    NotificationService.send(
        db=db,
        user_id=booking.farmer_id,
        event_type="BOOKING_CANCELLED",
        title="Booking Cancelled",
        body=f"Your booking {booking.booking_number} has been cancelled. Capacity has been freed.",
        booking_id=booking.id
    )

    db.commit()
    QueueService.recalculate_centre_queue(db, centre.id, booking.booking_date)
    return {"data": serialize_booking(booking)}

@router.post("/bookings/{id}/reschedule", response_model=dict)
def reschedule_booking(
    id: str,
    payload: BookingReschedule,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check same-day fairness for new date
    conflict = db.query(Booking).filter(
        Booking.farmer_id == booking.farmer_id,
        Booking.booking_date == payload.new_date,
        Booking.id != booking.id,
        Booking.status.in_(["CONFIRMED", "ARRIVED", "WAITING"])
    ).first()
    if conflict:
        raise HTTPException(
            status_code=400,
            detail={"code": "BOOKING_CONFLICT", "message": f"Farmer already has an active booking on {payload.new_date}"}
        )

    old_date = booking.booking_date
    old_slot = f"{booking.slot_start}-{booking.slot_end}"

    booking.booking_date = payload.new_date
    booking.slot_start = payload.new_slot_start
    booking.slot_end = payload.new_slot_end
    booking.status = "CONFIRMED"

    AuditService.log(
        db=db,
        actor_user_id=session.user_id,
        actor_role=session.role,
        centre_id=booking.centre_id,
        entity_type="booking",
        entity_id=booking.id,
        action="BOOKING_RESCHEDULED",
        old_value={"date": old_date, "slot": old_slot},
        new_value={"date": payload.new_date, "slot": f"{payload.new_slot_start}-{payload.new_slot_end}"},
        reason=payload.reason
    )

    NotificationService.send(
        db=db,
        user_id=booking.farmer_id,
        event_type="BOOKING_RESCHEDULED",
        title="Appointment Rescheduled",
        body=f"Booking {booking.booking_number} rescheduled to {payload.new_date} ({payload.new_slot_start}–{payload.new_slot_end}).",
        booking_id=booking.id
    )

    db.commit()
    QueueService.recalculate_centre_queue(db, booking.centre_id, payload.new_date)
    return {"data": serialize_booking(booking)}
