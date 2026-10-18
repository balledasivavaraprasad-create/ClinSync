"""Unit tests for SQLAlchemy models Patient, Encounter, and AuditEvent."""

from datetime import date

from app.models.audit import AuditEvent
from app.models.encounter import Encounter
from app.models.patient import Patient
from sqlalchemy.orm import Session


def test_patient_model_defaults(db_session: Session):
    """Verify Patient entity creation with default values and UUID generation."""
    patient = Patient(
        display_name="Synthetic Jane Doe",
        date_of_birth=date(1985, 4, 12),
        contact_hint="***-***-1234",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    assert patient.id is not None
    assert len(patient.id) == 36
    assert patient.hospital_id == "HOSP-DEMO-01"
    assert patient.identity_status == "CANDIDATE"
    assert patient.created_at is not None
    assert patient.updated_at is not None
    assert patient.display_name == "Synthetic Jane Doe"


def test_encounter_model_defaults_and_relationship(db_session: Session):
    """Verify Encounter entity creation and foreign key relationship to Patient."""
    patient = Patient(display_name="Synthetic John Smith")
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    encounter = Encounter(
        patient_id=patient.id,
        status="IN_PROGRESS",
        intake_language="en",
    )
    db_session.add(encounter)
    db_session.commit()
    db_session.refresh(encounter)

    assert encounter.id is not None
    assert encounter.patient_id == patient.id
    assert encounter.status == "IN_PROGRESS"
    assert encounter.intake_status == "NOT_STARTED"
    assert encounter.started_at is not None
    assert encounter.created_by == "SYSTEM"
    assert encounter.patient.display_name == "Synthetic John Smith"


def test_audit_event_model(db_session: Session):
    """Verify AuditEvent entity logging."""
    audit = AuditEvent(
        actor_id="DOC-4401",
        actor_role="DOCTOR",
        action="BRIEF_APPROVED",
        resource_type="ENCOUNTER",
        resource_id="enc_demo_001",
        previous_state='{"status": "TRIAGED"}',
        new_state='{"status": "DOCTOR_REVIEWED"}',
        ip_address="127.0.0.1",
    )
    db_session.add(audit)
    db_session.commit()
    db_session.refresh(audit)

    assert audit.id is not None
    assert audit.actor_id == "DOC-4401"
    assert audit.action == "BRIEF_APPROVED"
    assert audit.timestamp is not None
