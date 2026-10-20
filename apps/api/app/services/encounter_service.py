"""Encounter domain service for lifecycle management and conversational intake persistence."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.auth.security import verify_access_token
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

        if "." in req.identity_confirmation_id:
            claims = verify_access_token(req.identity_confirmation_id)
            if claims.get("sub") != patient.id:
                raise ClinSyncAppException(
                    status_code=403,
                    code=ErrorCode.ACCESS_DENIED,
                    message="Identity confirmation token does not match requested patient.",
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

        # Adaptive clinical question determination
        raw_lower = req.raw_response.strip().lower()

        # Check for acute red flags
        emergency_indicators = [
            "crushing chest pain", "severe chest pain", "can't breathe", "cannot breathe",
            "struggling to breathe", "coughing up blood", "passed out", "blacked out",
            "worst headache of my life", "thunderclap headache", "throat closing"
        ]
        is_emergency = any(em in raw_lower for em in emergency_indicators)

        # Check for explicit patient completion signals
        completion_phrases = ["that's all", "that is all", "nothing else", "no other symptoms", "nothing more", "nope, that's it"]
        is_patient_done = any(cp in raw_lower for cp in completion_phrases) or (raw_lower in ["no", "none", "nothing", "nope"] and turn_count >= 2) or normalized_key in ["medical_history", "history", "final_notes"]

        next_question: Optional[str] = None

        if is_emergency:
            encounter.intake_status = "ESCALATE_EMERGENCY"
            next_question = None
            db.commit()
        elif is_patient_done:
            encounter.intake_status = "COMPLETED"
            next_question = None
            db.commit()
        elif turn_count >= 10:
            # Configurable safety bound to prevent endless questioning
            encounter.intake_status = "COMPLETED"
            next_question = None
            db.commit()
        else:
            # Identify chief complaint from current or prior facts
            cc_facts = [f for f in all_facts if "complaint" in f.concept.lower() or f.fact_type == "symptom"]
            primary_complaint = (cc_facts[0].value.lower() if cc_facts else raw_lower)

            # Determine already collected concept domains
            known_concepts = {f.concept.lower() for f in all_facts}

            # Symptom-specific adaptive branches
            if any(k in primary_complaint for k in ["chest", "heart", "tightness", "pressure"]):
                if "duration" not in known_concepts and "onset" not in known_concepts:
                    next_question = "I understand you are experiencing chest tightness. How long have you felt this tightness, and does it spread to your neck, jaw, shoulder, or left arm?"
                elif "severity" not in known_concepts and "pain" not in known_concepts:
                    next_question = "On a scale from 0 to 10, how severe is your discomfort right now, and does it worsen with physical activity?"
                elif "associated" not in known_concepts and "symptoms" not in known_concepts:
                    next_question = "Are you experiencing any shortness of breath, cold sweats, dizziness, or nausea?"
                elif "medication" not in known_concepts and "medications" not in known_concepts:
                    next_question = "Do you take any regular heart or blood pressure medications, or do you have any drug allergies?"
                else:
                    next_question = "Is there any other symptom or detail regarding your heart and chest you would like the doctor to know?"

            elif any(k in primary_complaint for k in ["cough", "breath", "wheez", "throat", "phlegm"]):
                if "duration" not in known_concepts and "onset" not in known_concepts:
                    next_question = "How many days have you had this cough, and are you bringing up any yellow/green phlegm or blood?"
                elif "breathing" not in known_concepts and "shortness" not in known_concepts:
                    next_question = "Do you have any shortness of breath, wheezing, or difficulty catching your breath when walking?"
                elif "associated" not in known_concepts:
                    next_question = "Have you noticed any fever, chills, sore throat, or body aches?"
                elif "medication" not in known_concepts:
                    next_question = "Do you use any inhalers or take regular prescription medications, and do you have any allergies?"
                else:
                    next_question = "Do you have any other respiratory symptoms to report?"

            elif any(k in primary_complaint for k in ["abdom", "stomach", "belly", "nausea"]):
                if "duration" not in known_concepts and "onset" not in known_concepts:
                    next_question = "How long has this abdominal pain been present, and is it sharp, cramping, or burning?"
                elif "triggers" not in known_concepts:
                    next_question = "Does the discomfort worsen after eating, and have you experienced any nausea, vomiting, or bowel changes?"
                elif "severity" not in known_concepts:
                    next_question = "On a scale from 0 to 10, how severe is your stomach pain right now?"
                elif "medication" not in known_concepts:
                    next_question = "Are you taking any antacids or medications, or do you have any known medication allergies?"
                else:
                    next_question = "Is there any other symptom or medical history related to your stomach you would like to share?"

            elif any(k in primary_complaint for k in ["ankle", "knee", "wrist", "sprain", "rash", "ear"]):
                # Simple localized complaints can conclude quickly once onset and functional impact are clear
                if "duration" not in known_concepts and "onset" not in known_concepts:
                    next_question = "When did this occur, and did an injury or specific activity trigger it?"
                elif turn_count >= 2:
                    encounter.intake_status = "COMPLETED"
                    next_question = None
                    db.commit()
                else:
                    next_question = "Are you able to bear weight, and have you taken any pain relievers for it?"

            else:
                # General adaptive intake flow
                if "duration" not in known_concepts:
                    next_question = "How long have you had these symptoms, and did they begin suddenly or gradually?"
                elif "severity" not in known_concepts:
                    next_question = "On a scale from 0 to 10, how would you rate your discomfort or pain level?"
                elif "medication" not in known_concepts:
                    next_question = "Are you currently taking any prescription medications, or do you have any allergies?"
                elif turn_count >= 3:
                    encounter.intake_status = "COMPLETED"
                    next_question = None
                    db.commit()
                else:
                    next_question = "Do you have any other symptoms or relevant medical history to report?"

        fact_schema = ClinicalFactSchema.model_validate(fact)
        all_fact_schemas = [ClinicalFactSchema.model_validate(f) for f in all_facts]
        is_complete = encounter.intake_status in ("COMPLETED", "ESCALATE_EMERGENCY")

        return IntakeStateData(
            encounter_id=encounter.id,
            turn_count=turn_count,
            status=encounter.intake_status,
            next_question=next_question,
            extracted_facts=all_fact_schemas,
            current_step=turn_count,
            total_steps=None,
            extracted_facts_this_turn=[fact_schema],
            intake_complete=is_complete,
        )
