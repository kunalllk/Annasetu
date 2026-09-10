from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_demo_session, DemoSession
from app.schemas.schemas import SimulationRunRequest, SimulationResetRequest
from app.simulation.simulation_service import SimulationService
from app.seed.seed_data import reset_and_seed_database

router = APIRouter(prefix="/simulation", tags=["Simulation Engine (DEMO MODE)"])

@router.post("/run", response_model=dict)
def run_simulation(
    req: SimulationRunRequest,
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    try:
        res = SimulationService.run_simulation(
            db=db,
            centre_id=req.centre_id,
            action=req.action,
            actor_user_id=session.user_id,
            actor_role=session.role,
            minutes=req.minutes or 10,
            processing_multiplier=req.processing_multiplier or 1.0
        )
        return {"data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset", response_model=dict)
def reset_simulation(
    req: SimulationResetRequest,
    db: Session = Depends(get_db)
):
    # Completely reset and reseed to clean baseline state
    reset_and_seed_database(db=db)
    return {
        "data": {
            "success": True,
            "message": "AnnaSetu demonstration database has been reset to baseline state with 5 centres, 35 farmers, and fresh queue entries."
        }
    }
