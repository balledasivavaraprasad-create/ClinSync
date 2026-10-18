"""Clinical Context Ledger and Context Diff schemas conforming to OpenAPI contracts."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.fact import ClinicalFact


class LedgerData(BaseModel):
    """Authoritative ledger payload of all encounter facts and unresolved conflicts."""

    encounter_id: str
    facts: list[ClinicalFact] = Field(default_factory=list)
    unresolved_conflicts: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class LedgerResponse(BaseModel):
    """Standard envelope for Clinical Context Ledger endpoint."""

    data: LedgerData
    request_id: str


class ChangedFact(BaseModel):
    """Pair of previous/historical fact and current encounter fact for changed concepts."""

    previous: ClinicalFact
    current: ClinicalFact
    historical: Optional[ClinicalFact] = None

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    @model_validator(mode="after")
    def populate_historical_alias(self) -> "ChangedFact":
        """Ensure historical alias matches previous for web frontend compatibility."""
        if self.historical is None:
            self.historical = self.previous
        return self


class ConflictingFactDetail(BaseModel):
    """Detailed pair of contradicting claims and narrative conflict explanation."""

    claim_a: ClinicalFact
    claim_b: ClinicalFact
    conflict_description: str

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class DiffData(BaseModel):
    """Context Diff payload comparing previous EHR records against current encounter."""

    encounter_id: str
    new_facts: list[ClinicalFact] = Field(default_factory=list)
    changed_facts: list[ChangedFact] = Field(default_factory=list)
    conflicts: list[str] = Field(default_factory=list)
    conflicting_facts: list[ConflictingFactDetail] = Field(default_factory=list)
    unresolved_count: int = 0

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class DiffResponse(BaseModel):
    """Standard envelope for Patient Context Diff endpoint."""

    data: DiffData
    request_id: str
