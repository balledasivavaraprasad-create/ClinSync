"""Patient Context Diff Engine: compares historical patient records against current encounter facts."""

import uuid
from pydantic import BaseModel, Field

from clinsync_ai.graph.state import ClinicalFactModel


class ChangedFact(BaseModel):
    """Pair of previous historical fact and current encounter fact representing an evolution or change."""
    previous: ClinicalFactModel
    current: ClinicalFactModel


class DiffResponseData(BaseModel):
    """Data container for DiffResponse matching OpenAPI contract."""
    encounter_id: str
    new_facts: list[ClinicalFactModel] = Field(default_factory=list)
    changed_facts: list[ChangedFact] = Field(default_factory=list)
    conflicts: list[str] = Field(default_factory=list)


class DiffResponse(BaseModel):
    """Encounter context diff response matching OpenAPI contract."""
    data: DiffResponseData
    request_id: str


class PatientContextDiffEngine:
    """Computes semantic delta between historical patient EHR and current encounter ledger."""

    def compute_diff(
        self,
        encounter_id: str,
        historical_facts: list[ClinicalFactModel],
        current_facts: list[ClinicalFactModel],
        request_id: str | None = None,
    ) -> DiffResponse:
        """Analyze differences, changes, and contraindications between historical and current context."""
        req_id = request_id or f"req-diff-{uuid.uuid4().hex[:12]}"

        new_facts: list[ClinicalFactModel] = []
        changed_facts: list[ChangedFact] = []
        conflicts: list[str] = []

        # Index historical facts by concept and category
        hist_by_concept: dict[str, list[ClinicalFactModel]] = {}
        for h in historical_facts:
            hist_by_concept.setdefault(h.concept.lower().strip(), []).append(h)

        # 1. Evaluate current facts against historical baseline
        for curr in current_facts:
            c_key = curr.concept.lower().strip()
            matching_historical = hist_by_concept.get(c_key, [])

            if not matching_historical:
                # Completely new clinical fact
                new_facts.append(curr)
            else:
                # Concept existed previously: check if value or status changed
                exact_match = any(
                    h.value.lower().strip() == curr.value.lower().strip()
                    for h in matching_historical
                )
                if exact_match:
                    # Unchanged fact (still relevant, but not a delta)
                    pass
                else:
                    # Changed fact: pair with the most relevant historical predecessor
                    primary_prev = matching_historical[0]
                    changed_facts.append(
                        ChangedFact(
                            previous=primary_prev,
                            current=curr,
                        )
                    )

        # 2. Conflict & Contraindication detection
        hist_allergies = [
            h.value.lower().strip()
            for h in historical_facts
            if h.fact_type == "allergy"
        ]
        curr_medications = [
            c for c in current_facts
            if c.fact_type == "medication"
        ]

        # Check for medication-allergy contraindication
        for med in curr_medications:
            med_val = med.value.lower().strip()
            for alg in hist_allergies:
                if alg in med_val or ("penicillin" in alg and "amox" in med_val):
                    conflicts.append(
                        f"Contraindication: Candidate medication '{med.value}' "
                        f"(Current Encounter) contravenes documented historical allergy '{alg}' (Historical EHR)."
                    )

        # Check for explicitly marked conflicting facts in current facts
        for curr in current_facts:
            if curr.status == "conflicting":
                msg = f"Conflicting statement: {curr.concept} = '{curr.value}' (Source: {curr.source_type})"
                if msg not in conflicts:
                    conflicts.append(msg)

        return DiffResponse(
            data=DiffResponseData(
                encounter_id=encounter_id,
                new_facts=new_facts,
                changed_facts=changed_facts,
                conflicts=conflicts,
            ),
            request_id=req_id,
        )
