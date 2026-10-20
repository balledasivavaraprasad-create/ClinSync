"""Integration tests for doctor queue and encounter approval endpoints."""

from datetime import datetime, timedelta, timezone

import pytest
from app.auth.security import create_doctor_token
from app.models.appointment import Appointment, AppointmentSlot
from app.models.audit import AuditEvent
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient


@pytest.fixture
def confirmed_patient(db_session):
    patient = Patient(
        display_name="Thomas Anderson",
        hospital_id="HOSP-DEMO-01",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


def test_get_doctor_queue_flow(client, db_session, confirmed_patient):
    # Setup doctor slot and booking
    now = datetime.now(timezone.utc)
    slot = AppointmentSlot(
        slot_id="slot_doc_queue_01",
        doctor_id="dr_clara_chen",
        doctor_name="Dr. Clara Chen, MD",
        department_id="dept_cardiology",
        start_at=now,
        end_at=now + timedelta(minutes=30),
        status="BOOKED",
    )
    db_session.add(slot)

    enc = Encounter(
        patient_id=confirmed_patient.id,
        status="BOOKED",
        assigned_department_id="dept_cardiology",
    )
    db_session.add(enc)
    db_session.flush()

    booking = Appointment(
        booking_id="bkg_doc_queue_01",
        slot_id=slot.slot_id,
        encounter_id=enc.id,
        patient_id=confirmed_patient.id,
        idempotency_key="idem_doc_queue_01",
        status="BOOKED",
    )
    db_session.add(booking)
    db_session.commit()

    # Query doctor queue
    token = create_doctor_token("dr_clara_chen")
    response = client.get(
        "/api/v1/doctors/dr_clara_chen/queue",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["doctor_id"] == "dr_clara_chen"
    assert len(body["data"]["encounters"]) >= 1
    assert any(e["id"] == enc.id for e in body["data"]["encounters"])
    assert len(body["data"]["queue"]) >= 1


def test_approve_encounter_flow(client, db_session, confirmed_patient):
    enc = Encounter(
        patient_id=confirmed_patient.id,
        status="TRIAGED",
    )
    db_session.add(enc)
    db_session.commit()

    fact = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=enc.id,
        concept="Heart Rate",
        value="78 bpm",
        fact_type="investigation",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="intake_form",
    )
    db_session.add(fact)
    db_session.commit()

    payload = {
        "approved": True,
        "doctor_notes": "Reviewed and approved during clinical consult.",
        "doctor_id": "dr_clara_chen",
    }
    token = create_doctor_token("dr_clara_chen")
    response = client.post(
        f"/api/v1/encounters/{enc.id}/approvals",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]

    assert data["encounter_id"] == enc.id
    assert data["status"] == "DOCTOR_REVIEWED"
    assert "approved_at" in data

    # Verify database state
    db_session.refresh(enc)
    assert enc.status == "DOCTOR_REVIEWED"

    db_session.refresh(fact)
    assert fact.status == "doctor_confirmed"
    assert fact.reviewed_by == "dr_clara_chen"

    # Verify audit event persisted
    audit = db_session.query(AuditEvent).filter(AuditEvent.encounter_id == enc.id).first()
    assert audit is not None
    assert audit.action == "DOCTOR_APPROVAL"
    assert audit.actor_role == "DOCTOR"


def test_get_doctor_brief_endpoint_flow(client, db_session, confirmed_patient):
    enc = Encounter(
        patient_id=confirmed_patient.id,
        status="TRIAGED",
    )
    db_session.add(enc)
    db_session.commit()

    fact = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=enc.id,
        concept="Chief Complaint",
        value="Subacute retrosternal chest tightness with hypertensive trend",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="form_01",
    )
    db_session.add(fact)
    db_session.commit()

    res = client.get(f"/api/v1/encounters/{enc.id}/brief")
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    data = body["data"]

    assert data["encounter_id"] == enc.id
    assert data["patient_name"] == confirmed_patient.display_name
    assert "chest tightness" in data["summary_text"]
    assert len(data["citations"]) >= 1
    assert data["citations"][0]["fact_id"] == fact.id
    assert data["audio_status"] == "PENDING"
