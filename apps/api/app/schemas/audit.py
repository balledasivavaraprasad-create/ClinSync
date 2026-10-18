"""AuditEvent schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.common import ResponseEnvelope


class AuditEvent(BaseModel):
    """Audit event log entry."""

    id: str
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    actor_id: str
    actor_role: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditEventResponse(ResponseEnvelope[AuditEvent]):
    """Response envelope for audit event."""

    pass
