from typing import Optional
from domain.models.models import MatterStatus, AuditEvent
from uuid import uuid4
from datetime import datetime


# State machine transitions: valid state changes
VALID_TRANSITIONS = {
    MatterStatus.DRAFT: [MatterStatus.OPEN],
    MatterStatus.OPEN: [MatterStatus.IN_PROGRESS, MatterStatus.CLOSED],
    MatterStatus.IN_PROGRESS: [
        MatterStatus.WAITING_CLIENT,
        MatterStatus.COMPLETED,
        MatterStatus.CLOSED,
    ],
    MatterStatus.WAITING_CLIENT: [
        MatterStatus.IN_PROGRESS,
        MatterStatus.COMPLETED,
        MatterStatus.CLOSED,
    ],
    MatterStatus.COMPLETED: [MatterStatus.CLOSED],
    MatterStatus.CLOSED: [],  # No transitions allowed from closed
}


class MatterWorkflowService:
    @staticmethod
    def can_transition(from_status: MatterStatus, to_status: MatterStatus) -> bool:
        """Check if a state transition is allowed"""
        return to_status in VALID_TRANSITIONS.get(from_status, [])

    @staticmethod
    def create_audit_event(
        entity: str,
        entity_id: str,
        action: str,
        actor_id: str,
        workspace_id: str,
        from_value: Optional[str] = None,
        to_value: Optional[str] = None,
    ) -> AuditEvent:
        """Create an audit event for a matter change"""
        return AuditEvent(
            id=str(uuid4()),
            entity=entity,
            entity_id=entity_id,
            action=action,
            from_value=from_value,
            to_value=to_value,
            actor_id=actor_id,
            workspace_id=workspace_id,
            timestamp=datetime.now(),
        )
