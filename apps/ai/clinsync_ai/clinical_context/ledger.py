"""Clinical Context Ledger engine preserving fact status and conflict visibility."""

import uuid
from typing import Any
from pydantic import BaseModel, Field

from clinsync_ai.graph.state import ClinicalFactModel, FactStatus, FactType, SourceType


class LedgerResponseData(BaseModel):
    """Data container for LedgerResponse."""
    encounter_id: str
    facts: list[ClinicalFactModel] = Field(default_factory=list)
    unresolved_conflicts: list[str] = Field(default_factory=list)


class LedgerResponse(BaseModel):
    """Encounter clinical fact ledger matching OpenAPI LedgerResponse contract."""
    data: LedgerResponseData
    request_id: str


class ClinicalContextLedger:
    """Maintains canonical encounter facts and surfaces unresolved contradictions."""

    def __init__(self, encounter_id: str):
        self.encounter_id = encounter_id
        self._facts: dict[str, ClinicalFactModel] = {}
        self._unresolved_conflicts: list[str] = []

    @property
    def facts(self) -> list[ClinicalFactModel]:
        return list(self._facts.values())

    @property
    def unresolved_conflicts(self) -> list[str]:
        return list(self._unresolved_conflicts)

    def add_fact(self, fact: ClinicalFactModel) -> None:
        """Add a single clinical fact and evaluate conflict invariants."""
        # Ensure encounter_id is attached if missing
        if not fact.encounter_id:
            fact = fact.model_copy(update={"encounter_id": self.encounter_id})

        self._check_conflicts(fact)
        self._facts[fact.id] = fact

    def add_facts(self, facts: list[ClinicalFactModel]) -> None:
        """Add multiple clinical facts to the ledger."""
        for f in facts:
            self.add_fact(f)

    def _check_conflicts(self, new_fact: ClinicalFactModel) -> None:
        """Detect competing clinical claims across sources (Rule 11: No silent conflict resolution)."""
        new_val_lower = new_fact.value.lower().strip()

        # 1. Medication vs Allergy contraindications
        if new_fact.fact_type == "medication":
            for existing in self._facts.values():
                if existing.fact_type == "allergy":
                    alg_val = existing.value.lower().strip()
                    if alg_val in new_val_lower or ("penicillin" in alg_val and "amox" in new_val_lower):
                        conflict_msg = (
                            f"Contraindication conflict: Candidate medication '{new_fact.value}' "
                            f"(Source: {new_fact.source_type}) conflicts with known allergy '{existing.value}' "
                            f"(Source: {existing.source_type})."
                        )
                        if conflict_msg not in self._unresolved_conflicts:
                            self._unresolved_conflicts.append(conflict_msg)
                        new_fact.status = "conflicting"
                        existing.status = "conflicting"

        elif new_fact.fact_type == "allergy":
            for existing in self._facts.values():
                if existing.fact_type == "medication":
                    med_val = existing.value.lower().strip()
                    if new_val_lower in med_val or ("penicillin" in new_val_lower and "amox" in med_val):
                        conflict_msg = (
                            f"Contraindication conflict: Newly reported allergy '{new_fact.value}' "
                            f"conflicts with active medication '{existing.value}'."
                        )
                        if conflict_msg not in self._unresolved_conflicts:
                            self._unresolved_conflicts.append(conflict_msg)
                        new_fact.status = "conflicting"
                        existing.status = "conflicting"

        # 2. Contradictory values for the same discrete concept
        for existing in self._facts.values():
            if existing.id == new_fact.id:
                continue
            if existing.concept == new_fact.concept and existing.fact_type == new_fact.fact_type:
                # If concepts match but values diverge significantly
                if existing.value.lower().strip() != new_val_lower:
                    # e.g., competing blood pressures, competing severity
                    if existing.concept in ("chief_complaint", "blood_pressure", "allergy_status"):
                        conflict_msg = (
                            f"Divergent values for '{existing.concept}': '{existing.value}' ({existing.source_type}) "
                            f"vs '{new_fact.value}' ({new_fact.source_type})."
                        )
                        if conflict_msg not in self._unresolved_conflicts:
                            self._unresolved_conflicts.append(conflict_msg)
                        new_fact.status = "conflicting"
                        existing.status = "conflicting"

    def get_facts_by_status(self, status: FactStatus) -> list[ClinicalFactModel]:
        """Query facts filtered by review/verification status."""
        return [f for f in self._facts.values() if f.status == status]

    def get_facts_by_type(self, fact_type: FactType) -> list[ClinicalFactModel]:
        """Query facts filtered by clinical category."""
        return [f for f in self._facts.values() if f.fact_type == fact_type]

    def to_contract_response(self, request_id: str | None = None) -> LedgerResponse:
        """Serialize current ledger state into an OpenAPI LedgerResponse payload."""
        req_id = request_id or f"req-ledger-{uuid.uuid4().hex[:12]}"
        return LedgerResponse(
            data=LedgerResponseData(
                encounter_id=self.encounter_id,
                facts=list(self._facts.values()),
                unresolved_conflicts=list(self._unresolved_conflicts),
            ),
            request_id=req_id,
        )
