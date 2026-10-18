"""Clinical Context Ledger and Patient Context Diff domain service."""

from sqlalchemy.orm import Session

from app.core.errors import ClinSyncAppException, ErrorCode
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact as ClinicalFactModel
from app.schemas.fact import ClinicalFact as ClinicalFactSchema
from app.schemas.ledger import (
    ChangedFact,
    ConflictingFactDetail,
    DiffData,
    LedgerData,
)


class LedgerService:
    """Service aggregating Clinical Context Ledger and computing Context Diffs."""

    @staticmethod
    def get_encounter_ledger(
        db: Session, encounter_id: str, patient_id: str | None = None
    ) -> LedgerData:
        """Fetch all facts recorded for an encounter and identify unresolved conflicts."""
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Encounter {encounter_id} not found.",
            )

        if patient_id and encounter.patient_id != patient_id:
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.ACCESS_DENIED,
                message=f"Access denied: encounter {encounter_id} belongs to a different patient.",
            )

        facts = (
            db.query(ClinicalFactModel)
            .filter(ClinicalFactModel.encounter_id == encounter_id)
            .order_by(ClinicalFactModel.recorded_at.asc())
            .all()
        )

        unresolved_conflicts: list[str] = []

        # 1. Facts with status == 'conflicting'
        for fact in facts:
            if fact.status == "conflicting":
                desc = f"Conflicting statement for concept '{fact.concept}': {fact.value}"
                if desc not in unresolved_conflicts:
                    unresolved_conflicts.append(desc)

        # 2. Concept contradictions within the current encounter
        grouped_by_concept: dict[str, list[ClinicalFactModel]] = {}
        for fact in facts:
            if fact.status != "rejected":
                grouped_by_concept.setdefault(fact.concept.strip().lower(), []).append(
                    fact
                )

        for _norm_concept, concept_facts in grouped_by_concept.items():
            unique_values = {f.value.strip().lower() for f in concept_facts}
            if len(unique_values) > 1 and any(
                f.status == "conflicting" or not f.supersedes_fact_id
                for f in concept_facts
            ):
                desc = (
                    f"Contradictory values for concept '{concept_facts[0].concept}': "
                    f"{', '.join(sorted({f.value for f in concept_facts}))}"
                )
                if desc not in unresolved_conflicts and not any(
                    concept_facts[0].concept in c for c in unresolved_conflicts
                ):
                    unresolved_conflicts.append(desc)

        fact_schemas = [ClinicalFactSchema.model_validate(f) for f in facts]

        return LedgerData(
            encounter_id=encounter.id,
            facts=fact_schemas,
            unresolved_conflicts=unresolved_conflicts,
        )

    @staticmethod
    def get_encounter_diff(
        db: Session, encounter_id: str, patient_id: str | None = None
    ) -> DiffData:
        """Compute Patient Context Diff comparing historical EHR facts with current encounter."""
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Encounter {encounter_id} not found.",
            )

        if patient_id and encounter.patient_id != patient_id:
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.ACCESS_DENIED,
                message=f"Access denied: encounter {encounter_id} belongs to a different patient.",
            )

        # Current encounter facts
        current_facts = (
            db.query(ClinicalFactModel)
            .filter(ClinicalFactModel.encounter_id == encounter_id)
            .order_by(ClinicalFactModel.recorded_at.asc())
            .all()
        )

        # Historical baseline facts for the same patient
        historical_facts = (
            db.query(ClinicalFactModel)
            .filter(
                ClinicalFactModel.patient_id == encounter.patient_id,
                (ClinicalFactModel.encounter_id != encounter_id)
                | (ClinicalFactModel.encounter_id.is_(None)),
                ClinicalFactModel.status.in_(
                    ["historical_recorded", "doctor_confirmed", "reported"]
                ),
            )
            .order_by(ClinicalFactModel.recorded_at.asc())
            .all()
        )

        # Map latest historical fact per concept
        historical_by_concept: dict[str, ClinicalFactModel] = {}
        for hf in historical_facts:
            historical_by_concept[hf.concept.strip().lower()] = hf

        new_facts: list[ClinicalFactSchema] = []
        changed_facts: list[ChangedFact] = []
        conflicts: list[str] = []
        conflicting_facts: list[ConflictingFactDetail] = []

        for cf in current_facts:
            key = cf.concept.strip().lower()
            cf_schema = ClinicalFactSchema.model_validate(cf)

            if key in historical_by_concept:
                hf = historical_by_concept[key]
                hf_schema = ClinicalFactSchema.model_validate(hf)

                # Check if value has changed
                if cf.value.strip().lower() != hf.value.strip().lower():
                    changed_facts.append(
                        ChangedFact(
                            previous=hf_schema,
                            current=cf_schema,
                        )
                    )

                    # Check for contradiction or explicit conflict
                    is_conflict = (
                        cf.status == "conflicting"
                        or "allergy" in key
                        or "none" in hf.value.lower()
                        or "no known" in hf.value.lower()
                    )
                    if is_conflict:
                        desc = (
                            f"Contradiction in '{cf.concept}': historical was "
                            f"'{hf.value}', current reported '{cf.value}'"
                        )
                        if desc not in conflicts:
                            conflicts.append(desc)
                        conflicting_facts.append(
                            ConflictingFactDetail(
                                claim_a=hf_schema,
                                claim_b=cf_schema,
                                conflict_description=desc,
                            )
                        )
            else:
                new_facts.append(cf_schema)

            if cf.status == "conflicting":
                desc = (
                    f"Conflicting statement recorded in current encounter for "
                    f"'{cf.concept}': '{cf.value}'"
                )
                if desc not in conflicts:
                    conflicts.append(desc)

        return DiffData(
            encounter_id=encounter.id,
            new_facts=new_facts,
            changed_facts=changed_facts,
            conflicts=conflicts,
            conflicting_facts=conflicting_facts,
            unresolved_count=len(conflicts),
        )
