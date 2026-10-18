"""Intake turn answer and state schemas matching OpenAPI contracts."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ResponseEnvelope
from app.schemas.fact import ClinicalFact


class IntakeAnswerRequest(BaseModel):
    """Answer provided by patient during adaptive intake."""

    field_key: str = Field(..., description="Key of the question being answered")
    raw_response: str = Field(..., description="Transcribed voice or typed response")
    input_modality: Optional[Literal["VOICE", "TOUCH_TEXT"]] = Field(
        default="VOICE", description="Input method used by patient"
    )


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


class IntakeStateResponse(ResponseEnvelope[IntakeStateData]):
    """Response returned after processing an intake turn."""

    pass
