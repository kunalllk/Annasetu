from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_demo_session, require_staff_role, DemoSession
from app.models.entities import Centre, Booking, QueueEntry, Procurement
from app.schemas.schemas import (
    StaffDashboardKPIs, QueueRowSchema, MarkArrivedRequest, MarkNoShowRequest,
    WeighingRequest, QualityCheckRequest, ProcurementCompleteRequest
)
from app.services.queue_service import QueueService
from app.services.procurement_service import ProcurementService

router = APIRouter(prefix="/staff", tags=["Staff Operations"])

def get_staff_centre_id(session: DemoSession, db: Session) -> str:
    centre_id = session.centre_id
    if not centre_id:
        # Fallback to Centre B (default demo centre)
        centre = db.query(Centre).filter(Centre.code == "CENTRE-B").first()
        if centre:
            return centre.id
        first_centre = db.query(Centre).first()
        if first_centre:
            return first_centre.id
        raise HTTPException(status_code=400, detail="No procurement centre configured")
    return centre_id

@router.get("/dashboard", response_model=dict)
def get_staff_dashboard(
    session: DemoSession = Depends(require_staff_role),
    db: Session = Depends(get_db)
):
    centre_id = get_staff_centre_id(session, db)
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Refresh queue ordering
    QueueService.recalculate_centre_queue(db, centre_id, today_str)

    today_bookings = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today_str
    ).all()

    expected_today_q = sum(b.expected_quantity_q for b in today_bookings if b.status != "CANCELLED")
    waiting_count = sum(1 for b in today_bookings if b.status in ["ARRIVED", "WAITING"])

    # Find currently serving
    currently_serving = None
    serving_b = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.status.in_(["WEIGHING", "QUALITY_CHECK"])
    ).first()

    if serving_b:
        currently_serving = {
            "booking_id": serving_b.id,
            "booking_number": serving_b.booking_number,
            "farmer_name": serving_b.farmer.display_name if serving_b.farmer else "Unknown",
            "commodity_name": serving_b.commodity.name if serving_b.commodity else "Wheat",
            "expected_quantity_q": serving_b.expected_quantity_q,
            "actual_quantity_q": serving_b.procurement.actual_quantity_q if serving_b.procurement else None,
            "status": serving_b.status,
            "started_at": serving_b.queue_entry.serving_started_at if serving_b.queue_entry else None
        }

    utilization_pct = round((centre.occupied_committed_q / centre.storage_capacity_q) * 100.0, 1) if centre.storage_capacity_q > 0 else 0.0

    kpi = StaffDashboardKPIs(
        centre_id=centre.id,
        centre_name=centre.name,
        today_date=today_str,
        expected_quantity_today_q=expected_today_q,
        remaining_storage_q=centre.remaining_storage_q,
        remaining_storage_tonnes=round(centre.remaining_storage_q / 10.0, 1),
        daily_processing_capacity_q=centre.daily_processing_capacity_q,
        processed_today_q=centre.processed_today_q,
        processed_today_tonnes=round(centre.processed_today_q / 10.0, 1),
        waiting_count=waiting_count,
        currently_serving=currently_serving,
        processing_rate_q_per_hr=centre.processing_rate_q_per_hr,
        utilization_pct=utilization_pct
    )
    return {"data": kpi.dict()}

@router.get("/queue", response_model=dict)
def get_staff_queue(
    session: DemoSession = Depends(require_staff_role),
    db: Session = Depends(get_db)
):
    centre_id = get_staff_centre_id(session, db)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Ensure queue positions are cleanly recalculated
    QueueService.recalculate_centre_queue(db, centre_id, today_str)

    bookings = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today_str,
        Booking.status.in_(["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING", "QUALITY_CHECK", "COMPLETED", "NO_SHOW"])
    ).all()

    # Sort: Active in front (by queue position), then completed/no-show
    def sort_key(b):
        if b.queue_entry and b.queue_entry.queue_position is not None:
            return (0, b.queue_entry.queue_position)
        return (1, b.created_at)

    bookings.sort(key=sort_key)

    rows = []
    for b in bookings:
        qe = b.queue_entry
        proc = b.procurement

        eta_str = None
        if qe and qe.eta_at:
            eta_str = qe.eta_at.strftime("%I:%M %p")

        can_arrive = (b.status == "CONFIRMED")
        can_noshow = (b.status in ["CONFIRMED", "ARRIVED"])
        can_procure = (b.status in ["ARRIVED", "WEIGHING", "QUALITY_CHECK"])

        rows.append({
            "id": qe.id if qe else b.id,
            "booking_id": b.id,
            "booking_number": b.booking_number,
            "queue_position": qe.queue_position if qe else None,
            "farmer_name": b.farmer.display_name if b.farmer else "Farmer",
            "farmer_mobile_masked": b.farmer.mobile_masked if b.farmer else "",
            "commodity_name": b.commodity.name if b.commodity else "",
            "expected_quantity_q": b.expected_quantity_q,
            "actual_quantity_q": proc.actual_quantity_q if proc else None,
            "slot_window": f"{b.slot_start} – {b.slot_end}",
            "arrival_status": b.status,
            "queue_status": qe.queue_status if qe else "WAITING",
            "estimated_wait_min": qe.estimated_wait_min if qe else 0,
            "eta_time_str": eta_str,
            "can_mark_arrived": can_arrive,
            "can_mark_noshow": can_noshow,
            "can_start_procurement": can_procure
        })

    return {"data": rows}

@router.post("/bookings/{id}/arrive", response_model=dict)
def staff_mark_arrived(
    id: str,
    req: MarkArrivedRequest,
    session: DemoSession = Depends(require_staff_role),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Enforce centre isolation
    staff_centre_id = get_staff_centre_id(session, db)
    if session.role != "ADMIN" and booking.centre_id != staff_centre_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "UNAUTHORIZED_CENTRE", "message": "Staff cannot operate on bookings from another procurement centre."}
        )

    updated_booking = QueueService.mark_arrived(
        db=db,
        booking_id=id,
        actor_user_id=session.user_id,
        actor_role=session.role,
        note=req.arrival_note
    )
    return {
        "data": {
            "id": updated_booking.id,
            "status": updated_booking.status,
            "queue_position": updated_booking.queue_entry.queue_position if updated_booking.queue_entry else 1,
            "estimated_wait_min": updated_booking.queue_entry.estimated_wait_min if updated_booking.queue_entry else 0
        }
    }

@router.post("/bookings/{id}/no-show", response_model=dict)
def staff_mark_no_show(
    id: str,
    req: MarkNoShowRequest,
    session: DemoSession = Depends(require_staff_role),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    staff_centre_id = get_staff_centre_id(session, db)
    if session.role != "ADMIN" and booking.centre_id != staff_centre_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "UNAUTHORIZED_CENTRE", "message": "Staff cannot operate on bookings from another procurement centre."}
        )

    updated_booking = QueueService.mark_no_show(
        db=db,
        booking_id=id,
        actor_user_id=session.user_id,
        actor_role=session.role,
        reason=req.reason
    )
    return {
        "data": {
            "id": updated_booking.id,
            "status": "NO_SHOW",
            "capacity_state": "POTENTIALLY_AVAILABLE",
            "message": "Booking marked as NO-SHOW. Planned capacity is released as POTENTIALLY AVAILABLE. Walk-in auto-assignment is disabled per operational policy."
        }
    }

@router.post("/procurements/{booking_id}/weigh", response_model=dict)
def staff_record_weighing(
    booking_id: str,
    req: WeighingRequest,
    session: DemoSession = Depends(require_staff_role),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    staff_centre_id = get_staff_centre_id(session, db)
    if session.role != "ADMIN" and booking.centre_id != staff_centre_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "UNAUTHORIZED_CENTRE", "message": "Staff cannot operate on bookings from another procurement centre."}
        )

    proc = ProcurementService.record_actual_quantity(
        db=db,
        booking_id=booking_id,
        actual_quantity_q=req.actual_quantity_q,
        actor_user_id=session.user_id,
        actor_role=session.role,
        operator_note=req.operator_note
    )

    return {
        "data": {
            "procurement_id": proc.id,
            "expected_quantity_q": proc.expected_quantity_q,
            "actual_quantity_q": proc.actual_quantity_q,
            "farmer_confirmation_required": True,
            "status": booking.status
        }
    }

@router.post("/procurements/{booking_id}/quality", response_model=dict)
def staff_record_quality(
    booking_id: str,
    req: QualityCheckRequest,
    session: DemoSession = Depends(require_staff_role),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    staff_centre_id = get_staff_centre_id(session, db)
    if session.role != "ADMIN" and booking.centre_id != staff_centre_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "UNAUTHORIZED_CENTRE", "message": "Staff cannot operate on bookings from another procurement centre."}
        )

    proc = ProcurementService.record_quality_check(
        db=db,
        booking_id=booking_id,
        quality_status=req.status,
        quality_reason=req.reason,
        actor_user_id=session.user_id,
        actor_role=session.role
    )

    return {
        "data": {
            "procurement_id": proc.id,
            "quality_status": proc.quality_status,
            "quality_reason": proc.quality_reason
        }
    }

@router.post("/procurements/{booking_id}/complete", response_model=dict)
def staff_complete_procurement(
    booking_id: str,
    req: ProcurementCompleteRequest,
    session: DemoSession = Depends(require_staff_role),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    staff_centre_id = get_staff_centre_id(session, db)
    if session.role != "ADMIN" and booking.centre_id != staff_centre_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "UNAUTHORIZED_CENTRE", "message": "Staff cannot operate on bookings from another procurement centre."}
        )

    proc = ProcurementService.complete_procurement(
        db=db,
        booking_id=booking_id,
        actor_user_id=session.user_id,
        actor_role=session.role,
        completion_note=req.completion_note
    )

    return {
        "data": {
            "procurement_id": proc.id,
            "procurement_status": proc.procurement_status,
            "actual_quantity_q": proc.actual_quantity_q,
            "payment_status": proc.payment_status.status if proc.payment_status else "PENDING",
            "completed_at": proc.completed_at
        }
    }
