import json
import uuid
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.entities import AuditLog

class AuditService:
    @staticmethod
    def log(
        db: Session,
        actor_user_id: str,
        actor_role: str,
        entity_type: str,
        entity_id: str,
        action: str,
        centre_id: Optional[str] = None,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        reason: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> AuditLog:
        old_json = json.dumps(old_value, default=str) if old_value is not None else None
        new_json = json.dumps(new_value, default=str) if new_value is not None else None
        
        audit_entry = AuditLog(
            id=str(uuid.uuid4()),
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            centre_id=centre_id,
            entity_type=entity_type,
            entity_id=str(entity_id),
            action=action,
            old_value_json=old_json,
            new_value_json=new_json,
            reason=reason,
            request_id=request_id or str(uuid.uuid4())[:8]
        )
        db.add(audit_entry)
        # We flush so it gets persisted in the current transaction
        db.flush()
        return audit_entry
