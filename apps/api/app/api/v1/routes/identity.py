"""Identity candidate lookup and secondary confirmation routes."""

from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.identity import (
    CandidateLookupData,
    CandidateLookupRequest,
    CandidateLookupResponse,
    IdentityConfirmRequest,
    IdentityConfirmResponse,
)
from app.services.patient_service import PatientService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/identity", tags=["Identity"])


@router.post(
    "/candidates",
    response_model=CandidateLookupResponse,
    summary="Lookup identity candidates (demo-only)",
    description=(
        "Biometric or demographic candidate lookup returning "
        "masked/candidate hints without medical details."
    ),
)
def lookup_candidates(
    req: CandidateLookupRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> CandidateLookupResponse:
    """Lookup masked candidate records for kiosk display without disclosing medical history."""
    candidates = PatientService.lookup_candidates(
        db=db,
        biometric_consent=req.biometric_consent,
        search_hint=req.search_hint,
    )
    return CandidateLookupResponse(
        data=CandidateLookupData(candidates=candidates),
        request_id=request_id,
    )


@router.post(
    "/confirm",
    response_model=IdentityConfirmResponse,
    summary="Confirm patient identity",
    description=(
        "Confirm identity candidate using secondary confirmation "
        "before records can be accessed."
    ),
)
def confirm_identity(
    req: IdentityConfirmRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> IdentityConfirmResponse:
    """Validate secondary factor (DOB) and issue identity confirmation token."""
    confirm_data = PatientService.confirm_identity(
        db=db,
        candidate_id=req.candidate_id,
        date_of_birth=req.date_of_birth,
        consent_accepted=req.consent_accepted,
    )
    return IdentityConfirmResponse(
        data=confirm_data,
        request_id=request_id,
    )
