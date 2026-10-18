"""Unit tests for ClinicalFact model and relationships."""

from datetime import date

from app.db.base import generate_uuid
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from sqlalchemy.orm import Session


def test_clinical_fact_creation_and_relationships(db_session: Session) -> None:
    """ClinicalFact persists correctly and relates to patient and encounter."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Unit Test Patient",
        date_of_birth=date(1993, 6, 12),
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.flush()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.flush()

    fact = ClinicalFact(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="pain_score",
        value="7/10",
        unit="NRS",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_VOICE",
        source_id=f"voice_utt_{encounter.id}",
        confidence=0.98,
    )
    db_session.add(fact)
    db_session.commit()

    db_session.refresh(fact)
    assert fact.concept == "pain_score"
    assert fact.value == "7/10"
    assert fact.fact_type == "symptom"
    assert fact.status == "reported"
    assert fact.source_type == "PATIENT_VOICE"
    assert fact.patient.display_name == "Unit Test Patient"
    assert fact.encounter.id == encounter.id

    # Check back-populates on patient and encounter
    db_session.refresh(patient)
    db_session.refresh(encounter)
    assert len(patient.facts) == 1
    assert len(encounter.facts) == 1
    assert patient.facts[0].id == fact.id
    assert encounter.facts[0].id == fact.id
