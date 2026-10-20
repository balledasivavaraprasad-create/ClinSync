"""Unit tests for DoctorService queue reads, approvals, and audit logging."""

import json

import pytest
from app.core.errors import ClinSyncAppException
from app.models.audit import AuditEvent
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from app.schemas.doctor import ApprovalRequest
from app.services.doctor_service import DoctorService


@pytest.fixture
def doctor_service():
    return DoctorService()


@pytest.fixture
def confirmed_patient(db_session):
    patient = Patient(
        display_name="Eleanor Rigby",
        hospital_id="HOSP-DEMO-01",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


def test_approve_encounter_updates_status_and_facts_and_audit(
    doctor_service, db_session, confirmed_patient
):
    encounter = Encounter(
        patient_id=confirmed_patient.id,
        status="TRIAGED",
    )
    db_session.add(encounter)
    db_session.commit()

    fact = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=encounter.id,
        concept="Blood Pressure",
        value="138/86 mmHg",
        fact_type="investigation",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="vitals_form",
    )
    db_session.add(fact)
    db_session.commit()

    payload = ApprovalRequest(
        approved=True,
        doctor_notes="Patient vitals reviewed and confirmed stable.",
        doctor_id="dr_clara_chen",
    )

    response = doctor_service.approve_encounter(
        db=db_session,
        encounter_id=encounter.id,
        payload=payload,
        request_id="req_appr_01",
    )

    assert response.data.encounter_id == encounter.id
    assert response.data.status == "DOCTOR_REVIEWED"

    # Verify encounter status in DB
    db_session.refresh(encounter)
    assert encounter.status == "DOCTOR_REVIEWED"

    # Verify fact status transitioned to doctor_confirmed
    db_session.refresh(fact)
    assert fact.status == "doctor_confirmed"
    assert fact.reviewed_by == "dr_clara_chen"

    # Verify audit event in DB
    audit = db_session.query(AuditEvent).filter(AuditEvent.encounter_id == encounter.id).first()
    assert audit is not None
    assert audit.action == "DOCTOR_APPROVAL"
    assert audit.actor_id == "dr_clara_chen"
    assert audit.actor_role == "DOCTOR"
    new_state = json.loads(audit.new_state)
    assert new_state["approved"] is True
    assert new_state["status"] == "DOCTOR_REVIEWED"


def test_approve_encounter_unconfirmed_patient_forbidden(doctor_service, db_session):
    unconfirmed = Patient(
        display_name="Unconfirmed Patient",
        hospital_id="HOSP-DEMO-01",
        identity_status="CANDIDATE",
    )
    db_session.add(unconfirmed)
    db_session.commit()

    encounter = Encounter(
        patient_id=unconfirmed.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    payload = ApprovalRequest(
        approved=True,
        doctor_notes="Premature review",
    )

    with pytest.raises(ClinSyncAppException) as exc_info:
        doctor_service.approve_encounter(db=db_session, encounter_id=encounter.id, payload=payload)

    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "IDENTITY_NOT_CONFIRMED"


def test_get_doctor_queue_retrieves_booked_and_department_encounters(
    doctor_service, db_session, confirmed_patient
):
    # Create encounter assigned to cardiology
    enc = Encounter(
        patient_id=confirmed_patient.id,
        status="BOOKED",
        assigned_department_id="dept_cardiology",
    )
    db_session.add(enc)
    db_session.commit()

    response = doctor_service.get_doctor_queue(
        db=db_session, doctor_id="dr_clara_chen", request_id="req_queue_01"
    )

    assert response.data.doctor_id == "dr_clara_chen"
    assert len(response.data.encounters) >= 1
    assert any(e.id == enc.id for e in response.data.encounters)
    assert len(response.data.queue) >= 1


def test_get_doctor_brief_synthesizes_facts_and_citations(
    doctor_service, db_session, confirmed_patient
):
    enc = Encounter(
        patient_id=confirmed_patient.id,
        status="TRIAGED",
    )
    db_session.add(enc)
    db_session.commit()

    fact1 = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=enc.id,
        concept="Chief Complaint",
        value="Palpitations and shortness of breath",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="intake_turn_01",
    )
    fact2 = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=enc.id,
        concept="Heart Rate",
        value="104 bpm",
        fact_type="investigation",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="vitals_check",
    )
    fact3 = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=enc.id,
        concept="Allergy to Penicillin",
        value="Documented anaphylaxis",
        fact_type="allergy",
        status="conflicting",
        source_type="UPLOADED_DOCUMENT",
        source_id="doc_history_01",
    )
    db_session.add_all([fact1, fact2, fact3])
    db_session.commit()

    res = doctor_service.get_doctor_brief(
        db=db_session,
        encounter_id=enc.id,
        request_id="req_brief_01",
    )

    data = res.data
    assert data.encounter_id == enc.id
    assert data.patient_name == "Eleanor Rigby"
    assert "Chief Complaint" in data.chief_complaint
    assert "Palpitations" in data.clinical_summary
    assert len(data.citations) == 3
    assert any(c.fact_id == fact1.id for c in data.citations)
    assert any("conflicting" in q.lower() for q in data.unresolved_questions)
    assert data.audio_status == "PENDING"


def test_get_doctor_brief_unconfirmed_patient_forbidden(doctor_service, db_session):
    unconfirmed = Patient(
        display_name="Unconfirmed Patient",
        hospital_id="HOSP-DEMO-02",
        identity_status="CANDIDATE",
    )
    db_session.add(unconfirmed)
    db_session.commit()

    encounter = Encounter(
        patient_id=unconfirmed.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    with pytest.raises(ClinSyncAppException) as exc_info:
        doctor_service.get_doctor_brief(db=db_session, encounter_id=encounter.id)

    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "IDENTITY_NOT_CONFIRMED"


def test_approve_encounter_with_corrections_and_rejection_flow(
    doctor_service, db_session, confirmed_patient
):
    enc = Encounter(
        patient_id=confirmed_patient.id,
        status="TRIAGED",
    )
    db_session.add(enc)
    db_session.commit()

    fact = ClinicalFact(
        patient_id=confirmed_patient.id,
        encounter_id=enc.id,
        concept="Blood Pressure",
        value="120/80 mmHg",
        fact_type="investigation",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="vitals",
    )
    db_session.add(fact)
    db_session.commit()

    # Rejection decision
    reject_payload = ApprovalRequest(
        decision="REJECTED",
        doctor_notes="Insufficient clinical data. Patient advised for emergency triage.",
        doctor_id="dr_chen",
    )
    res = doctor_service.approve_encounter(
        db=db_session, encounter_id=enc.id, payload=reject_payload
    )

    assert res.data.status == "TRIAGED"  # Encounter status not promoted on rejection
    audit = db_session.query(AuditEvent).filter(AuditEvent.encounter_id == enc.id).first()
    assert audit.action == "DOCTOR_REJECTION"
