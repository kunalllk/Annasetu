import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Centre, Booking, QueueEntry, SimulationEvent, Procurement
from app.services.queue_service import QueueService
from app.services.procurement_service import ProcurementService
from app.services.notification_service import NotificationService
from app.audit.audit_service import AuditService

class SimulationService:
    @classmethod
    def run_simulation(
        cls,
        db: Session,
        centre_id: str,
        action: str,
        actor_user_id: str = "SIM_ADMIN",
        actor_role: str = "STAFF",
        minutes: int = 10,
        processing_multiplier: float = 1.0
    ) -> Dict[str, Any]:
        centre = db.query(Centre).filter(Centre.id == centre_id).first()
        if not centre:
            raise ValueError("Centre not found")

        event_payload = {"action": action, "minutes": minutes, "processing_multiplier": processing_multiplier}
        
        sim_event = SimulationEvent(
            centre_id=centre_id,
            event_type=action,
            payload_json=json.dumps(event_payload),
            created_by="STAFF_SIMULATION"
        )
        db.add(sim_event)

        message = ""

        if action == "ADVANCE_10_MIN":
            # Recompute queue with updated timestamp
            QueueService.recalculate_centre_queue(db, centre_id)
            message = f"Advanced time by {minutes} minutes. Queue and ETAs refreshed."

        elif action == "COMPLETE_CURRENT":
            # Find currently serving booking
            serving_booking = db.query(Booking).filter(
                Booking.centre_id == centre_id,
                Booking.status.in_(["WEIGHING", "QUALITY_CHECK"])
            ).first()

            if not serving_booking:
                # Pick first arrived waiting farmer to complete
                first_waiting = db.query(Booking).join(QueueEntry).filter(
                    Booking.centre_id == centre_id,
                    Booking.status == "ARRIVED",
                    QueueEntry.queue_status == "WAITING"
                ).order_by(QueueEntry.queue_position).first()

                if first_waiting:
                    serving_booking = first_waiting
                    first_waiting.status = "WEIGHING"
                    first_waiting.queue_entry.queue_status = "SERVING"
                    db.flush()

            if serving_booking:
                # Ensure actual quantity and quality are populated for clean completion
                proc = serving_booking.procurement
                if not proc:
                    proc = Procurement(
                        booking_id=serving_booking.id,
                        expected_quantity_q=serving_booking.expected_quantity_q,
                        procurement_status="PENDING"
                    )
                    db.add(proc)
                    db.flush()

                if proc.actual_quantity_q is None:
                    proc.actual_quantity_q = round(serving_booking.expected_quantity_q * 0.98, 1)
                    proc.quantity_recorded_at = datetime.now(timezone.utc)
                if proc.quality_status == "PENDING":
                    proc.quality_status = "PASSED"
                    proc.quality_reason = "Demo auto-pass: Grade A Moisture 11.4%"

                ProcurementService.complete_procurement(
                    db=db,
                    booking_id=serving_booking.id,
                    actor_user_id=actor_user_id,
                    actor_role=actor_role,
                    completion_note="Completed via Simulation Control"
                )
                message = f"Farmer {serving_booking.farmer.display_name} ({proc.actual_quantity_q} q) completed. Next farmer summoned."
            else:
                message = "No active farmer to complete in current queue."

        elif action in ["SLOW_PROCESSING", "TRIGGER_ETA_SPIKE"]:
            # Reduce processing rate temporarily to simulate delay
            old_rate = centre.processing_rate_q_per_hr
            new_rate = max(4.0, old_rate * 0.5)
            centre.processing_rate_q_per_hr = new_rate
            db.commit()

            # Recalculate queue ETAs with slower rate
            QueueService.recalculate_centre_queue(db, centre_id)

            # Broadcast delay notification to waiting farmers
            waiting_bookings = db.query(Booking).filter(
                Booking.centre_id == centre_id,
                Booking.status.in_(["ARRIVED", "WAITING", "CONFIRMED"])
            ).all()

            for b in waiting_bookings:
                NotificationService.send(
                    db=db,
                    user_id=b.farmer_id,
                    event_type="DELAY_ALERT",
                    title="Procurement Centre Delay Alert",
                    body=f"Processing rate at {centre.name} has temporarily slowed due to bagging bottlenecks. Your revised ETA has been updated.",
                    booking_id=b.id
                )

            message = f"Processing rate reduced from {old_rate} to {new_rate} q/hr. ETAs dynamically recalculated and delay alerts dispatched."

        elif action == "MARK_SEEDED_NOSHOW":
            # Pick a booked farmer who hasn't arrived
            seeded_late = db.query(Booking).filter(
                Booking.centre_id == centre_id,
                Booking.status == "CONFIRMED"
            ).first()

            if seeded_late:
                QueueService.mark_no_show(
                    db=db,
                    booking_id=seeded_late.id,
                    actor_user_id=actor_user_id,
                    actor_role=actor_role,
                    reason="Simulated missed arrival window"
                )
                message = f"Booking {seeded_late.booking_number} marked as NO-SHOW. Planned capacity ({seeded_late.expected_quantity_q} q) flagged as POTENTIALLY AVAILABLE."
            else:
                message = "No eligible confirmed booking found to mark as no-show."

        db.commit()
        return {
            "success": True,
            "action": action,
            "centre_id": centre_id,
            "message": message,
            "current_rate_q_per_hr": centre.processing_rate_q_per_hr
        }
