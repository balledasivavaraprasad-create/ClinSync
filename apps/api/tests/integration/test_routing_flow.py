"""Integration tests for POST /api/v1/encounters/{id}/routing-review."""

import pytest
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient


@pytest.fixture
def confirmed_patient(db_session):
    patient = Patient(
        display_name="Eleanor Vance",
        hospital_id="HOSP-DEMO-01",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


@pytest.fixture
def unconfirmed_patient(db_session):
    patient = Patient(
        display_name="Unconfirmed John",
        hospital_id="HOSP-DEMO-01",
        identity_status="CANDIDATE",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


def test_routing_review_not_found(client):
    response = client.post("/api/v1/encounters/non_existent_encounter/routing-review")
    assert response.status_code == 404
    data = response.json()
    assert data["code"] == "NOT_FOUND"


def test_routing_review_unconfirmed_patient_forbidden(client, db_session, unconfirmed_patient):
    encounter = Encounter(
        patient_id=unconfirmed_patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    response = client.post(f"/api/v1/encounters/{encounter.id}/routing-review")
    assert response.status_code == 403
    data = response.json()
    assert data["code"] == "IDENTITY_NOT_CONFIRMED"


def test_routing_review_urgent_escalation_flow(client, db_session, confirmed_patient):
    encounter = Encounter(
        patient_id=confirmed_patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    fact = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=encounter.id,
        concept="Emergency Symptom",
        value="Crushing chest pain radiating to left shoulder and jaw",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="test_form",
    )
    db_session.add(fact)
    db_session.commit()

    response = client.post(f"/api/v1/encounters/{encounter.id}/routing-review")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["decision"] == "URGENT_ESCALATION"
    assert "ACUTE_RED_FLAG_DETECTED" in body["data"]["reason_codes"]
    assert body["data"]["recommended_department_id"] is None


def test_routing_review_routine_flow_updates_encounter_status(
    client, db_session, confirmed_patient
):
    encounter = Encounter(
        patient_id=confirmed_patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    fact = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=encounter.id,
        concept="Chief Complaint",
        value="Heart palpitations and fluttering sensation in chest",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="test_form",
    )
    db_session.add(fact)
    db_session.commit()

    response = client.post(f"/api/v1/encounters/{encounter.id}/routing-review")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["decision"] == "ROUTINE_SCHEDULING"
    assert body["data"]["recommended_department_id"] == "dept_cardiology"
    assert "DEPT_CARDIOLOGY_SYMPTOM_MATCH" in body["data"]["reason_codes"]

    # Verify encounter state in database transitioned to TRIAGED
    db_session.refresh(encounter)
    assert encounter.assigned_department_id == "dept_cardiology"
    assert encounter.status == "TRIAGED"
