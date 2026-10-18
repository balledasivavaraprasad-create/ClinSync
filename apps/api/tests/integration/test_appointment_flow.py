"""Integration tests for appointment slot queries and atomic booking endpoints."""

from datetime import datetime, timedelta, timezone

import pytest
from app.models.appointment import AppointmentSlot
from app.models.encounter import Encounter
from app.models.patient import Patient


@pytest.fixture
def confirmed_patient(db_session):
    patient = Patient(
        display_name="David Miller",
        hospital_id="HOSP-DEMO-01",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


@pytest.fixture
def test_encounter(db_session, confirmed_patient):
    encounter = Encounter(
        patient_id=confirmed_patient.id,
        status="TRIAGED",
    )
    db_session.add(encounter)
    db_session.commit()
    db_session.refresh(encounter)
    return encounter


def test_get_appointment_slots_seeds_and_filters_by_department(client):
    response = client.get("/api/v1/appointments/slots?department_id=dept_cardiology")
    assert response.status_code == 200
    body = response.json()
    assert "slots" in body["data"]
    slots = body["data"]["slots"]
    assert len(slots) >= 1
    for s in slots:
        assert s["department_id"] == "dept_cardiology"
        assert "slot_id" in s
        assert "doctor_id" in s
        assert "status" in s


def test_get_appointment_slots_date_filter(client, db_session):
    # Create slot on specific date
    target_dt = datetime(2026, 11, 20, 10, 0, tzinfo=timezone.utc)
    slot = AppointmentSlot(
        slot_id="slot_date_filter_01",
        doctor_id="dr_filter",
        doctor_name="Dr. Filter",
        department_id="dept_neurology",
        start_at=target_dt,
        end_at=target_dt + timedelta(minutes=30),
        status="AVAILABLE",
    )
    db_session.add(slot)
    db_session.commit()

    # Query with matching date
    res_match = client.get(
        "/api/v1/appointments/slots?department_id=dept_neurology&date=2026-11-20"
    )
    assert res_match.status_code == 200
    match_slots = res_match.json()["data"]["slots"]
    assert any(s["slot_id"] == "slot_date_filter_01" for s in match_slots)

    # Query with non-matching date
    res_nomatch = client.get(
        "/api/v1/appointments/slots?department_id=dept_neurology&date=2026-11-21"
    )
    assert res_nomatch.status_code == 200
    nomatch_slots = res_nomatch.json()["data"]["slots"]
    assert not any(s["slot_id"] == "slot_date_filter_01" for s in nomatch_slots)


def test_book_appointment_success(client, db_session, test_encounter):
    # Ensure slots are seeded
    client.get("/api/v1/appointments/slots?department_id=dept_cardiology")

    payload = {
        "slot_id": "slot_cardio_101",
        "encounter_id": test_encounter.id,
        "idempotency_key": "idem_booking_test_01",
    }
    response = client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 201
    body = response.json()
    data = body["data"]

    assert data["slot_id"] == "slot_cardio_101"
    assert data["status"] == "BOOKED"
    assert "booking_id" in data
    assert data["booking_id"].startswith("bkg_")

    # Verify encounter transitioned to BOOKED
    db_session.refresh(test_encounter)
    assert test_encounter.status == "BOOKED"
    assert test_encounter.appointment_id == data["booking_id"]


def test_book_appointment_rejects_unavailable_slot(client, db_session, test_encounter):
    # Ensure slots are seeded
    client.get("/api/v1/appointments/slots?department_id=dept_cardiology")

    # First booking succeeds
    client.post(
        "/api/v1/appointments",
        json={
            "slot_id": "slot_cardio_102",
            "encounter_id": test_encounter.id,
            "idempotency_key": "idem_booking_02_a",
        },
    )

    # Second booking for same slot with different key fails with 409 SLOT_UNAVAILABLE
    res_dup = client.post(
        "/api/v1/appointments",
        json={
            "slot_id": "slot_cardio_102",
            "encounter_id": test_encounter.id,
            "idempotency_key": "idem_booking_02_b",
        },
    )
    assert res_dup.status_code == 409
    err = res_dup.json()
    assert err["code"] == "SLOT_UNAVAILABLE"


def test_book_appointment_idempotent_retry(client, db_session, test_encounter):
    # Ensure slots are seeded
    client.get("/api/v1/appointments/slots?department_id=dept_internal_med")

    payload = {
        "slot_id": "slot_internal_201",
        "encounter_id": test_encounter.id,
        "idempotency_key": "idem_idempotent_test_01",
    }

    res1 = client.post("/api/v1/appointments", json=payload)
    assert res1.status_code == 201
    bkg_id1 = res1.json()["data"]["booking_id"]

    # Repeat exact same request with identical idempotency_key
    res2 = client.post("/api/v1/appointments", json=payload)
    assert res2.status_code == 201 or res2.status_code == 200
    bkg_id2 = res2.json()["data"]["booking_id"]

    assert bkg_id1 == bkg_id2


def test_book_appointment_idempotency_conflict(client, db_session, test_encounter):
    # Ensure slots are seeded
    client.get("/api/v1/appointments/slots?department_id=dept_cardiology")
    client.get("/api/v1/appointments/slots?department_id=dept_internal_med")

    # Book slot_neuro_301 with idem_conflict_key
    client.post(
        "/api/v1/appointments",
        json={
            "slot_id": "slot_neuro_301",
            "encounter_id": test_encounter.id,
            "idempotency_key": "idem_conflict_key",
        },
    )

    # Re-use idem_conflict_key for different slot_ortho_401
    res_conflict = client.post(
        "/api/v1/appointments",
        json={
            "slot_id": "slot_ortho_401",
            "encounter_id": test_encounter.id,
            "idempotency_key": "idem_conflict_key",
        },
    )
    assert res_conflict.status_code == 409
    assert res_conflict.json()["code"] == "IDEMPOTENCY_CONFLICT"
