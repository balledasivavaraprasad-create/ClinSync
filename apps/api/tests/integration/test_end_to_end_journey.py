"""Comprehensive End-to-End System Integration Test.

Validates the full patient and clinical workflow journey:
1. Synthetic Candidate Demographic Lookup (masked, zero leakage)
2. Secondary Verification (DOB match unlocks patient)
3. Historical Clinical Context Read
4. Intake Encounter Initiation
5. Multimodal Voice Intake Turn & Fact Extraction
6. Clinical Document Upload, Hashing & Extraction
7. Unified Clinical Context Ledger Retrieval with Provenance
8. Patient Context Diff Computation (Historical vs Encounter)
9. Deterministic Safety Triage & Specialty Routing
10. Department Appointment Slot Discovery
11. Atomic Idempotent Slot Booking
12. Doctor Queue Retrieval
13. Evidence-Backed Doctor Brief Generation
14. Physician Review & Final Sign-Off
15. End-to-End Immutable Audit Trail Verification
"""

import base64
from datetime import date, datetime, timedelta, timezone

from app.auth.security import create_doctor_token
from app.db.base import generate_uuid
from app.models.appointment import AppointmentSlot
from app.models.audit import AuditEvent
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_full_system_end_to_end_journey(client: TestClient, db_session: Session) -> None:
    """Execute complete patient journey from kiosk discovery to physician sign-off."""
    # -------------------------------------------------------------------------
    # 0. SEED TEST PATIENT & HISTORICAL EHR RECORD
    # -------------------------------------------------------------------------
    patient_id = "pat_e2e_journey_001"
    dob = date(1978, 5, 12)
    patient = Patient(
        id=patient_id,
        display_name="Eleanor Vance",
        date_of_birth=dob,
        contact_hint="e***r@example.com",
        hospital_id="HOSP-DEMO-E2E",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)

    # Historical fact in EHR
    hist_fact = ClinicalFact(
        patient_id=patient.id,
        encounter_id=None,
        concept="Essential Hypertension",
        value="Stage 1 Hypertension managed on Lisinopril 10mg",
        fact_type="condition",
        status="historical_recorded",
        source_type="HISTORICAL_EHR",
        source_id="ehr_record_2025",
        confidence=1.0,
    )
    db_session.add(hist_fact)

    # Seed cardiology slot
    now = datetime.now(timezone.utc)
    cardio_slot = AppointmentSlot(
        slot_id="slot_cardio_e2e_01",
        doctor_id="dr_clara_chen",
        doctor_name="Dr. Clara Chen, MD (Cardiology)",
        department_id="dept_cardiology",
        department_name="Cardiology & Vascular Medicine",
        start_at=now + timedelta(hours=3),
        end_at=now + timedelta(hours=3, minutes=30),
        status="AVAILABLE",
    )
    db_session.add(cardio_slot)
    db_session.commit()

    # -------------------------------------------------------------------------
    # 1. CANDIDATE LOOKUP (Masked Display, Zero Private Leakage)
    # -------------------------------------------------------------------------
    res_candidates = client.post(
        "/api/v1/identity/candidates",
        json={"search_hint": "Eleanor", "consent_obtained": True},
    )
    assert res_candidates.status_code == 200, res_candidates.text
    candidates = res_candidates.json()["data"]["candidates"]
    assert len(candidates) >= 1

    candidate_match = next((c for c in candidates if c["candidate_id"] == patient.id), None)
    assert candidate_match is not None
    assert candidate_match["display_name_masked"] != "Eleanor Vance"
    assert "*" in candidate_match["display_name_masked"]
    # Ensure sensitive clinical history not disclosed in candidate list
    assert "hypertension" not in res_candidates.text.lower()
    assert "lisinopril" not in res_candidates.text.lower()

    # -------------------------------------------------------------------------
    # 2. SECONDARY IDENTITY VERIFICATION (DOB Confirmation)
    # -------------------------------------------------------------------------
    # Failed attempt with incorrect birth date
    res_failed_auth = client.post(
        "/api/v1/identity/confirm",
        json={
            "candidate_id": patient.id,
            "date_of_birth": "1990-01-01",
            "consent_accepted": True,
        },
    )
    assert res_failed_auth.status_code == 403
    assert res_failed_auth.json()["code"] == "IDENTITY_NOT_CONFIRMED"

    # Successful verification with exact DOB
    res_confirm = client.post(
        "/api/v1/identity/confirm",
        json={
            "candidate_id": patient.id,
            "date_of_birth": dob.isoformat(),
            "consent_accepted": True,
        },
    )
    assert res_confirm.status_code == 200, res_confirm.text
    confirm_data = res_confirm.json()["data"]
    assert confirm_data["confirmed"] is True
    assert confirm_data["patient_id"] == patient.id
    assert confirm_data["patient_display_name"] == "Eleanor Vance"
    confirmation_token = confirm_data["identity_confirmation_id"]
    assert confirmation_token is not None

    # -------------------------------------------------------------------------
    # 3. HISTORICAL PATIENT CONTEXT RETRIEVAL
    # -------------------------------------------------------------------------
    res_context = client.get(
        f"/api/v1/patients/{patient.id}/context",
        headers={"Authorization": f"Bearer {confirmation_token}"},
    )
    assert res_context.status_code == 200, res_context.text
    context_data = res_context.json()["data"]
    assert context_data["patient_id"] == patient.id
    assert len(context_data["historical_facts"]) >= 1
    assert any("Hypertension" in f["concept"] for f in context_data["historical_facts"])

    # -------------------------------------------------------------------------
    # 4. INTAKE ENCOUNTER CREATION
    # -------------------------------------------------------------------------
    res_enc = client.post(
        "/api/v1/encounters",
        json={
            "patient_id": patient.id,
            "identity_confirmation_id": confirmation_token,
            "intake_language": "en",
        },
    )
    assert res_enc.status_code == 201, res_enc.text
    enc_data = res_enc.json()["data"]
    encounter_id = enc_data["id"]
    assert encounter_id is not None
    assert enc_data["patient_id"] == patient.id
    assert enc_data["status"] in ("INTAKE", "IN_PROGRESS")

    # -------------------------------------------------------------------------
    # 5. MULTIMODAL INTAKE TURN & FACT EXTRACTION
    # -------------------------------------------------------------------------
    res_answer = client.post(
        f"/api/v1/encounters/{encounter_id}/answers",
        json={
            "field_key": "chief_complaint",
            "raw_response": "Palpitations and mild chest tightness with elevated blood pressure",
            "input_modality": "VOICE",
        },
    )
    assert res_answer.status_code == 200, res_answer.text
    answer_data = res_answer.json()["data"]
    assert answer_data["encounter_id"] == encounter_id
    assert answer_data["turn_count"] >= 1
    assert len(answer_data["extracted_facts"]) >= 1
    voice_fact = answer_data["extracted_facts"][0]
    assert voice_fact["source_type"] == "PATIENT_VOICE"
    assert "palpitations" in voice_fact["value"].lower()

    # Second intake turn
    res_answer2 = client.post(
        f"/api/v1/encounters/{encounter_id}/answers",
        json={
            "field_key": "symptom_duration",
            "raw_response": "Symptoms started 2 hours ago while resting",
            "input_modality": "VOICE",
        },
    )
    assert res_answer2.status_code == 200, res_answer2.text

    # -------------------------------------------------------------------------
    # 6. DOCUMENT UPLOAD & EXTRACTION (ECG / Lab Document)
    # -------------------------------------------------------------------------
    raw_pdf_bytes = b"%PDF-1.4 Mock ECG and Troponin report showing elevated markers"
    b64_content = base64.b64encode(raw_pdf_bytes).decode("ascii")

    res_doc = client.post(
        f"/api/v1/encounters/{encounter_id}/documents",
        json={
            "filename": "ecg_troponin_panel.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    assert res_doc.status_code == 202, res_doc.text
    doc_data = res_doc.json()["data"]
    doc_id = doc_data["document_id"]
    assert doc_id is not None
    assert doc_data["status"] in ("UPLOADED", "PROCESSED")
    assert doc_data["filename"] == "ecg_troponin_panel.pdf"

    # Status check
    res_doc_status = client.get(f"/api/v1/documents/{doc_id}/status")
    assert res_doc_status.status_code == 200
    assert res_doc_status.json()["data"]["document_id"] == doc_id

    # -------------------------------------------------------------------------
    # 7. CLINICAL CONTEXT LEDGER RETRIEVAL
    # -------------------------------------------------------------------------
    res_ledger = client.get(f"/api/v1/encounters/{encounter_id}/ledger")
    assert res_ledger.status_code == 200, res_ledger.text
    ledger_data = res_ledger.json()["data"]
    assert ledger_data["encounter_id"] == encounter_id
    assert len(ledger_data["facts"]) >= 2
    sources = {f["source_type"] for f in ledger_data["facts"]}
    assert "PATIENT_VOICE" in sources

    # -------------------------------------------------------------------------
    # 8. PATIENT CONTEXT DIFF RETRIEVAL
    # -------------------------------------------------------------------------
    res_diff = client.get(f"/api/v1/encounters/{encounter_id}/diff")
    assert res_diff.status_code == 200, res_diff.text
    diff_data = res_diff.json()["data"]
    assert diff_data["encounter_id"] == encounter_id
    assert any(
        "chief_complaint" in f["concept"] or "chest" in f["value"].lower()
        for f in diff_data["new_facts"]
    )

    # -------------------------------------------------------------------------
    # 9. DETERMINISTIC SAFETY POLICY & SPECIALTY ROUTING
    # -------------------------------------------------------------------------
    res_route = client.post(f"/api/v1/encounters/{encounter_id}/routing-review")
    assert res_route.status_code == 200, res_route.text
    route_data = res_route.json()["data"]
    assert route_data["encounter_id"] == encounter_id
    assert route_data["decision"] == "ROUTINE_SCHEDULING"
    assert route_data["recommended_department_id"] == "dept_cardiology"

    # -------------------------------------------------------------------------
    # 10. APPOINTMENT SLOT DISCOVERY
    # -------------------------------------------------------------------------
    res_slots = client.get("/api/v1/appointments/slots?department_id=dept_cardiology")
    assert res_slots.status_code == 200, res_slots.text
    slots_data = res_slots.json()["data"]
    assert len(slots_data["slots"]) >= 1
    selected_slot = next(s for s in slots_data["slots"] if s["slot_id"] == cardio_slot.slot_id)
    assert selected_slot["available"] is True

    # -------------------------------------------------------------------------
    # 11. ATOMIC IDEMPOTENT APPOINTMENT BOOKING
    # -------------------------------------------------------------------------
    idempotency_key = f"idem_e2e_{generate_uuid()}"
    booking_payload = {
        "slot_id": cardio_slot.slot_id,
        "encounter_id": encounter_id,
        "idempotency_key": idempotency_key,
    }
    res_book = client.post("/api/v1/appointments", json=booking_payload)
    assert res_book.status_code == 201, res_book.text
    booking_data = res_book.json()["data"]
    assert booking_data["slot_id"] == cardio_slot.slot_id
    assert booking_data["status"] == "BOOKED"
    booking_id = booking_data["booking_id"]

    # Replay with same idempotency key returns identical booking
    res_book_replay = client.post("/api/v1/appointments", json=booking_payload)
    assert res_book_replay.status_code in (200, 201)
    assert res_book_replay.json()["data"]["booking_id"] == booking_id

    # -------------------------------------------------------------------------
    # 12. DOCTOR WORKSTATION QUEUE
    # -------------------------------------------------------------------------
    doctor_token = create_doctor_token(cardio_slot.doctor_id)
    res_queue = client.get(
        f"/api/v1/doctors/{cardio_slot.doctor_id}/queue",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res_queue.status_code == 200, res_queue.text
    queue_data = res_queue.json()["data"]
    assert queue_data["doctor_id"] == cardio_slot.doctor_id
    assert any(e["id"] == encounter_id for e in queue_data["encounters"])

    # -------------------------------------------------------------------------
    # 13. EVIDENCE-BACKED CLINICAL BRIEF GENERATION
    # -------------------------------------------------------------------------
    res_brief = client.get(f"/api/v1/encounters/{encounter_id}/brief")
    assert res_brief.status_code == 200, res_brief.text
    brief_data = res_brief.json()["data"]
    assert brief_data["encounter_id"] == encounter_id
    assert brief_data["patient_name"] == "Eleanor Vance"
    assert len(brief_data["summary_text"]) > 0
    assert len(brief_data["citations"]) >= 1

    # -------------------------------------------------------------------------
    # 14. PHYSICIAN CLINICAL REVIEW & APPROVAL
    # -------------------------------------------------------------------------
    approval_payload = {
        "approved": True,
        "doctor_notes": "Reviewed ECG & presentation. Acute coronary syndrome workup ordered.",
        "doctor_id": cardio_slot.doctor_id,
    }
    res_approval = client.post(
        f"/api/v1/encounters/{encounter_id}/approvals",
        json=approval_payload,
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res_approval.status_code == 200, res_approval.text
    approval_data = res_approval.json()["data"]
    assert approval_data["encounter_id"] == encounter_id
    assert approval_data["status"] == "DOCTOR_REVIEWED"
    assert approval_data["approved_at"] is not None

    # Verify encounter status in DB
    db_session.expire_all()
    enc_db = db_session.query(Encounter).filter(Encounter.id == encounter_id).first()
    assert enc_db.status == "DOCTOR_REVIEWED"

    voice_fact_db = (
        db_session.query(ClinicalFact).filter(ClinicalFact.id == voice_fact["id"]).first()
    )
    assert voice_fact_db.status == "doctor_confirmed"
    assert voice_fact_db.reviewed_by == cardio_slot.doctor_id

    # -------------------------------------------------------------------------
    # 15. AUDIT TRAIL VERIFICATION
    # -------------------------------------------------------------------------
    audit_events = (
        db_session.query(AuditEvent).filter(AuditEvent.encounter_id == encounter_id).all()
    )
    actions = {a.action for a in audit_events}
    assert "ENCOUNTER_CREATED" in actions
    assert "DOCTOR_APPROVAL" in actions
    for a in audit_events:
        assert a.timestamp is not None
        assert a.actor_role is not None
        assert a.actor_id is not None
        assert a.resource_type is not None
