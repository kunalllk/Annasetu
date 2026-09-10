from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import Booking, QueueEntry, Centre, Procurement, AuditLog
from app.audit.audit_service import AuditService
from app.services.notification_service import NotificationService

class QueueService:
    @classmethod
    def recalculate_centre_queue(cls, db: Session, centre_id: str, booking_date: Optional[str] = None) -> List[QueueEntry]:
        """
        Fair Queue Ordering Rule:
        1. Farmers currently SERVING come first (position 1).
        2. Then ARRIVED farmers who are WAITING, ordered primarily by their arrival_at timestamp.
        3. Then BOOKED (not yet arrived) farmers, ordered by their scheduled slot_start.
        4. Neither staff nor algorithms can artificially reorder this fair sequence.
        """
        if not booking_date:
            booking_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        centre = db.query(Centre).filter(Centre.id == centre_id).first()
        if not centre:
            return []

        # Get active bookings for this centre on the given date
        active_bookings = db.query(Booking).filter(
            Booking.centre_id == centre_id,
            Booking.booking_date == booking_date,
            Booking.status.in_(["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING", "QUALITY_CHECK"])
        ).all()

        rate_per_min = max(centre.processing_rate_q_per_hr / 60.0, 0.1)
        now = datetime.now(timezone.utc)

        # Categorize by operational status
        serving_entries = []
        waiting_entries = []
        booked_entries = []

        for b in active_bookings:
            qe = b.queue_entry
            if not qe:
                qe = QueueEntry(
                    booking_id=b.id,
                    queue_status="WAITING" if b.status in ["ARRIVED", "WAITING", "WEIGHING"] else "WAITING"
                )
                db.add(qe)
                db.flush()

            if b.status in ["WEIGHING", "QUALITY_CHECK"] or qe.queue_status == "SERVING":
                serving_entries.append((b, qe))
            elif b.status in ["ARRIVED", "WAITING"]:
                waiting_entries.append((b, qe))
            else: # CONFIRMED
                booked_entries.append((b, qe))

        # Sort serving: by serving_started_at or arrival_at
        serving_entries.sort(key=lambda item: item[1].serving_started_at or item[1].arrival_at or now)

        # Sort waiting (ARRIVED): strictly fair by physical arrival timestamp
        waiting_entries.sort(key=lambda item: item[1].arrival_at or now)

        # Sort booked (not arrived): strictly fair by appointment slot_start
        booked_entries.sort(key=lambda item: item[0].slot_start)

        ordered_list = serving_entries + waiting_entries + booked_entries

        # Assign computed queue positions and dynamic ETAs
        cumulative_q_ahead = 0.0
        position = 1
        updated_entries = []

        for b, qe in ordered_list:
            qe.queue_position = position
            
            if qe.queue_status == "SERVING" or b.status in ["WEIGHING", "QUALITY_CHECK"]:
                qe.estimated_wait_min = 0
                qe.eta_at = now
            else:
                # ETA = (cumulative quantity ahead / processing rate) + baseline queue buffer
                wait_min = int(round(cumulative_q_ahead / rate_per_min))
                qe.estimated_wait_min = max(5, wait_min)
                qe.eta_at = now + timedelta(minutes=qe.estimated_wait_min)

            cumulative_q_ahead += b.expected_quantity_q
            position += 1
            updated_entries.append(qe)

        db.commit()
        return updated_entries

    @classmethod
    def mark_arrived(
        cls,
        db: Session,
        booking_id: str,
        actor_user_id: str,
        actor_role: str,
        note: Optional[str] = None
    ) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        old_status = booking.status
        now = datetime.now(timezone.utc)
        
        booking.status = "ARRIVED"
        
        qe = booking.queue_entry
        if not qe:
            qe = QueueEntry(booking_id=booking.id)
            db.add(qe)
        
        qe.arrival_at = now
        qe.queue_status = "WAITING"

        # Log audit
        AuditService.log(
            db=db,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            centre_id=booking.centre_id,
            entity_type="booking",
            entity_id=booking.id,
            action="FARMER_ARRIVED",
            old_value={"status": old_status},
            new_value={"status": "ARRIVED", "arrival_at": now.isoformat()},
            reason=note or "Farmer arrived at procurement centre gate"
        )

        # In-app notification
        NotificationService.send(
            db=db,
            user_id=booking.farmer_id,
            event_type="ARRIVED",
            title="Checked in at Procurement Centre",
            body=f"Your arrival at {booking.centre.name} has been verified. You are now in the active service queue.",
            booking_id=booking.id
        )

        db.commit()
        cls.recalculate_centre_queue(db, booking.centre_id, booking.booking_date)
        return booking

    @classmethod
    def mark_no_show(
        cls,
        db: Session,
        booking_id: str,
        actor_user_id: str,
        actor_role: str,
        reason: str
    ) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        old_status = booking.status
        booking.status = "NO_SHOW"

        qe = booking.queue_entry
        if qe:
            qe.queue_status = "NO_SHOW"
            qe.queue_position = None
            qe.estimated_wait_min = 0

        # Adjust centre occupied/committed capacity
        centre = booking.centre
        centre.occupied_committed_q = max(0.0, centre.occupied_committed_q - booking.expected_quantity_q)

        # Audit log: clearly note that planned capacity is released as POTENTIALLY AVAILABLE
        AuditService.log(
            db=db,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            centre_id=booking.centre_id,
            entity_type="booking",
            entity_id=booking.id,
            action="NO_SHOW_MARKED",
            old_value={"status": old_status},
            new_value={"status": "NO_SHOW", "capacity_state": "POTENTIALLY_AVAILABLE"},
            reason=reason or "Farmer absent during scheduled arrival window"
        )

        # Notify farmer about no-show status with ability to dispute
        NotificationService.send(
            db=db,
            user_id=booking.farmer_id,
            event_type="NO_SHOW",
            title="Appointment Marked as No-Show",
            body=f"Your booking {booking.booking_number} was marked as No-Show by staff. If this is a mistake, you can report a disputed no-show.",
            booking_id=booking.id
        )

        db.commit()
        cls.recalculate_centre_queue(db, booking.centre_id, booking.booking_date)
        return booking
