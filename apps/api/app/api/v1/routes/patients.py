"""Patient context retrieval and registration routes."""

from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.patient import (
    Patient as PatientSchema,
)
from app.schemas.patient import (
    PatientContextResponse,
    PatientRegistrationRequest,
    PatientResponse,
)
from app.services.patient_service import PatientService
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get(
    "/{patient_id}/context",
    response_model=PatientContextResponse,
    summary="Retrieve authorized patient clinical context",
    description=(
        "Retrieve authorized patient clinical context after identity is confirmed. "
        "Blocks unconfirmed patients with 403."
    ),
)
def get_patient_context(
    patient_id: str,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> PatientContextResponse:
    """Read historical clinical facts for an authorized, confirmed patient."""
    context_data = PatientService.get_patient_context(db=db, patient_id=patient_id)
    return PatientContextResponse(
        data=context_data,
        request_id=request_id,
    )


@router.post(
    "/register",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manual patient registration fallback",
    description=(
        "Register a new synthetic patient when biometric candidate lookup "
        "is unavailable or bypassed."
    ),
)
def register_patient(
    req: PatientRegistrationRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> PatientResponse:
    """Register a new patient and return the persisted record."""
    patient = PatientService.register_patient(db=db, req=req)
    return PatientResponse(
        data=PatientSchema.model_validate(patient),
        request_id=request_id,
    )
