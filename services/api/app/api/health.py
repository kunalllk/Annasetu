from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE
    }

@router.get("/version")
def version_check():
    return {
        "version": settings.VERSION,
        "engine_version": "rules-v1"
    }
