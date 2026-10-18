"""Patient schemas conforming to API contracts."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.common import ResponseEnvelope


class PatientBase(BaseModel):
    """Base patient fields."""

    display_name: str
    date_of_birth: Optional[date] = None
    contact_hint: Optional[str] = None
    hospital_id: str = "HOSP-DEMO-01"
    identity_status: str = "CANDIDATE"


class Patient(PatientBase):
    """Full patient record representation."""

    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientResponse(ResponseEnvelope[Patient]):
    """Response envelope for patient."""

    pass
