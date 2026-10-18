"""Identity lookup and confirmation schemas matching OpenAPI contracts."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import ResponseEnvelope


class CandidateItem(BaseModel):
    """Candidate match hint without exposing medical or private history."""

    candidate_id: str = Field(..., description="Opaque candidate identifier")
    display_name_masked: str = Field(..., description="Masked name, e.g. J*** D**")
    confidence_score: Optional[float] = Field(None, description="Candidate match confidence")


class CandidateLookupData(BaseModel):
    """Candidate lookup payload."""

    candidates: list[CandidateItem] = Field(default_factory=list)


class CandidateLookupRequest(BaseModel):
    """Request for biometric or demographic candidate lookup."""

    biometric_consent: bool = Field(..., description="Consent to use candidate matching")
    search_hint: Optional[str] = Field(None, description="Optional search term or hint")


class CandidateLookupResponse(ResponseEnvelope[CandidateLookupData]):
    """Response containing identity candidate suggestions."""

    pass


class IdentityConfirmRequest(BaseModel):
    """Secondary confirmation request to unlock patient records."""

    candidate_id: str = Field(..., description="Selected candidate identifier")
    date_of_birth: date = Field(..., description="Secondary verification factor (DOB)")
    consent_accepted: bool = Field(..., description="Patient acceptance of intake terms")


class IdentityConfirmData(BaseModel):
    """Identity confirmation result."""

    confirmed: bool = Field(..., description="Whether secondary identity was confirmed")
    patient_id: str = Field(..., description="Confirmed patient ID")
    identity_confirmation_id: str = Field(
        ..., description="Verification token required to create an encounter"
    )
    patient_display_name: str = Field(..., description="Unmasked patient display name")


class IdentityConfirmResponse(ResponseEnvelope[IdentityConfirmData]):
    """Response returned upon successful identity confirmation."""

    pass
