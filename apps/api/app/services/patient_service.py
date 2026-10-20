"""Patient and identity confirmation domain services."""

from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.auth.security import create_patient_token
from app.core.errors import ClinSyncAppException, ErrorCode
from app.models.audit import AuditEvent
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from app.schemas.fact import ClinicalFact as ClinicalFactSchema
from app.schemas.identity import CandidateItem, IdentityConfirmData
from app.schemas.patient import PatientContextData, PatientRegistrationRequest


def mask_display_name(full_name: str) -> str:
    """Mask a person's display name for privacy on kiosk screen (e.g. 'Jane Doe' -> 'J*** D**')."""
    words = full_name.strip().split()
    if not words:
        return "***"
    masked_words = []
    for word in words:
        if len(word) <= 1:
            masked_words.append(word)
        elif len(word) == 2:
            masked_words.append(word[0] + "*")
        else:
            masked_words.append(word[0] + ("*" * min(len(word) - 1, 4)))
    return " ".join(masked_words)


class PatientService:
    """Manages patient identity candidates, confirmation, and authorized context retrieval."""

    @staticmethod
    def lookup_candidates(
        db: Session,
        biometric_consent: bool,
        search_hint: Optional[str] = None,
    ) -> list[CandidateItem]:
        """Lookup identity candidates without exposing clinical records."""
        if not biometric_consent:
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message="Biometric consent is required to perform candidate lookup.",
            )

        query = db.query(Patient)
        if search_hint and search_hint.strip():
            # Search by partial name or contact hint
            pattern = f"%{search_hint.strip()}%"
            query = query.filter(
                (Patient.display_name.ilike(pattern)) | (Patient.contact_hint.ilike(pattern))
            )
        else:
            # Return demo candidate pool
            query = query.limit(5)

        patients = query.all()
        candidates: list[CandidateItem] = []
        for p in patients:
            candidates.append(
                CandidateItem(
                    candidate_id=p.id,
                    display_name_masked=mask_display_name(p.display_name),
                    confidence_score=0.92 if not search_hint else 0.96,
                    masked_name=mask_display_name(p.display_name),
                    dob_year=p.date_of_birth.year if p.date_of_birth else None,
                    contact_hint=p.contact_hint,
                )
            )
        return candidates

    @staticmethod
    def confirm_identity(
        db: Session,
        candidate_id: str,
        date_of_birth: Optional[date],
        consent_accepted: bool,
    ) -> IdentityConfirmData:
        """Perform secondary verification (DOB check) before authorizing record access."""
        if not consent_accepted:
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message="Patient consent must be accepted to confirm identity.",
            )

        if not date_of_birth:
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message="Date of birth is required to confirm identity.",
            )

        patient = db.query(Patient).filter(Patient.id == candidate_id).first()
        if not patient:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message="Selected candidate record was not found.",
            )

        # Verify secondary factor: Date of Birth
        if patient.date_of_birth and patient.date_of_birth != date_of_birth:
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.IDENTITY_NOT_CONFIRMED,
                message=(
                    "Secondary identity check failed. "
                    "Provided date of birth does not match candidate record."
                ),
            )

        # Mark patient confirmed and issue unique verification token
        patient.identity_status = "CONFIRMED"
        confirmation_token = f"conf_{create_patient_token(patient_id=patient.id)}"

        audit_log = AuditEvent(
            patient_id=patient.id,
            actor_id=patient.id,
            actor_role="PATIENT",
            action="IDENTITY_CONFIRMED",
            resource_type="PATIENT",
            resource_id=patient.id,
            new_state='{"identity_status": "CONFIRMED"}',
        )
        db.add(audit_log)
        db.commit()
        db.refresh(patient)

        return IdentityConfirmData(
            confirmed=True,
            patient_id=patient.id,
            identity_confirmation_id=confirmation_token,
            patient_display_name=patient.display_name,
            display_name=patient.display_name,
            identity_status="CONFIRMED",
        )

    @staticmethod
    def get_patient_context(db: Session, patient_id: str) -> PatientContextData:
        """Retrieve authorized patient clinical context after identity is confirmed."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Patient {patient_id} was not found.",
            )

        # Clinical Safety Rule: Never disclose clinical context if identity is unconfirmed
        if patient.identity_status != "CONFIRMED":
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.IDENTITY_NOT_CONFIRMED,
                message=(
                    "Patient identity must be confirmed before clinical records can be accessed."
                ),
            )

        # Fetch historical facts
        facts = (
            db.query(ClinicalFact)
            .filter(
                ClinicalFact.patient_id == patient_id,
                ClinicalFact.status.in_(["historical_recorded", "doctor_confirmed"]),
            )
            .order_by(ClinicalFact.recorded_at.desc())
            .all()
        )

        fact_schemas = [ClinicalFactSchema.model_validate(f) for f in facts]
        allergies = [f for f in fact_schemas if f.fact_type == "allergy"]
        meds = [f for f in fact_schemas if f.fact_type == "medication"]
        conditions = [f for f in fact_schemas if f.fact_type == "condition"]

        return PatientContextData(
            patient_id=patient.id,
            display_name=patient.display_name,
            historical_facts=fact_schemas,
            allergies=allergies,
            active_medications=meds,
            recent_conditions=conditions,
        )

    @staticmethod
    def register_patient(db: Session, req: PatientRegistrationRequest) -> Patient:
        """Register a new patient via non-biometric route."""
        patient = Patient(
            display_name=req.display_name,
            date_of_birth=req.date_of_birth,
            contact_hint=req.contact_hint,
            hospital_id=req.hospital_id,
            identity_status="CONFIRMED",  # Direct manual registration confirms identity
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

        audit = AuditEvent(
            patient_id=patient.id,
            actor_id=patient.id,
            actor_role="PATIENT",
            action="PATIENT_REGISTERED",
            resource_type="PATIENT",
            resource_id=patient.id,
        )
        db.add(audit)
        db.commit()
        return patient
