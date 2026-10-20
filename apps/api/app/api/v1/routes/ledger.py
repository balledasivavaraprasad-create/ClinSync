"""Clinical Context Ledger and Patient Context Diff routes."""

from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.ledger import DiffResponse, LedgerResponse
from app.services.ledger_service import LedgerService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(tags=["Ledger"])


@router.get(
    "/encounters/{encounter_id}/ledger",
    response_model=LedgerResponse,
    summary="Read Clinical Context Ledger with provenance",
    operation_id="getEncounterLedger",
)
def get_encounter_ledger(
    encounter_id: str,
    patient_id: str | None = None,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> LedgerResponse:
    """Read all clinical facts for an encounter with provenance and unresolved conflicts."""
    data = LedgerService.get_encounter_ledger(
        db=db, encounter_id=encounter_id, patient_id=patient_id
    )
    return LedgerResponse(data=data, request_id=request_id)


@router.get(
    "/encounters/{encounter_id}/diff",
    response_model=DiffResponse,
    summary="Read Patient Context Diff (previous vs current)",
    operation_id="getEncounterDiff",
)
def get_encounter_diff(
    encounter_id: str,
    patient_id: str | None = None,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> DiffResponse:
    """Read patient context diff comparing previous records with current encounter facts."""
    data = LedgerService.get_encounter_diff(db=db, encounter_id=encounter_id, patient_id=patient_id)
    return DiffResponse(data=data, request_id=request_id)
