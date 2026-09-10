from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_demo_session, DemoSession
from app.models.entities import Notification, User

router = APIRouter(tags=["Notifications & Mock Auth"])

@router.get("/notifications", response_model=dict)
def get_notifications(
    session: DemoSession = Depends(get_demo_session),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == session.user_id
    ).order_by(Notification.created_at.desc()).all()

    data = [
        {
            "id": n.id,
            "user_id": n.user_id,
            "booking_id": n.booking_id,
            "channel": n.channel,
            "event_type": n.event_type,
            "title": n.title,
            "body": n.body,
            "delivery_status": n.delivery_status,
            "created_at": n.created_at
        } for n in notifs
    ]
    return {"data": data}

@router.get("/auth/demo-users", response_model=dict)
def get_demo_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    data = []
    for u in users:
        centre_id = None
        centre_name = None
        if u.staff_assignment:
            centre_id = u.staff_assignment.centre_id
            centre_name = u.staff_assignment.centre.name if u.staff_assignment.centre else None
        
        village = None
        if u.farmer_profile:
            village = f"{u.farmer_profile.village}, {u.farmer_profile.district}"

        data.append({
            "id": u.id,
            "role": u.role,
            "display_name": u.display_name,
            "mobile_masked": u.mobile_masked,
            "email": u.email,
            "centre_id": centre_id,
            "centre_name": centre_name,
            "village": village
        })
    return {"data": data}
