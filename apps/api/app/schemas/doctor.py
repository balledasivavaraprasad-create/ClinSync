"""Schemas for doctor queue, patient handoff, and clinical approvals."""

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.encounter import Encounter as EncounterSchema
from app.schemas.fact import ClinicalFact as ClinicalFactSchema


class DoctorQueueItem(BaseModel):
    """Schema for individual doctor queue item matching web frontend types."""

    encounter_id: str
    patient_id: str
    patient_name: str
    appointment_time: str
    department: str
    priority: Literal["ROUTINE", "ELEVATED", "URGENT"]
    triage_note: str
    status: Literal["PENDING_REVIEW", "IN_CONSULTATION", "COMPLETED"]


class DoctorQueueData(BaseModel):
    """Data container for doctor queue response conforming to OpenAPI and web types."""

    doctor_id: str
    encounters: list[EncounterSchema] = Field(default_factory=list)
    queue: list[DoctorQueueItem] = Field(default_factory=list)


class DoctorQueueResponse(BaseModel):
    """Top-level response envelope for GET /doctors/{id}/queue."""

    data: DoctorQueueData
    request_id: str


class ApprovalRequest(BaseModel):
    """Request payload for POST /encounters/{id}/approvals."""

    approved: bool = True
    doctor_notes: str
    doctor_id: Optional[str] = "dr_review"
    decision: Optional[Literal["APPROVED", "CORRECTIONS_NEEDED", "REJECTED"]] = None
    corrected_facts: Optional[list[ClinicalFactSchema]] = None
    corrected_fact_ids: Optional[list[str]] = None

    def model_post_init(self, __context: object) -> None:
        if self.decision is not None and "approved" not in self.model_fields_set:
            self.approved = self.decision in ["APPROVED", "CORRECTIONS_NEEDED"]
        elif self.decision is None:
            self.decision = "APPROVED" if self.approved else "REJECTED"


class ApprovalData(BaseModel):
    """Data container for encounter approval response."""

    encounter_id: str
    status: str = "DOCTOR_REVIEWED"
    approved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approval_id: Optional[str] = None
    recorded_at: Optional[datetime] = None
    approval_status: Optional[str] = "RECORDED"

    def model_post_init(self, __context: object) -> None:
        if self.recorded_at is None:
            self.recorded_at = self.approved_at


class ApprovalResponse(BaseModel):
    """Top-level response envelope for POST /encounters/{id}/approvals."""

    data: ApprovalData
    request_id: str


class DoctorBriefCitation(BaseModel):
    """Citation linking clinical claim to ledger fact and source document."""

    citation_id: str
    fact_id: Optional[str] = None
    source_id: str
    source_type: str
    text_snippet: Optional[str] = None


class DoctorBriefData(BaseModel):
    """Data container for clinical brief response conforming to OpenAPI and web types."""

    encounter_id: str
    patient_name: str
    chief_complaint: str
    clinical_summary: str
    summary_text: str
    citations: list[DoctorBriefCitation] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(default_factory=list)
    audio_status: Literal["READY", "PENDING", "UNAVAILABLE"] = "PENDING"
    audio_url: Optional[str] = None
    audio_brief_available: bool = False
    audio_brief_url: Optional[str] = None

    def model_post_init(self, __context: object) -> None:
        if not self.summary_text and self.clinical_summary:
            self.summary_text = self.clinical_summary
        elif not self.clinical_summary and self.summary_text:
            self.clinical_summary = self.summary_text
        if self.audio_brief_url and not self.audio_url:
            self.audio_url = self.audio_brief_url
        elif self.audio_url and not self.audio_brief_url:
            self.audio_brief_url = self.audio_url


class DoctorBriefResponse(BaseModel):
    """Top-level response envelope for GET /encounters/{id}/brief."""

    data: DoctorBriefData
    request_id: str
