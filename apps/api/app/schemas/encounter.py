"""Encounter schemas conforming to OpenAPI contracts."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ResponseEnvelope

EncounterStatus = Literal[
    "IN_PROGRESS",
    "TRIAGED",
    "BOOKED",
    "DOCTOR_REVIEWED",
    "COMPLETED",
]


class EncounterBase(BaseModel):
    """Base encounter attributes."""

    intake_language: str = Field(default="en")
    intake_status: str = Field(default="NOT_STARTED")
    identity_confirmation_id: Optional[str] = None
    assigned_department_id: Optional[str] = None
    appointment_id: Optional[str] = None


class CreateEncounterRequest(BaseModel):
    """Payload to initiate an intake encounter after verified identity."""

    patient_id: str
    identity_confirmation_id: str
    intake_language: str = "en"


class Encounter(EncounterBase):
    """Encounter representation matching OpenAPI schema."""

    id: str
    patient_id: str
    status: EncounterStatus
    started_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EncounterResponse(ResponseEnvelope[Encounter]):
    """Standard encounter response envelope."""

    pass
