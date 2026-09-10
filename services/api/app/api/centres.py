from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.entities import Commodity, Centre
from app.schemas.schemas import CommoditySchema, CentreSchema, CentreCapacitySchema

router = APIRouter(tags=["Commodities & Centres"])

@router.get("/commodities", response_model=dict)
def get_commodities(db: Session = Depends(get_db)):
    commodities = db.query(Commodity).filter(Commodity.active == True).all()
    data = [CommoditySchema.from_orm(c).dict() for c in commodities]
    return {"data": data}

def format_centre_response(c: Centre) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "name": c.name,
        "address": c.address,
        "lat": c.lat,
        "lng": c.lng,
        "operating_start": c.operating_start,
        "operating_end": c.operating_end,
        "active": c.active,
        "capacity": {
            "storage_capacity_q": c.storage_capacity_q,
            "occupied_committed_q": c.occupied_committed_q,
            "remaining_storage_q": c.remaining_storage_q,
            "storage_capacity_tonnes": round(c.storage_capacity_q / 10.0, 1),
            "occupied_committed_tonnes": round(c.occupied_committed_q / 10.0, 1),
            "remaining_storage_tonnes": round(c.remaining_storage_q / 10.0, 1),
            "daily_processing_capacity_q": c.daily_processing_capacity_q,
            "processed_today_q": c.processed_today_q,
            "remaining_daily_processing_q": c.remaining_daily_processing_q,
            "daily_processing_capacity_tonnes": round(c.daily_processing_capacity_q / 10.0, 1),
            "processed_today_tonnes": round(c.processed_today_q / 10.0, 1),
            "remaining_daily_processing_tonnes": round(c.remaining_daily_processing_q / 10.0, 1),
            "processing_rate_q_per_hr": c.processing_rate_q_per_hr
        },
        "commodities": [
            CommoditySchema.from_orm(assoc.commodity).dict()
            for assoc in c.commodities if assoc.active and assoc.commodity.active
        ]
    }

@router.get("/centres", response_model=dict)
def get_centres(db: Session = Depends(get_db)):
    centres = db.query(Centre).filter(Centre.active == True).all()
    data = [format_centre_response(c) for c in centres]
    return {"data": data}

@router.get("/centres/{id}", response_model=dict)
def get_centre_detail(id: str, db: Session = Depends(get_db)):
    centre = db.query(Centre).filter(Centre.id == id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    return {"data": format_centre_response(centre)}
