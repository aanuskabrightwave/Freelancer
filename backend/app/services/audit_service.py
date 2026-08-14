from sqlalchemy.orm import Session
from app.models.admin_audit_log import AdminAuditLog
from typing import Dict, Any, Optional


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        admin_user_id: int,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        description: str = "",
        metadata_json: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AdminAuditLog:
        log = AdminAuditLog(
            admin_user_id=admin_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            metadata_json=metadata_json,
            ip_address=ip_address
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
