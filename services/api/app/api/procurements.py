from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_demo_session, DemoSession
from app.models.entities import Procurement, Booking, Dispute, User
from app.schemas.schemas import ConfirmQuantityRequest, DisputeCreateRequest, DisputeSchema
from app.services.procurement_service import ProcurementService

router = APIRouter(tags=["Farmer Transactions & Transparency"])

def serialize_procurement(p: Procurement) -> dict:
    b = p.booking
    disputes_data = [
        {
            "id": d.id,
            "type": d.type,
            "reported_quantity_q": d.reported_quantity_q,
            "reason": d.reason,
            "status": d.status,
            "resolution_note": d.resolution_note,
            "resolved_by": d.resolved_by,
            "created_at": d.created_at
        } for d in p.disputes
    ]
    return {
        "id": p.id,
        "booking_id": b.id if b else None,
        "booking_number": b.booking_number if b else "N/A",
        "farmer_id": b.farmer_id if b else None,
        "farmer_name": b.farmer.display_name if b and b.farmer else "Farmer",
        "centre_name": b.centre.name if b and b.centre else "Procurement Centre",
        "commodity_name": b.commodity.name if b and b.commodity else "Commodity",
        "expected_quantity_q": p.expected_quantity_q,
        "actual_quantity_q": p.actual_quantity_q,
        "quantity_recorded_at": p.quantity_recorded_at,
        "farmer_confirmed_at": p.farmer_confirmed_at,
        "quality_status": p.quality_status,
        "quality_reason": p.quality_reason,
        "procurement_status": p.procurement_status,
        "payment_status": p.payment_status.status if p.payment_status else "PENDING",
        "payment_reference": p.payment_status.external_reference_masked if p.payment_status else None,
        "completed_at": p.completed_at,
        "disputes": disputes_data
    }

@router.get("/farmers/{farmer_id}/transactions", response_model=dict)
def get_farmer_transactions(
    farmer_id: str,
    db: Session = Depends(get_db)
):
    procurements = db.query(Procurement).join(Booking).filter(
        Booking.farmer_id == farmer_id
    ).order_by(Procurement.created_at.desc()).all()

    data = [serialize_procurement(p) for p in procurements]
    return {"data": data}

@router.get("/procurements/{id}", response_model=dict)
def get_procurement_detail(id: str, db: Session = Depends(get_db)):
    proc = db.query(Procurement).filter(Procurement.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement record not found")
    return {"data": serialize_procurement(proc)}

@router.post("/procurements/{id}/confirm-quantity", response_model=dict)
def confirm_quantity(
    id: str,
    req: ConfirmQuantityRequest,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    proc = ProcurementService.farmer_confirm_quantity(
        db=db,
        procurement_id=id,
        farmer_user_id=session.user_id
    )
    return {"data": serialize_procurement(proc)}

@router.post("/procurements/{id}/disputes", response_model=dict)
def create_dispute_ticket(
    id: str,
    req: DisputeCreateRequest,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    dispute = ProcurementService.create_dispute(
        db=db,
        procurement_id=id,
        farmer_user_id=session.user_id,
        dispute_type=req.type,
        reported_quantity_q=req.reported_quantity_q,
        reason=req.reason
    )
    return {
        "data": {
            "id": dispute.id,
            "procurement_id": dispute.procurement_id,
            "type": dispute.type,
            "reported_quantity_q": dispute.reported_quantity_q,
            "reason": dispute.reason,
            "status": dispute.status,
            "created_at": dispute.created_at
        }
    }

@router.get("/disputes/{id}", response_model=dict)
def get_dispute(id: str, db: Session = Depends(get_db)):
    dispute = db.query(Dispute).filter(Dispute.id == id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute ticket not found")
    return {
        "data": {
            "id": dispute.id,
            "procurement_id": dispute.procurement_id,
            "farmer_id": dispute.farmer_id,
            "type": dispute.type,
            "reported_quantity_q": dispute.reported_quantity_q,
            "reason": dispute.reason,
            "status": dispute.status,
            "resolution_note": dispute.resolution_note,
            "resolved_by": dispute.resolved_by,
            "created_at": dispute.created_at,
            "updated_at": dispute.updated_at
        }
    }

@router.get("/disputes", response_model=dict)
def list_disputes(db: Session = Depends(get_db)):
    disputes = db.query(Dispute).order_by(Dispute.created_at.desc()).all()
    data = [
        {
            "id": d.id,
            "procurement_id": d.procurement_id,
            "farmer_name": d.farmer.display_name if d.farmer else "Farmer",
            "type": d.type,
            "reported_quantity_q": d.reported_quantity_q,
            "reason": d.reason,
            "status": d.status,
            "resolution_note": d.resolution_note,
            "created_at": d.created_at
        } for d in disputes
    ]
    return {"data": data}
