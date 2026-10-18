"""Unit tests for AppointmentSlot and Appointment SQLAlchemy models."""

from datetime import datetime, timedelta, timezone

import pytest
from app.models.appointment import Appointment, AppointmentSlot
from app.models.encounter import Encounter
from app.models.patient import Patient
from sqlalchemy.exc import IntegrityError


def test_appointment_slot_creation_and_attributes(db_session):
    now = datetime.now(timezone.utc)
    slot = AppointmentSlot(
        slot_id="slot_unit_01",
        doctor_id="dr_unit_01",
        doctor_name="Dr. Test Unit",
        department_id="dept_cardiology",
        department_name="Cardiology",
        start_at=now,
        end_at=now + timedelta(minutes=30),
        status="AVAILABLE",
    )
    db_session.add(slot)
    db_session.commit()
    db_session.refresh(slot)

    assert slot.slot_id == "slot_unit_01"
    assert slot.status == "AVAILABLE"
    assert slot.department_id == "dept_cardiology"
    assert slot.created_at is not None


def test_appointment_booking_relationship_and_uniqueness(db_session):
    now = datetime.now(timezone.utc)
    patient = Patient(
        display_name="Test Patient",
        hospital_id="HOSP-DEMO-01",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()

    encounter = Encounter(
        patient_id=patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)

    slot = AppointmentSlot(
        slot_id="slot_unit_02",
        doctor_id="dr_unit_02",
        doctor_name="Dr. Test Two",
        department_id="dept_internal_med",
        start_at=now,
        end_at=now + timedelta(minutes=30),
        status="AVAILABLE",
    )
    db_session.add(slot)
    db_session.commit()

    booking = Appointment(
        booking_id="bkg_unit_01",
        slot_id=slot.slot_id,
        encounter_id=encounter.id,
        patient_id=patient.id,
        idempotency_key="idem_unit_01",
        status="BOOKED",
    )
    db_session.add(booking)
    db_session.commit()

    # Verify relationships
    assert booking.slot.slot_id == "slot_unit_02"
    assert booking.encounter.id == encounter.id
    assert booking.patient.id == patient.id
    assert encounter.appointment.booking_id == "bkg_unit_01"

    # Enforce slot_id uniqueness: second booking on same slot must raise IntegrityError
    dup_booking = Appointment(
        booking_id="bkg_unit_02",
        slot_id=slot.slot_id,
        encounter_id=encounter.id,
        patient_id=patient.id,
        idempotency_key="idem_unit_02",
        status="BOOKED",
    )
    db_session.add(dup_booking)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
