from typing import Optional
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import User, StaffAssignment

class DemoSession:
    def __init__(
        self,
        role: str,
        user_id: str,
        centre_id: Optional[str] = None,
        user: Optional[User] = None
    ):
        self.role = role
        self.user_id = user_id
        self.centre_id = centre_id
        self.user = user

def get_demo_session(
    x_demo_role: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
    x_demo_centre_id: Optional[str] = Header(default=None),
    db: Session = Depends(get_db)
) -> DemoSession:
    # Prototype session extraction: fallback to default if not provided
    role = (x_demo_role or "STAFF").upper()
    
    user = None
    if x_demo_user_id:
        user = db.query(User).filter(User.id == x_demo_user_id).first()
    
    if not user:
        # Pick default user for the specified role
        user = db.query(User).filter(User.role == role).first()
        if not user:
            user = db.query(User).first()

    centre_id = x_demo_centre_id
    if role == "STAFF" and not centre_id:
        # Check staff assignment
        assignment = db.query(StaffAssignment).filter(
            StaffAssignment.user_id == user.id,
            StaffAssignment.active == True
        ).first()
        if assignment:
            centre_id = assignment.centre_id

    return DemoSession(
        role=role,
        user_id=user.id if user else "guest",
        centre_id=centre_id,
        user=user
    )

def require_staff_role(session: DemoSession = Depends(get_demo_session)) -> DemoSession:
    if session.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Forbidden: Staff or Admin role required")
    return session

def require_admin_role(session: DemoSession = Depends(get_demo_session)) -> DemoSession:
    if session.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Admin role required")
    return session
