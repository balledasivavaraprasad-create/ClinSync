"""Intake turn answer and state schemas matching OpenAPI contracts."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ResponseEnvelope
from app.schemas.fact import ClinicalFact


class IntakeAnswerRequest(BaseModel):
    """Answer provided by patient during adaptive intake."""

    field_key: str = Field(..., description="Key of the question being answered")
    raw_response: str = Field(..., description="Transcribed voice or typed response")
    input_modality: Optional[Literal["VOICE", "TOUCH_TEXT"]] = Field(
        default="VOICE", description="Input method used by patient"
    )

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "question_id" in data and "field_key" not in data:
                data["field_key"] = data["question_id"]
            if "transcription" in data and "raw_response" not in data:
                data["raw_response"] = data["transcription"]
            if "input_modality" in data and isinstance(data["input_modality"], str):
                mod = data["input_modality"].upper()
                data["input_modality"] = "TOUCH_TEXT" if mod in ("TEXT", "TOUCH_TEXT") else "VOICE"
        return data


class IntakeStateData(BaseModel):
    """Current workflow state of conversational intake."""

    encounter_id: str = Field(..., description="Encounter identifier")
    turn_count: int = Field(..., description="Number of completed intake turns")
    status: str = Field(..., description="Current intake status")
    next_question: Optional[str] = Field(
        None, description="Next adaptive intake question, or null if complete"
    )
    extracted_facts: list[ClinicalFact] = Field(
        default_factory=list, description="Clinical facts extracted during intake"
    )
    current_step: Optional[int] = Field(None, description="Current intake step")
    total_steps: Optional[int] = Field(5, description="Total expected intake turns")
    extracted_facts_this_turn: list[ClinicalFact] = Field(
        default_factory=list, description="Facts extracted in this specific turn"
    )
    intake_complete: bool = Field(False, description="Whether conversational intake is complete")


class IntakeStateResponse(ResponseEnvelope[IntakeStateData]):
    """Response returned after processing an intake turn."""

    pass
