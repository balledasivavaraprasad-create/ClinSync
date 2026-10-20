from typing import Optional

from app.core.errors import ClinSyncAppException, ErrorCode
from app.dependencies.auth import get_optional_auth
from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.models.encounter import Encounter
from app.schemas.doctor import (
    ApprovalRequest,
    ApprovalResponse,
    DoctorBriefResponse,
)
from app.schemas.encounter import (
    CreateEncounterRequest,
    EncounterResponse,
)
from app.schemas.encounter import (
    Encounter as EncounterSchema,
)
from app.schemas.intake import IntakeAnswerRequest, IntakeStateResponse
from app.services.doctor_service import DoctorService
from app.services.encounter_service import EncounterService
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/encounters", tags=["Encounters"])
doctor_service = DoctorService()


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


@router.get(
    "/{encounter_id}/brief",
    response_model=DoctorBriefResponse,
    summary="Get evidence-linked doctor brief",
    description="Retrieve synthesized doctor brief with evidence citations from ledger facts.",
)
def get_doctor_brief(
    encounter_id: str,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> DoctorBriefResponse:
    """Retrieve evidence-backed clinical brief for an encounter."""
    return doctor_service.get_doctor_brief(
        db=db,
        encounter_id=encounter_id,
        request_id=request_id,
    )


@router.post(
    "/{encounter_id}/approvals",
    response_model=ApprovalResponse,
    summary="Record doctor clinical review and approval",
    description=(
        "Record doctor review, sign-off, or corrections. Updates clinical facts "
        "to doctor_confirmed, transitions encounter status to DOCTOR_REVIEWED, "
        "and appends an audit event."
    ),
)
def approve_encounter(
    encounter_id: str,
    payload: ApprovalRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
    auth: Optional[dict] = Depends(get_optional_auth),
) -> ApprovalResponse:
    """Record physician clinical approval and update ledger facts."""
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise ClinSyncAppException(
            status_code=404,
            code=ErrorCode.NOT_FOUND,
            message=f"Encounter {encounter_id} was not found.",
        )
    if not encounter.patient or encounter.patient.identity_status != "CONFIRMED":
        raise ClinSyncAppException(
            status_code=403,
            code=ErrorCode.IDENTITY_NOT_CONFIRMED,
            message="Patient identity must be confirmed before recording clinical approval.",
        )

    if not auth:
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message="Authentication credentials were not provided.",
        )
    if auth.get("role") not in ("doctor", "admin"):
        raise ClinSyncAppException(
            status_code=403,
            code=ErrorCode.ACCESS_DENIED,
            message=(
                "Insufficient permissions: only authorized physicians may sign off on encounters."
            ),
        )

    return doctor_service.approve_encounter(
        db=db,
        encounter_id=encounter_id,
        payload=payload,
        request_id=request_id,
    )
