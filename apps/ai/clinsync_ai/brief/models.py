"""Data models for Evidence-Backed Doctor Brief and Spoken Summary."""

from enum import Enum

from pydantic import BaseModel, Field


class AudioStatus(str, Enum):
    """Audio generation status matching OpenAPI contract."""

    READY = "READY"
    PENDING = "PENDING"
    UNAVAILABLE = "UNAVAILABLE"


class Citation(BaseModel):
    """Citation linking a clinical brief claim to a verified source fact or document."""

    fact_id: str
    source_id: str
    source_type: str
    concept: str | None = None
    excerpt: str | None = None


class BriefSection(BaseModel):
    """Structured thematic section of a clinical brief."""

    title: str
    content: str
    fact_ids: list[str] = Field(default_factory=list)


class DoctorBriefData(BaseModel):
    """Payload container matching OpenAPI DoctorBriefResponse schema."""

    summary_text: str
    citations: list[Citation] = Field(default_factory=list)
    audio_status: AudioStatus = AudioStatus.UNAVAILABLE
    audio_url: str | None = None
    spoken_summary_script: str | None = None
    sections: list[BriefSection] = Field(default_factory=list)
    patient_reported: list[str] = Field(default_factory=list)
    historical_records: list[str] = Field(default_factory=list)
    extracted_facts: list[str] = Field(default_factory=list)
    verified_facts: list[str] = Field(default_factory=list)
    unresolved_conflicts: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    generation_provider: str = "gemini"
    generation_model: str = "gemini-3.8-flash"
    estimated_speech_seconds: float = 0.0


class DoctorBriefResponse(BaseModel):
    """Doctor brief response conforming strictly to OpenAPI contract."""

    data: DoctorBriefData
    request_id: str
