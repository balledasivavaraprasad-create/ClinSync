"""LangGraph state schema for ClinSync adaptive intake workflow."""

from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, Field

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

SourceType = Literal[
    "PATIENT_VOICE",
    "PATIENT_FORM",
    "UPLOADED_DOCUMENT",
    "HISTORICAL_EHR",
    "DOCTOR_INPUT",
]

WorkflowStatus = Literal[
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    "ESCALATE_EMERGENCY",
    "HUMAN_REVIEW",
]


class ClinicalFactModel(BaseModel):
    """Pydantic representation of the canonical ClinicalFact schema in OpenAPI."""
    id: str
    patient_id: str
    encounter_id: str | None = None
    concept: str
    value: str
    unit: str | None = None
    clinical_time: str | None = None
    recorded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    fact_type: FactType = "symptom"
    status: FactStatus = "reported"
    source_type: SourceType = "PATIENT_VOICE"
    source_id: str = "INTAKE-VOICE-TURN"
    source_location: str | None = None
    extraction_method: str | None = "gemini_structured_extraction"
    confidence: float | None = 1.0
    reviewed_by: str | None = None
    supersedes_fact_id: str | None = None


class IntakeState(BaseModel):
    """Explicit LangGraph state container for conversational adaptive intake."""
    encounter_id: str
    patient_id: str
    status: WorkflowStatus = "IN_PROGRESS"
    turn_count: int = 0
    max_turns: int = 5
    input_modality: Literal["VOICE", "TOUCH_TEXT"] = "VOICE"

    # Clinical fields tracking
    chief_complaint: str | None = None
    known_fields: dict[str, Any] = Field(default_factory=dict)
    missing_fields: list[str] = Field(
        default_factory=lambda: ["chief_complaint", "duration_onset", "severity_progression", "associated_symptoms"]
    )
    uncertain_fields: list[str] = Field(default_factory=list)
    conflicting_fields: list[str] = Field(default_factory=list)

    # Facts & turns
    extracted_facts: list[ClinicalFactModel] = Field(default_factory=list)
    dialog_history: list[dict[str, str]] = Field(default_factory=list)
    last_patient_input: str | None = None
    next_question: str | None = None

    # Safety & emergency escalation
    emergency_detected: bool = False
    emergency_rationale: str | None = None
    trace_id: str = Field(default_factory=lambda: f"trace-intake-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}")
    notes: list[str] = Field(default_factory=list)
