from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import (
    Booking, Procurement, PaymentStatus, Dispute, QueueEntry, Centre
)
from app.audit.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.queue_service import QueueService

class ProcurementService:
    @classmethod
    def start_weighing(
        cls,
        db: Session,
        booking_id: str,
        actor_user_id: str,
        actor_role: str
    ) -> Procurement:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        booking.status = "WEIGHING"
        if booking.queue_entry:
            booking.queue_entry.queue_status = "SERVING"
            booking.queue_entry.serving_started_at = datetime.now(timezone.utc)

        proc = booking.procurement
        if not proc:
            proc = Procurement(
                booking_id=booking.id,
                expected_quantity_q=booking.expected_quantity_q,
                procurement_status="PENDING"
            )
            db.add(proc)

        AuditService.log(
            db=db,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            centre_id=booking.centre_id,
            entity_type="procurement",
            entity_id=proc.id,
            action="WEIGHING_STARTED",
            reason="Farmer called to weighing bridge"
        )
        db.commit()
        QueueService.recalculate_centre_queue(db, booking.centre_id, booking.booking_date)
        return proc

    @classmethod
    def record_actual_quantity(
        cls,
        db: Session,
        booking_id: str,
        actual_quantity_q: float,
        actor_user_id: str,
        actor_role: str,
        operator_note: Optional[str] = None
    ) -> Procurement:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        proc = booking.procurement
        if not proc:
            proc = Procurement(
                booking_id=booking.id,
                expected_quantity_q=booking.expected_quantity_q,
                procurement_status="PENDING"
            )
            db.add(proc)

        old_actual = proc.actual_quantity_q
        now = datetime.now(timezone.utc)

        proc.actual_quantity_q = actual_quantity_q
        proc.quantity_recorded_at = now
        booking.status = "QUALITY_CHECK"

        # Log audit trail for actual quantity recording / modification
        AuditService.log(
            db=db,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            centre_id=booking.centre_id,
            entity_type="procurement",
            entity_id=proc.id,
            action="ACTUAL_QUANTITY_RECORDED" if old_actual is None else "ACTUAL_QUANTITY_CORRECTED",
            old_value={"expected_q": proc.expected_quantity_q, "actual_q": old_actual},
            new_value={"expected_q": proc.expected_quantity_q, "actual_q": actual_quantity_q},
            reason=operator_note or "Manual weighed quantity entered by centre scale operator"
        )

        # Notify farmer with transparent digital receipt
        NotificationService.send(
            db=db,
            user_id=booking.farmer_id,
            event_type="QUANTITY_RECORDED",
            title="Weighing Complete — Review & Confirm",
            body=f"Recorded Weight: {actual_quantity_q} q (Expected: {proc.expected_quantity_q} q). Please confirm in your AnnaSetu portal or report a discrepancy.",
            booking_id=booking.id
        )

        db.commit()
        return proc

    @classmethod
    def farmer_confirm_quantity(
        cls,
        db: Session,
        procurement_id: str,
        farmer_user_id: str
    ) -> Procurement:
        proc = db.query(Procurement).filter(Procurement.id == procurement_id).first()
        if not proc:
            raise ValueError("Procurement record not found")

        if proc.actual_quantity_q is None:
            raise ValueError("Actual quantity has not been recorded yet")

        now = datetime.now(timezone.utc)
        proc.farmer_confirmed_at = now

        AuditService.log(
            db=db,
            actor_user_id=farmer_user_id,
            actor_role="FARMER",
            centre_id=proc.booking.centre_id,
            entity_type="procurement",
            entity_id=proc.id,
            action="FARMER_CONFIRMED_QUANTITY",
            new_value={"confirmed_quantity_q": proc.actual_quantity_q, "confirmed_at": now.isoformat()},
            reason="Farmer verified weighed quantity on AnnaSetu digital portal"
        )

        NotificationService.send(
            db=db,
            user_id=farmer_user_id,
            event_type="QUANTITY_CONFIRMED",
            title="Quantity Confirmed",
            body=f"You successfully confirmed {proc.actual_quantity_q} quintals.",
            booking_id=proc.booking_id
        )

        db.commit()
        return proc

    @classmethod
    def create_dispute(
        cls,
        db: Session,
        procurement_id: str,
        farmer_user_id: str,
        dispute_type: str,
        reported_quantity_q: Optional[float],
        reason: str
    ) -> Dispute:
        proc = db.query(Procurement).filter(Procurement.id == procurement_id).first()
        if not proc:
            raise ValueError("Procurement record not found")

        dispute = Dispute(
            procurement_id=proc.id,
            farmer_id=farmer_user_id,
            type=dispute_type,
            reported_quantity_q=reported_quantity_q,
            reason=reason,
            status="OPEN"
        )
        db.add(dispute)
        db.flush()

        AuditService.log(
            db=db,
            actor_user_id=farmer_user_id,
            actor_role="FARMER",
            centre_id=proc.booking.centre_id,
            entity_type="dispute",
            entity_id=dispute.id,
            action="DISPUTE_OPENED",
            new_value={
                "type": dispute_type,
                "reported_quantity_q": reported_quantity_q,
                "recorded_actual_q": proc.actual_quantity_q,
                "reason": reason
            },
            reason="Farmer flagged discrepancy on weighed quantity"
        )

        NotificationService.send(
            db=db,
            user_id=farmer_user_id,
            event_type="DISPUTE_OPENED",
            title="Discrepancy Ticket Submitted",
            body=f"Dispute Ticket #{dispute.id[:8]} opened. Procurement staff and supervisory admin have been alerted.",
            booking_id=proc.booking_id
        )

        db.commit()
        return dispute

    @classmethod
    def record_quality_check(
        cls,
        db: Session,
        booking_id: str,
        quality_status: str,
        quality_reason: str,
        actor_user_id: str,
        actor_role: str
    ) -> Procurement:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        proc = booking.procurement
        if not proc:
            raise ValueError("Procurement record not found")

        old_status = proc.quality_status
        proc.quality_status = quality_status
        proc.quality_reason = quality_reason

        AuditService.log(
            db=db,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            centre_id=booking.centre_id,
            entity_type="procurement",
            entity_id=proc.id,
            action="QUALITY_CHECK_RECORDED",
            old_value={"quality_status": old_status},
            new_value={"quality_status": quality_status, "reason": quality_reason},
            reason=quality_reason
        )

        NotificationService.send(
            db=db,
            user_id=booking.farmer_id,
            event_type="QUALITY_CHECK",
            title=f"Quality Check: {quality_status}",
            body=f"Quality inspection result: {quality_status} ({quality_reason}).",
            booking_id=booking.id
        )

        db.commit()
        return proc

    @classmethod
    def complete_procurement(
        cls,
        db: Session,
        booking_id: str,
        actor_user_id: str,
        actor_role: str,
        completion_note: Optional[str] = None
    ) -> Procurement:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        proc = booking.procurement
        if not proc:
            raise ValueError("Procurement record not found")

        if proc.actual_quantity_q is None:
            raise ValueError("Cannot complete procurement: Actual quantity not recorded")

        if proc.quality_status not in ["PASSED", "FAILED"]:
            raise ValueError("Cannot complete procurement: Quality inspection not completed")

        now = datetime.now(timezone.utc)
        proc.procurement_status = "ACCEPTED" if proc.quality_status == "PASSED" else "REJECTED"
        proc.completed_at = now

        booking.status = "COMPLETED"
        if booking.queue_entry:
            booking.queue_entry.queue_status = "COMPLETED"
            booking.queue_entry.completed_at = now
            booking.queue_entry.estimated_wait_min = 0

        # Update centre processed today quantity
        centre = booking.centre
        centre.processed_today_q += proc.actual_quantity_q

        # Create or update PaymentStatus (external government process)
        if not proc.payment_status:
            payment = PaymentStatus(
                procurement_id=proc.id,
                status="PENDING",
                source="PFMS_GOV_EXTERNAL",
                external_reference_masked=f"PFMS-2026-{proc.id[:6].upper()}",
                updated_by="SYSTEM_SYNC"
            )
            db.add(payment)

        AuditService.log(
            db=db,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            centre_id=booking.centre_id,
            entity_type="procurement",
            entity_id=proc.id,
            action="PROCUREMENT_COMPLETED",
            new_value={
                "procurement_status": proc.procurement_status,
                "actual_quantity_q": proc.actual_quantity_q,
                "quality_status": proc.quality_status,
                "payment_status": "PENDING"
            },
            reason=completion_note or "Procurement batch accepted and logged"
        )

        NotificationService.send(
            db=db,
            user_id=booking.farmer_id,
            event_type="PROCUREMENT_COMPLETED",
            title="Procurement Completed Successfully",
            body=f"Your produce ({proc.actual_quantity_q} q of {booking.commodity.name}) was successfully procured. Payment request forwarded to government PFMS disbursal.",
            booking_id=booking.id
        )

        db.commit()
        QueueService.recalculate_centre_queue(db, booking.centre_id, booking.booking_date)
        return proc
