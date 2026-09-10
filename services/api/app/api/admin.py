from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_demo_session, require_admin_role, DemoSession
from app.models.entities import Centre, AuditLog, PaymentStatus, Procurement, Booking, Dispute
from app.audit.audit_service import AuditService
from app.api.centres import format_centre_response

router = APIRouter(tags=["Super Admin & Analytics"])

@router.get("/admin/centres", response_model=dict)
def admin_list_centres(db: Session = Depends(get_db)):
    centres = db.query(Centre).all()
    return {"data": [format_centre_response(c) for c in centres]}

@router.patch("/admin/centres/{id}", response_model=dict)
def admin_update_centre(
    id: str,
    payload: dict,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    centre = db.query(Centre).filter(Centre.id == id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    old_val = {
        "storage_capacity_q": centre.storage_capacity_q,
        "daily_processing_capacity_q": centre.daily_processing_capacity_q,
        "processing_rate_q_per_hr": centre.processing_rate_q_per_hr
    }

    if "storage_capacity_q" in payload:
        centre.storage_capacity_q = float(payload["storage_capacity_q"])
    if "daily_processing_capacity_q" in payload:
        centre.daily_processing_capacity_q = float(payload["daily_processing_capacity_q"])
    if "processing_rate_q_per_hr" in payload:
        centre.processing_rate_q_per_hr = float(payload["processing_rate_q_per_hr"])

    AuditService.log(
        db=db,
        actor_user_id=session.user_id,
        actor_role="ADMIN",
        centre_id=centre.id,
        entity_type="centre",
        entity_id=centre.id,
        action="CENTRE_CAPACITY_UPDATED",
        old_value=old_val,
        new_value=payload,
        reason="Super Admin capacity re-allocation"
    )

    db.commit()
    return {"data": format_centre_response(centre)}

@router.get("/admin/audit", response_model=dict)
def get_audit_logs(
    limit: int = Query(default=50, le=200),
    centre_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if centre_id:
        query = query.filter(AuditLog.centre_id == centre_id)
    
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    data = [
        {
            "id": l.id,
            "actor_user_id": l.actor_user_id,
            "actor_role": l.actor_role,
            "centre_id": l.centre_id,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "action": l.action,
            "old_value_json": l.old_value_json,
            "new_value_json": l.new_value_json,
            "reason": l.reason,
            "request_id": l.request_id,
            "created_at": l.created_at
        } for l in logs
    ]
    return {"data": data}

@router.patch("/admin/payments/{procurement_id}", response_model=dict)
def update_payment_status(
    procurement_id: str,
    payload: dict,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    proc = db.query(Procurement).filter(Procurement.id == procurement_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement not found")

    new_status = payload.get("status", "COMPLETED")

    payment = proc.payment_status
    if not payment:
        payment = PaymentStatus(
            procurement_id=proc.id,
            status=new_status,
            source="PFMS_GOV_EXTERNAL",
            external_reference_masked=f"PFMS-2026-MANUAL-{proc.id[:6]}",
            updated_by=f"DEMO_OVERRIDE_{session.user_id}"
        )
        db.add(payment)
    else:
        old_status = payment.status
        payment.status = new_status
        payment.updated_by = f"DEMO_OVERRIDE_{session.user_id}"
        payment.last_synced_at = datetime.now(timezone.utc)

    AuditService.log(
        db=db,
        actor_user_id=session.user_id,
        actor_role="ADMIN",
        centre_id=proc.booking.centre_id if proc.booking else None,
        entity_type="payment",
        entity_id=payment.id,
        action="PAYMENT_STATUS_SYNCED",
        old_value={"status": "PENDING"},
        new_value={"status": new_status, "external_reference": payment.external_reference_masked},
        reason="External government PFMS payment disbursement status simulated"
    )

    db.commit()
    return {
        "data": {
            "procurement_id": proc.id,
            "payment_status": payment.status,
            "external_reference": payment.external_reference_masked,
            "note": "Payment status updated (Representing external government PFMS process)."
        }
    }

@router.get("/analytics/centre", response_model=dict)
def get_centre_analytics(
    centre_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    centre_query = db.query(Centre)
    if centre_id:
        centre_query = centre_query.filter(Centre.id == centre_id)
    centre = centre_query.first()
    if not centre:
        centre = db.query(Centre).first()

    # Query metrics
    all_bookings = db.query(Booking).filter(Booking.centre_id == centre.id).all()
    completed_procurements = db.query(Procurement).join(Booking).filter(
        Booking.centre_id == centre.id,
        Procurement.procurement_status == "ACCEPTED"
    ).all()

    total_procured_q = sum(p.actual_quantity_q or 0.0 for p in completed_procurements)
    total_bookings = len(all_bookings)
    no_shows = sum(1 for b in all_bookings if b.status == "NO_SHOW")
    no_show_rate = round((no_shows / total_bookings) * 100.0, 1) if total_bookings > 0 else 0.0

    utilization_pct = round((centre.occupied_committed_q / centre.storage_capacity_q) * 100.0, 1) if centre.storage_capacity_q > 0 else 0.0

    open_disputes = db.query(Dispute).join(Procurement).join(Booking).filter(
        Booking.centre_id == centre.id,
        Dispute.status.in_(["OPEN", "UNDER_REVIEW"])
    ).count()

    pay_pending = db.query(PaymentStatus).join(Procurement).join(Booking).filter(
        Booking.centre_id == centre.id,
        PaymentStatus.status == "PENDING"
    ).count()

    pay_completed = db.query(PaymentStatus).join(Procurement).join(Booking).filter(
        Booking.centre_id == centre.id,
        PaymentStatus.status == "COMPLETED"
    ).count()

    return {
        "data": {
            "centre_id": centre.id,
            "centre_name": centre.name,
            "average_wait_min": 35,
            "average_processing_min": 18,
            "quantity_procured_q": total_procured_q,
            "utilization_pct": utilization_pct,
            "no_show_rate_pct": no_show_rate,
            "payment_pending_count": pay_pending,
            "payment_completed_count": pay_completed,
            "disputes_open_count": open_disputes,
            "series": [
                {"day": "Mon", "procured_q": 280, "target_q": 300},
                {"day": "Tue", "procured_q": 320, "target_q": 300},
                {"day": "Wed", "procured_q": 350, "target_q": 300},
                {"day": "Thu", "procured_q": 310, "target_q": 300},
                {"day": "Fri", "procured_q": 340, "target_q": 300},
            ]
        }
    }
