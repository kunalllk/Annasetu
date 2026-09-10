import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.entities import Notification

class NotificationService:
    @staticmethod
    def send(
        db: Session,
        user_id: str,
        event_type: str,
        title: str,
        body: str,
        booking_id: Optional[str] = None,
        channel: str = "IN_APP"
    ) -> Notification:
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            booking_id=booking_id,
            channel=channel,
            event_type=event_type,
            title=title,
            body=body,
            delivery_status="SENT",
            provider_message_id=f"MOCK-SMS-{uuid.uuid4().hex[:8]}" if channel == "SMS_MOCK" else None,
            created_at=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc)
        )
        db.add(notif)
        db.flush()
        return notif
