from typing import Optional

from app.core.errors import ClinSyncAppException, ErrorCode
from app.dependencies.auth import get_optional_auth
from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.models.patient import Patient
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
        "Blocks unconfirmed patients with 403. Requires patient session or clinician token."
    ),
)
def get_patient_context(
    patient_id: str,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
    auth: Optional[dict] = Depends(get_optional_auth),
) -> PatientContextResponse:
    """Read historical clinical facts for an authorized, confirmed patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise ClinSyncAppException(
            status_code=404,
            code=ErrorCode.NOT_FOUND,
            message=f"Patient {patient_id} was not found.",
        )
    if patient.identity_status != "CONFIRMED":
        raise ClinSyncAppException(
            status_code=403,
            code=ErrorCode.IDENTITY_NOT_CONFIRMED,
            message="Patient identity must be confirmed before clinical records can be accessed.",
        )

    # For confirmed patients, authentication and authorization are strictly required:
    if not auth:
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message="Authentication credentials were not provided.",
        )

    caller_role = auth.get("role", "")
    caller_id = auth.get("sub", "")
    if caller_role == "patient" and caller_id != patient_id:
        raise ClinSyncAppException(
            status_code=403,
            code=ErrorCode.ACCESS_DENIED,
            message="Access denied: Cannot access clinical context of another patient.",
        )
    if caller_role not in ("patient", "doctor", "staff", "admin"):
        raise ClinSyncAppException(
            status_code=403,
            code=ErrorCode.ACCESS_DENIED,
            message=(
                f"Access denied: role '{caller_role}' is not authorized to view patient records."
            ),
        )

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
