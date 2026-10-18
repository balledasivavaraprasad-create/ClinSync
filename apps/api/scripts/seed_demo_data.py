"""Clean, reproducible demo seed and reset script for ClinSync API.

Usage:
    python -m scripts.seed_demo_data [--reset]
    python apps/api/scripts/seed_demo_data.py [--reset]
"""

import argparse
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Ensure apps/api directory is on sys.path
api_root = Path(__file__).resolve().parents[1]
if str(api_root) not in sys.path:
    sys.path.insert(0, str(api_root))

from app.db.base import Base, generate_uuid  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.models.appointment import Appointment, AppointmentSlot  # noqa: E402
from app.models.audit import AuditEvent  # noqa: E402
from app.models.document import Document  # noqa: E402
from app.models.encounter import Encounter  # noqa: E402
from app.models.fact import ClinicalFact  # noqa: E402
from app.models.patient import Patient  # noqa: E402


def reset_database(db) -> None:
    """Clear all application tables in safe dependency order."""
    db.query(AuditEvent).delete()
    db.query(Appointment).delete()
    db.query(AppointmentSlot).delete()
    db.query(ClinicalFact).delete()
    db.query(Document).delete()
    db.query(Encounter).delete()
    db.query(Patient).delete()
    db.commit()


def seed_all_demo_data(db, reset: bool = False, verbose: bool = True) -> dict[str, int]:
    """Seed synthetic patients, historical EHR facts, appointment slots, and demo encounters."""
    Base.metadata.create_all(bind=engine)

    if reset:
        if verbose:
            print("[INFO] Resetting database tables...")
        reset_database(db)

    # 1. Synthetic Patients
    patients_data = [
        {
            "id": "pat_eleanor_001",
            "display_name": "Eleanor Johnson",
            "date_of_birth": date(1980, 4, 12),
            "contact_hint": "e***r@example.com",
            "hospital_id": "HOSP-DEMO-001",
            "identity_status": "CONFIRMED",
        },
        {
            "id": "pat_marcus_002",
            "display_name": "Marcus Vance",
            "date_of_birth": date(1965, 8, 23),
            "contact_hint": "m***s@example.com",
            "hospital_id": "HOSP-DEMO-002",
            "identity_status": "CONFIRMED",
        },
        {
            "id": "pat_sarah_003",
            "display_name": "Sarah Connor",
            "date_of_birth": date(1985, 11, 10),
            "contact_hint": "s***h@example.com",
            "hospital_id": "HOSP-DEMO-003",
            "identity_status": "CANDIDATE",
        },
    ]

    patients_seeded = 0
    for p_data in patients_data:
        existing = db.query(Patient).filter(Patient.id == p_data["id"]).first()
        if not existing:
            patient = Patient(**p_data)
            db.add(patient)
            patients_seeded += 1
    db.commit()

    # 2. Historical EHR Facts
    historical_facts_data = [
        {
            "id": "fact_hist_001",
            "patient_id": "pat_eleanor_001",
            "encounter_id": None,
            "concept": "Allergy to Penicillin",
            "value": "Severe anaphylactic reaction (urticaria and wheezing)",
            "fact_type": "allergy",
            "status": "historical_recorded",
            "source_type": "HISTORICAL_EHR",
            "source_id": "ehr_archival_2021",
        },
        {
            "id": "fact_hist_002",
            "patient_id": "pat_eleanor_001",
            "encounter_id": None,
            "concept": "Essential Hypertension",
            "value": "Stage 1 primary hypertension diagnosed 2022",
            "fact_type": "condition",
            "status": "historical_recorded",
            "source_type": "HISTORICAL_EHR",
            "source_id": "ehr_archival_2022",
        },
        {
            "id": "fact_hist_003",
            "patient_id": "pat_eleanor_001",
            "encounter_id": None,
            "concept": "Lisinopril",
            "value": "10mg oral daily",
            "fact_type": "medication",
            "status": "historical_recorded",
            "source_type": "HISTORICAL_EHR",
            "source_id": "ehr_archival_2022",
        },
        {
            "id": "fact_hist_004",
            "patient_id": "pat_marcus_002",
            "encounter_id": None,
            "concept": "Type 2 Diabetes Mellitus",
            "value": "Last HbA1c 7.2% recorded March 2026",
            "fact_type": "condition",
            "status": "historical_recorded",
            "source_type": "HISTORICAL_EHR",
            "source_id": "ehr_archival_2026",
        },
        {
            "id": "fact_hist_005",
            "patient_id": "pat_marcus_002",
            "encounter_id": None,
            "concept": "Metformin",
            "value": "500mg oral twice daily",
            "fact_type": "medication",
            "status": "historical_recorded",
            "source_type": "HISTORICAL_EHR",
            "source_id": "ehr_archival_2026",
        },
    ]

    facts_seeded = 0
    for f_data in historical_facts_data:
        existing = db.query(ClinicalFact).filter(ClinicalFact.id == f_data["id"]).first()
        if not existing:
            fact = ClinicalFact(**f_data)
            db.add(fact)
            facts_seeded += 1
    db.commit()

    # 3. Available and Seeded Appointment Slots across allowlisted departments
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    slots_data = [
        {
            "slot_id": "slot_cardio_01",
            "doctor_id": "dr_clara_chen",
            "doctor_name": "Dr. Clara Chen, MD",
            "department_id": "dept_cardiology",
            "department_name": "Cardiology & Vascular Medicine",
            "start_at": now + timedelta(hours=24),
            "end_at": now + timedelta(hours=24, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_cardio_02",
            "doctor_id": "dr_clara_chen",
            "doctor_name": "Dr. Clara Chen, MD",
            "department_id": "dept_cardiology",
            "department_name": "Cardiology & Vascular Medicine",
            "start_at": now + timedelta(hours=26),
            "end_at": now + timedelta(hours=26, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_internal_01",
            "doctor_id": "dr_marcus_vance",
            "doctor_name": "Dr. Marcus Vance, MD",
            "department_id": "dept_internal_med",
            "department_name": "Internal Medicine",
            "start_at": now + timedelta(hours=25),
            "end_at": now + timedelta(hours=25, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_neuro_01",
            "doctor_id": "dr_elena_rostova",
            "doctor_name": "Dr. Elena Rostova, MD, PhD",
            "department_id": "dept_neurology",
            "department_name": "Neurology",
            "start_at": now + timedelta(hours=28),
            "end_at": now + timedelta(hours=28, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_ortho_01",
            "doctor_id": "dr_james_wilson",
            "doctor_name": "Dr. James Wilson, MD",
            "department_id": "dept_orthopedics",
            "department_name": "Orthopedics & Sports Medicine",
            "start_at": now + timedelta(hours=27),
            "end_at": now + timedelta(hours=27, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_pulmo_01",
            "doctor_id": "dr_amita_patel",
            "doctor_name": "Dr. Amita Patel, MD",
            "department_id": "dept_pulmonology",
            "department_name": "Pulmonology & Respiratory Care",
            "start_at": now + timedelta(hours=30),
            "end_at": now + timedelta(hours=30, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_ent_01",
            "doctor_id": "dr_robert_lang",
            "doctor_name": "Dr. Robert Lang, MD",
            "department_id": "dept_ent",
            "department_name": "Otolaryngology (ENT)",
            "start_at": now + timedelta(hours=31),
            "end_at": now + timedelta(hours=31, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_derma_01",
            "doctor_id": "dr_sophia_martinez",
            "doctor_name": "Dr. Sophia Martinez, MD",
            "department_id": "dept_dermatology",
            "department_name": "Dermatology",
            "start_at": now + timedelta(hours=32),
            "end_at": now + timedelta(hours=32, minutes=30),
            "status": "AVAILABLE",
        },
        {
            "slot_id": "slot_gp_01",
            "doctor_id": "dr_alex_rivera",
            "doctor_name": "Dr. Alex Rivera, MD",
            "department_id": "dept_general_practice",
            "department_name": "General Practice & Family Medicine",
            "start_at": now + timedelta(hours=33),
            "end_at": now + timedelta(hours=33, minutes=30),
            "status": "AVAILABLE",
        },
    ]

    slots_seeded = 0
    for s_data in slots_data:
        existing = (
            db.query(AppointmentSlot)
            .filter(AppointmentSlot.slot_id == s_data["slot_id"])
            .first()
        )
        if not existing:
            slot = AppointmentSlot(**s_data)
            db.add(slot)
            slots_seeded += 1
    db.commit()

    # 4. Demo Active Intake Encounters for Doctor Queues
    encounters_seeded = 0
    demo_enc = db.query(Encounter).filter(Encounter.id == "enc_demo_cardio_01").first()
    if not demo_enc:
        demo_enc = Encounter(
            id="enc_demo_cardio_01",
            patient_id="pat_eleanor_001",
            status="BOOKED",
            assigned_department_id="dept_cardiology",
            intake_language="en",
            intake_status="COMPLETED",
            identity_confirmation_id="id_conf_demo_001",
        )
        db.add(demo_enc)
        encounters_seeded += 1
        db.commit()

        # Add encounter clinical facts
        cardio_facts = [
            ClinicalFact(
                id="fact_cardio_001",
                patient_id="pat_eleanor_001",
                encounter_id=demo_enc.id,
                concept="Chief Complaint",
                value="Subacute progressive chest tightness with palpitations",
                fact_type="symptom",
                status="reported",
                source_type="PATIENT_FORM",
                source_id="kiosk_intake_form",
            ),
            ClinicalFact(
                id="fact_cardio_002",
                patient_id="pat_eleanor_001",
                encounter_id=demo_enc.id,
                concept="Blood Pressure",
                value="142/88 mmHg",
                fact_type="investigation",
                status="reported",
                source_type="PATIENT_FORM",
                source_id="kiosk_vitals",
            ),
            ClinicalFact(
                id="fact_cardio_003",
                patient_id="pat_eleanor_001",
                encounter_id=demo_enc.id,
                concept="Heart Rate",
                value="88 bpm",
                fact_type="investigation",
                status="reported",
                source_type="PATIENT_FORM",
                source_id="kiosk_vitals",
            ),
        ]
        db.add_all(cardio_facts)

        # Book with Dr. Chen
        booked_slot = (
            db.query(AppointmentSlot)
            .filter(AppointmentSlot.slot_id == "slot_cardio_01")
            .first()
        )
        if booked_slot:
            booked_slot.status = "BOOKED"
            appointment = Appointment(
                booking_id="bkg_demo_cardio_01",
                slot_id=booked_slot.slot_id,
                encounter_id=demo_enc.id,
                patient_id="pat_eleanor_001",
                idempotency_key="idem_demo_cardio_01",
                status="BOOKED",
            )
            demo_enc.appointment_id = appointment.booking_id
            db.add(appointment)

        db.commit()

    # 5. Audit Event for Traceability
    audit_event = AuditEvent(
        id=generate_uuid(),
        patient_id="pat_eleanor_001",
        encounter_id="enc_demo_cardio_01",
        actor_id="sys_demo_seeder",
        actor_role="SYSTEM",
        action="DEMO_DATA_SEED",
        resource_type="DATABASE",
        resource_id="sqlite_main",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit_event)
    db.commit()

    stats = {
        "patients": patients_seeded,
        "facts": facts_seeded,
        "slots": slots_seeded,
        "encounters": encounters_seeded,
    }

    if verbose:
        print("[SUCCESS] ClinSync Demo Seed Completed:")
        for k, v in stats.items():
            print(f"  - {k.capitalize()}: {v} created")

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="ClinSync Synthetic Demo Data Seeder")
    parser.add_argument("--reset", action="store_true", help="Reset all tables before seeding")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed_all_demo_data(db, reset=args.reset, verbose=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
