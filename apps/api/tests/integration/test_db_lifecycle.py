"""Integration tests for database constraints, foreign key enforcement, and rollback."""

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from app.models.encounter import Encounter
from app.models.patient import Patient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def test_foreign_key_enforcement_on_invalid_patient(db_session: Session):
    """Verify SQLite foreign key pragma rejects an encounter with non-existent patient_id."""
    invalid_encounter = Encounter(
        patient_id="non-existent-patient-uuid",
        status="IN_PROGRESS",
    )
    db_session.add(invalid_encounter)

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()


def test_transaction_rollback_preserves_state(db_session: Session):
    """Verify that a rolled-back transaction does not persist partial records."""
    # Step 1: Add a patient
    patient = Patient(display_name="Rollback Test Patient")
    db_session.add(patient)
    db_session.commit()
    patient_id = patient.id

    # Step 2: Attempt to add another patient but force a rollback
    try:
        db_session.add(Patient(display_name="Uncommitted Patient"))
        # Force intentional failure by inserting bad foreign key
        db_session.add(Encounter(patient_id="bogus_foreign_key", status="IN_PROGRESS"))
        db_session.commit()
    except IntegrityError:
        db_session.rollback()

    # Step 3: Verify "Uncommitted Patient" was NOT persisted
    found = db_session.query(Patient).filter_by(display_name="Uncommitted Patient").first()
    assert found is None

    # Verify initial patient is still present
    initial = db_session.query(Patient).filter_by(id=patient_id).first()
    assert initial is not None


def test_alembic_upgrade_downgrade_cycle(tmp_path):
    """Verify that all Alembic migrations upgrade and downgrade cleanly on fresh SQLite."""
    temp_db = tmp_path / "alembic_cycle.db"
    ini_path = Path(__file__).resolve().parents[2] / "alembic.ini"
    cfg = Config(str(ini_path))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{temp_db.as_posix()}")

    # 1. Upgrade to head
    command.upgrade(cfg, "head")

    # 2. Downgrade back to base
    command.downgrade(cfg, "base")

    # 3. Re-upgrade to head
    command.upgrade(cfg, "head")
