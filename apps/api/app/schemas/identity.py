"""Identity lookup and confirmation schemas matching OpenAPI contracts."""

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ResponseEnvelope


class CandidateItem(BaseModel):
    """Candidate match hint without exposing medical or private history."""

    candidate_id: str = Field(..., description="Opaque candidate identifier")
    display_name_masked: str = Field(..., description="Masked name, e.g. J*** D**")
    confidence_score: Optional[float] = Field(None, description="Candidate match confidence")
    masked_name: Optional[str] = Field(None, description="Client alias for display_name_masked")
    dob_year: Optional[int] = Field(None, description="Birth year hint")
    contact_hint: Optional[str] = Field(None, description="Masked contact hint")

    @model_validator(mode="before")
    @classmethod
    def populate_alias_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "masked_name" not in data and "display_name_masked" in data:
                data["masked_name"] = data["display_name_masked"]
        return data


class CandidateLookupData(BaseModel):
    """Candidate lookup payload."""

    candidates: list[CandidateItem] = Field(default_factory=list)


class CandidateLookupRequest(BaseModel):
    """Request for biometric or demographic candidate lookup."""

    biometric_consent: bool = Field(True, description="Consent to use candidate matching")
    search_hint: Optional[str] = Field(None, description="Optional search term or hint")
    query: Optional[str] = Field(None, description="Client alias for search_hint")
    biometric_token: Optional[str] = Field(None, description="Optional biometric token")

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("search_hint") and data.get("query"):
                data["search_hint"] = data["query"]
        return data


class CandidateLookupResponse(ResponseEnvelope[CandidateLookupData]):
    """Response containing identity candidate suggestions."""

    pass


class IdentityConfirmRequest(BaseModel):
    """Secondary confirmation request to unlock patient records."""

    candidate_id: str = Field(..., description="Selected candidate identifier")
    date_of_birth: Optional[date] = Field(None, description="Secondary verification factor (DOB)")
    consent_accepted: bool = Field(True, description="Patient acceptance of intake terms")
    secondary_auth_type: Optional[str] = Field(None, description="Auth type e.g. dob_full")
    auth_payload: Optional[str] = Field(None, description="Payload containing DOB string")

    @model_validator(mode="before")
    @classmethod
    def map_auth_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("date_of_birth") and data.get("auth_payload"):
                try:
                    data["date_of_birth"] = date.fromisoformat(data["auth_payload"])
                except (ValueError, TypeError):
                    pass
        return data


class IdentityConfirmData(BaseModel):
    """Identity confirmation result."""

    confirmed: bool = Field(..., description="Whether secondary identity was confirmed")
    patient_id: str = Field(..., description="Confirmed patient ID")
    identity_confirmation_id: str = Field(
        ..., description="Verification token required to create an encounter"
    )
    patient_display_name: str = Field(..., description="Unmasked patient display name")
    display_name: Optional[str] = Field(None, description="Client alias for patient_display_name")
    identity_status: str = Field("CONFIRMED", description="Patient identity status")

    @model_validator(mode="before")
    @classmethod
    def populate_alias_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "display_name" not in data and "patient_display_name" in data:
                data["display_name"] = data["patient_display_name"]
        return data


class IdentityConfirmResponse(ResponseEnvelope[IdentityConfirmData]):
    """Response returned upon successful identity confirmation."""

    pass
