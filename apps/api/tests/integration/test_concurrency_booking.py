"""Concurrency integration tests asserting atomic appointment booking and no double-booking."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from app.db.base import generate_uuid
from app.dependencies.db import get_db
from app.main import create_app
from app.models.appointment import Appointment, AppointmentSlot
from app.models.encounter import Encounter
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker


def test_concurrent_booking_strictly_single_winner(test_engine, test_settings, db_session):
    """Assert concurrent requests to book same slot result in 1 winner and 4 SLOT_UNAVAILABLE."""
    # 1. Create a single slot
    now = datetime.now(timezone.utc)
    target_slot_id = "slot_concurrent_race_01"
    slot = AppointmentSlot(
        slot_id=target_slot_id,
        doctor_id="dr_race",
        doctor_name="Dr. Race Winner",
        department_id="dept_cardiology",
        start_at=now + timedelta(hours=1),
        end_at=now + timedelta(hours=1, minutes=30),
        status="AVAILABLE",
    )
    db_session.add(slot)

    # 2. Create 5 distinct patients and encounters
    encounters = []
    for i in range(5):
        pat_id = generate_uuid()
        pat = Patient(
            id=pat_id,
            display_name=f"Racer Patient {i}",
            hospital_id="HOSP-DEMO-01",
            identity_status="CONFIRMED",
        )
        db_session.add(pat)

        enc_id = generate_uuid()
        enc = Encounter(
            id=enc_id,
            patient_id=pat_id,
            status="TRIAGED",
        )
        db_session.add(enc)
        encounters.append(enc_id)

    db_session.commit()

    # 3. Create a thread-safe client where each concurrent request gets its own DB session
    app = create_app(test_settings)
    session_factory = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)

    def thread_safe_get_db():
        s = session_factory()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = thread_safe_get_db

    # 4. Define worker function
    def try_book(index: int):
        with TestClient(app) as worker_client:
            enc_id = encounters[index]
            payload = {
                "slot_id": target_slot_id,
                "encounter_id": enc_id,
                "idempotency_key": f"race_idem_key_{index}",
            }
            res = worker_client.post("/api/v1/appointments", json=payload)
            return res.status_code, res.json()

    # 5. Fire 5 concurrent requests simultaneously across threads
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(try_book, range(5)))

    # 6. Assert concurrency invariants
    status_codes = [r[0] for r in results]
    success_count = status_codes.count(201)
    conflict_count = status_codes.count(409)

    assert success_count == 1, (
        f"Expected exactly 1 success, got {success_count}. Statuses: {status_codes}"
    )
    assert conflict_count == 4, (
        f"Expected 4 conflicts, got {conflict_count}. Statuses: {status_codes}"
    )

    # Verify conflict error responses have code SLOT_UNAVAILABLE
    for code, body in results:
        if code == 409:
            assert body["code"] == "SLOT_UNAVAILABLE"
        elif code == 201:
            assert body["data"]["status"] == "BOOKED"
            assert body["data"]["slot_id"] == target_slot_id

    # 7. Verify database state
    db_session.expire_all()
    slot_db = (
        db_session.query(AppointmentSlot).filter(AppointmentSlot.slot_id == target_slot_id).first()
    )
    assert slot_db.status == "BOOKED"

    bookings_db = db_session.query(Appointment).filter(Appointment.slot_id == target_slot_id).all()
    assert len(bookings_db) == 1
