"""Integration tests for encounter creation, gating, and intake answer persistence."""

from datetime import date

from app.db.base import generate_uuid
from app.models.audit import AuditEvent
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_create_encounter_unconfirmed_patient_blocked_403(
    client: TestClient, db_session: Session
) -> None:
    """Encounter creation must block patients who have not confirmed identity."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Candidate Patient",
        date_of_birth=date(1995, 3, 10),
        identity_status="CANDIDATE",
    )
    db_session.add(patient)
    db_session.commit()

    response = client.post(
        "/api/v1/encounters",
        json={
            "patient_id": patient.id,
            "identity_confirmation_id": "conf_test123",
            "intake_language": "en",
        },
    )
    assert response.status_code == 403
    err = response.json()
    assert err["code"] == "IDENTITY_NOT_CONFIRMED"
    assert "Patient identity must be confirmed" in err["message"]


def test_create_encounter_nonexistent_patient_returns_404(client: TestClient) -> None:
    """Unknown patient ID returns 404 NOT_FOUND."""
    response = client.post(
        "/api/v1/encounters",
        json={
            "patient_id": "nonexistent-patient-id",
            "identity_confirmation_id": "conf_test123",
        },
    )
    assert response.status_code == 404
    err = response.json()
    assert err["code"] == "NOT_FOUND"


def test_create_encounter_success_and_audit(client: TestClient, db_session: Session) -> None:
    """Confirmed patient successfully creates encounter with audit trail."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Confirmed Patient",
        date_of_birth=date(1991, 7, 4),
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()

    token = "conf_abc123"
    response = client.post(
        "/api/v1/encounters",
        json={
            "patient_id": patient.id,
            "identity_confirmation_id": token,
            "intake_language": "es",
        },
    )
    assert response.status_code == 201
    res_data = response.json()["data"]
    encounter_id = res_data["id"]
    assert res_data["patient_id"] == patient.id
    assert res_data["status"] == "IN_PROGRESS"
    assert res_data["intake_language"] == "es"
    assert res_data["identity_confirmation_id"] == token

    # Verify audit event in DB
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.encounter_id == encounter_id, AuditEvent.action == "ENCOUNTER_CREATED")
        .first()
    )
    assert audit is not None
    assert audit.patient_id == patient.id


def test_save_intake_answer_nonexistent_encounter_returns_404(client: TestClient) -> None:
    """Nonexistent encounter returns 404 NOT_FOUND."""
    response = client.post(
        "/api/v1/encounters/unknown-encounter-id/answers",
        json={
            "field_key": "chief_complaint",
            "raw_response": "Persistent headache",
            "input_modality": "VOICE",
        },
    )
    assert response.status_code == 404
    err = response.json()
    assert err["code"] == "NOT_FOUND"


def test_save_intake_answer_extracts_clinical_fact_with_provenance(
    client: TestClient, db_session: Session
) -> None:
    """Intake turn extracts facts into Clinical Context Ledger with provenance."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Sarah Connor",
        date_of_birth=date(1985, 2, 28),
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.flush()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=patient.id,
        status="IN_PROGRESS",
        intake_status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    response = client.post(
        f"/api/v1/encounters/{encounter.id}/answers",
        json={
            "field_key": "chief_complaint",
            "raw_response": "Sharp chest pain radiating to left shoulder",
            "input_modality": "VOICE",
        },
    )
    assert response.status_code == 200
    res_data = response.json()["data"]
    assert res_data["encounter_id"] == encounter.id
    assert res_data["turn_count"] == 1
    assert res_data["status"] == "IN_PROGRESS"
    assert res_data["next_question"] is not None
    assert len(res_data["extracted_facts"]) == 1

    fact = res_data["extracted_facts"][0]
    assert fact["patient_id"] == patient.id
    assert fact["encounter_id"] == encounter.id
    assert fact["concept"] == "chief_complaint"
    assert fact["value"] == "Sharp chest pain radiating to left shoulder"
    assert fact["fact_type"] == "symptom"
    assert fact["status"] == "reported"
    assert fact["source_type"] == "PATIENT_VOICE"

    # Verify fact persisted in database
    db_facts = (
        db_session.query(ClinicalFact).filter(ClinicalFact.encounter_id == encounter.id).all()
    )
    assert len(db_facts) == 1


def test_save_intake_answer_multi_turn_adaptive_flow(
    client: TestClient, db_session: Session
) -> None:
    """Multi-turn intake progresses adaptively through complaint, duration, meds, allergies."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Bruce Wayne",
        date_of_birth=date(1978, 4, 17),
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.flush()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=patient.id,
        status="IN_PROGRESS",
        intake_status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    turns = [
        ("chief_complaint", "Shortness of breath on exertion", "symptom"),
        ("onset_duration", "Started 3 days ago and worsening", "symptom"),
        ("medications", "Lisinopril 10mg daily", "medication"),
        ("allergies", "No known drug allergies", "allergy"),
        ("medical_history", "Hypertension diagnosed 2020", "condition"),
    ]

    for idx, (field_key, answer, expected_type) in enumerate(turns):
        res = client.post(
            f"/api/v1/encounters/{encounter.id}/answers",
            json={
                "field_key": field_key,
                "raw_response": answer,
                "input_modality": "VOICE",
            },
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["turn_count"] == idx + 1
        # Check fact type
        matching_fact = next(f for f in data["extracted_facts"] if f["concept"] == field_key)
        assert matching_fact["fact_type"] == expected_type

    # After the 5th turn, workflow should be completed
    assert data["status"] == "COMPLETED"
    assert data["next_question"] is None


def test_patient_data_isolation(client: TestClient, db_session: Session) -> None:
    """Verify data isolation between different patients."""
    p1 = Patient(
        id=generate_uuid(),
        display_name="Patient One",
        date_of_birth=date(1980, 1, 1),
        identity_status="CONFIRMED",
    )
    p2 = Patient(
        id=generate_uuid(),
        display_name="Patient Two",
        date_of_birth=date(1985, 2, 2),
        identity_status="CONFIRMED",
    )
    db_session.add_all([p1, p2])
    db_session.flush()

    e1 = Encounter(id=generate_uuid(), patient_id=p1.id, status="IN_PROGRESS")
    e2 = Encounter(id=generate_uuid(), patient_id=p2.id, status="IN_PROGRESS")
    db_session.add_all([e1, e2])
    db_session.commit()

    client.post(
        f"/api/v1/encounters/{e1.id}/answers",
        json={"field_key": "chief_complaint", "raw_response": "Patient One Symptoms"},
    )
    client.post(
        f"/api/v1/encounters/{e2.id}/answers",
        json={"field_key": "chief_complaint", "raw_response": "Patient Two Symptoms"},
    )

    # Context query for patient 1 must NOT show patient 2 facts
    p1_facts = db_session.query(ClinicalFact).filter(ClinicalFact.patient_id == p1.id).all()
    assert len(p1_facts) == 1
    assert p1_facts[0].value == "Patient One Symptoms"

    p2_facts = db_session.query(ClinicalFact).filter(ClinicalFact.patient_id == p2.id).all()
    assert len(p2_facts) == 1
    assert p2_facts[0].value == "Patient Two Symptoms"
