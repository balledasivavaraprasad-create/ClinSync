"""Encounter domain service for lifecycle management and conversational intake persistence."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.errors import ClinSyncAppException, ErrorCode
from app.db.base import generate_uuid
from app.models.audit import AuditEvent
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact as ClinicalFactModel
from app.models.patient import Patient
from app.schemas.encounter import CreateEncounterRequest
from app.schemas.fact import ClinicalFact as ClinicalFactSchema
from app.schemas.intake import IntakeAnswerRequest, IntakeStateData

# Map intake field keys to clinical fact types conforming to openapi.json
FIELD_KEY_TO_FACT_TYPE = {
    "chief_complaint": "symptom",
    "symptom": "symptom",
    "symptoms": "symptom",
    "pain": "symptom",
    "pain_level": "symptom",
    "onset": "symptom",
    "duration": "symptom",
    "onset_duration": "symptom",
    "medication": "medication",
    "medications": "medication",
    "current_medications": "medication",
    "allergy": "allergy",
    "allergies": "allergy",
    "condition": "condition",
    "medical_history": "condition",
    "history": "condition",
    "surgeries": "procedure",
    "procedure": "procedure",
    "investigation": "investigation",
    "lab": "investigation",
}

# Adaptive conversational flow for kiosk intake
ADAPTIVE_QUESTION_FLOW = [
    {
        "key": "chief_complaint",
        "next_key": "onset_duration",
        "next_question": "How long have you had these symptoms, and have they become worse?",
    },
    {
        "key": "onset_duration",
        "next_key": "medications",
        "next_question": "Are you currently taking any prescription medications?",
    },
    {
        "key": "medications",
        "next_key": "allergies",
        "next_question": "Do you have any allergies to medications, foods, or latex?",
    },
    {
        "key": "allergies",
        "next_key": "medical_history",
        "next_question": "Do you have any medical conditions or past surgeries?",
    },
    {
        "key": "medical_history",
        "next_key": None,
        "next_question": None,
    },
]


class EncounterService:
    """Manages intake encounter lifecycle and clinical fact persistence."""

    @staticmethod
    def create_encounter(db: Session, req: CreateEncounterRequest) -> Encounter:
        """Create a new encounter requiring a confirmed patient and valid confirmation token."""
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
        if not patient:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Patient {req.patient_id} not found.",
            )

        # Enforce Identity Confirmation Gate: Block unconfirmed patients
        if patient.identity_status != "CONFIRMED":
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.IDENTITY_NOT_CONFIRMED,
                message="Patient identity must be confirmed before creating an encounter.",
            )

        if not req.identity_confirmation_id or not req.identity_confirmation_id.strip():
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message="A valid identity_confirmation_id is required to start an encounter.",
            )

        encounter = Encounter(
            id=generate_uuid(),
            patient_id=patient.id,
            status="IN_PROGRESS",
            started_at=datetime.now(timezone.utc),
            intake_language=req.intake_language or "en",
            intake_status="IN_PROGRESS",
            identity_confirmation_id=req.identity_confirmation_id,
            created_by="PATIENT_KIOSK",
        )
        db.add(encounter)

        audit = AuditEvent(
            patient_id=patient.id,
            encounter_id=encounter.id,
            actor_id=patient.id,
            actor_role="PATIENT",
            action="ENCOUNTER_CREATED",
            resource_type="ENCOUNTER",
            resource_id=encounter.id,
            new_state='{"status": "IN_PROGRESS", "intake_status": "IN_PROGRESS"}',
        )
        db.add(audit)

        db.commit()
        db.refresh(encounter)
        return encounter

    @staticmethod
    def get_encounter(db: Session, encounter_id: str) -> Encounter:
        """Retrieve encounter by ID."""
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Encounter {encounter_id} not found.",
            )
        return encounter

    @staticmethod
    def save_intake_answer(
        db: Session,
        encounter_id: str,
        req: IntakeAnswerRequest,
    ) -> IntakeStateData:
        """Process and persist intake turn answer, extracting facts into Clinical Context Ledger."""
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Encounter {encounter_id} not found.",
            )

        if encounter.status != "IN_PROGRESS":
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message=(
                    f"Encounter is in {encounter.status} status and not accepting intake answers."
                ),
            )

        # Enforce clinical security: Verify patient is confirmed
        patient = db.query(Patient).filter(Patient.id == encounter.patient_id).first()
        if not patient or patient.identity_status != "CONFIRMED":
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.IDENTITY_NOT_CONFIRMED,
                message="Patient identity must be confirmed to save intake answers.",
            )

        # Map field key to standard FactType
        normalized_key = req.field_key.strip().lower()
        fact_type = FIELD_KEY_TO_FACT_TYPE.get(normalized_key, "other")
        source_type = "PATIENT_VOICE" if req.input_modality == "VOICE" else "PATIENT_FORM"

        # Create and persist ClinicalFact
        fact = ClinicalFactModel(
            id=generate_uuid(),
            patient_id=encounter.patient_id,
            encounter_id=encounter.id,
            concept=req.field_key,
            value=req.raw_response,
            unit=None,
            clinical_time=None,
            recorded_at=datetime.now(timezone.utc),
            fact_type=fact_type,
            status="reported",
            source_type=source_type,
            source_id=f"intake_{encounter.id}",
            confidence=1.0,
        )
        db.add(fact)

        audit = AuditEvent(
            patient_id=encounter.patient_id,
            encounter_id=encounter.id,
            actor_id=encounter.patient_id,
            actor_role="PATIENT",
            action="INTAKE_ANSWER_SAVED",
            resource_type="CLINICAL_FACT",
            resource_id=fact.id,
            new_state=f'{{"concept": "{req.field_key}", "fact_type": "{fact_type}"}}',
        )
        db.add(audit)
        db.commit()

        # Query all facts for this encounter ordered by recorded_at
        all_facts = (
            db.query(ClinicalFactModel)
            .filter(ClinicalFactModel.encounter_id == encounter_id)
            .order_by(ClinicalFactModel.recorded_at.asc())
            .all()
        )
        turn_count = len(all_facts)

        # Determine next question from progression
        next_question: Optional[str] = None
        for step in ADAPTIVE_QUESTION_FLOW:
            if step["key"] == normalized_key:
                next_question = step["next_question"]
                break

        if next_question is None and turn_count < 4:
            next_question = "Do you have any other symptoms, allergies, or medications to report?"
        elif turn_count >= 5 or next_question is None:
            encounter.intake_status = "COMPLETED"
            next_question = None
            db.commit()

        fact_schema = ClinicalFactSchema.model_validate(fact)
        all_fact_schemas = [ClinicalFactSchema.model_validate(f) for f in all_facts]
        is_complete = encounter.intake_status == "COMPLETED"

        return IntakeStateData(
            encounter_id=encounter.id,
            turn_count=turn_count,
            status=encounter.intake_status,
            next_question=next_question,
            extracted_facts=all_fact_schemas,
            current_step=turn_count,
            total_steps=5,
            extracted_facts_this_turn=[fact_schema],
            intake_complete=is_complete,
        )
