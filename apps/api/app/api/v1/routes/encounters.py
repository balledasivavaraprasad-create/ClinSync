"""Encounter lifecycle and intake turn persistence routes."""

from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.encounter import (
    CreateEncounterRequest,
    EncounterResponse,
)
from app.schemas.encounter import (
    Encounter as EncounterSchema,
)
from app.schemas.intake import IntakeAnswerRequest, IntakeStateResponse
from app.services.encounter_service import EncounterService
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/encounters", tags=["Encounters"])


@router.post(
    "",
    response_model=EncounterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start an intake encounter",
    description="Start an intake encounter after identity confirmation workflow has completed.",
)
def create_encounter(
    req: CreateEncounterRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> EncounterResponse:
    """Create a persistent intake encounter tied to a confirmed patient."""
    encounter = EncounterService.create_encounter(db=db, req=req)
    return EncounterResponse(
        data=EncounterSchema.model_validate(encounter),
        request_id=request_id,
    )


@router.post(
    "/{encounter_id}/answers",
    response_model=IntakeStateResponse,
    summary="Save validated intake answer",
    description=(
        "Save validated intake answer, extract facts to Clinical Context Ledger, "
        "and advance intake workflow state."
    ),
)
def save_intake_answer(
    encounter_id: str,
    req: IntakeAnswerRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> IntakeStateResponse:
    """Persist turn answer, store clinical fact, and return updated intake state."""
    state_data = EncounterService.save_intake_answer(
        db=db,
        encounter_id=encounter_id,
        req=req,
    )
    return IntakeStateResponse(
        data=state_data,
        request_id=request_id,
    )
