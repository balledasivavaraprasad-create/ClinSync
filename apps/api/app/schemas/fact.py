"""ClinicalFact schema conforming to OpenAPI contracts."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

FactType = Literal[
    "symptom",
    "medication",
    "allergy",
    "condition",
    "investigation",
    "procedure",
    "other",
]

FactStatus = Literal[
    "reported",
    "extracted_unverified",
    "historical_recorded",
    "doctor_confirmed",
    "uncertain",
    "conflicting",
    "rejected",
]

FactSourceType = Literal[
    "PATIENT_VOICE",
    "PATIENT_FORM",
    "UPLOADED_DOCUMENT",
    "HISTORICAL_EHR",
    "DOCTOR_INPUT",
]


class ClinicalFact(BaseModel):
    """Clinical fact with complete source provenance and status."""

    id: str
    patient_id: str
    encounter_id: Optional[str] = None
    concept: str
    value: str
    unit: Optional[str] = None
    clinical_time: Optional[str] = None
    recorded_at: datetime
    fact_type: FactType
    status: FactStatus
    source_type: FactSourceType
    source_id: str
    source_location: Optional[str] = None
    extraction_method: Optional[str] = None
    confidence: Optional[float] = None
    reviewed_by: Optional[str] = None
    supersedes_fact_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
