"""Patient schemas conforming to API contracts."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ResponseEnvelope
from app.schemas.fact import ClinicalFact


class PatientBase(BaseModel):
    """Base patient fields."""

    display_name: str
    date_of_birth: Optional[date] = None
    contact_hint: Optional[str] = None
    hospital_id: str = "HOSP-DEMO-01"
    identity_status: str = "CANDIDATE"


class PatientRegistrationRequest(BaseModel):
    """Manual/non-biometric patient registration request."""

    display_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date = Field(..., description="Date of birth")
    contact_hint: Optional[str] = Field(None, max_length=50)
    hospital_id: str = Field(default="HOSP-DEMO-01")


class Patient(PatientBase):
    """Full patient record representation."""

    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientResponse(ResponseEnvelope[Patient]):
    """Response envelope for patient."""

    pass


class PatientContextData(BaseModel):
    """Allowed clinical context returned after secondary verification."""

    patient_id: str
    display_name: str
    historical_facts: list[ClinicalFact] = Field(default_factory=list)


class PatientContextResponse(ResponseEnvelope[PatientContextData]):
    """Patient context response conforming to openapi.json."""

    pass
