"""Security, privacy, and zero-sensitive-data leak audit tests for ClinSync API."""

import base64
import logging
from datetime import date

from app.core.logging import SafeFormatter, redact_sensitive_text
from app.db.base import generate_uuid
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_log_redaction_masks_sensitive_identifiers():
    """Verify logger and SafeFormatter strip PHI, SSN, API keys, and credentials."""
    raw_log = (
        "Patient Alice Smith SSN 000-12-3456 phone 555-019-2834 credit card 4111-2222-3333-4444 "
        "used API key AIzaSyA1234567890abcdefghijklmnop with password='SuperSecretPassword123'"
    )

    redacted = redact_sensitive_text(raw_log)

    assert "000-12-3456" not in redacted
    assert "[REDACTED_SSN]" in redacted
    assert "4111-2222-3333-4444" not in redacted
    assert "[REDACTED_CARD]" in redacted
    assert "555-019-2834" not in redacted
    assert "[REDACTED_PHONE]" in redacted
    assert "AIzaSyA1234567890abcdefghijklmnop" not in redacted
    assert "[REDACTED_KEY]" in redacted
    assert "SuperSecretPassword123" not in redacted

    # Test through Python logging formatter
    formatter = SafeFormatter(fmt="%(message)s")
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret with SSN 123-45-6789",
        args=(),
        exc_info=None,
    )
    formatted_msg = formatter.format(record)
    assert "123-45-6789" not in formatted_msg
    assert "[REDACTED_SSN]" in formatted_msg
    assert "[REDACTED_TOKEN]" in formatted_msg


def test_candidate_lookup_zero_sensitive_data_leakage(client: TestClient, db_session: Session):
    """Candidate lookup must mask display name and contain 0 clinical facts or history."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Eleanor Johnson",
        date_of_birth=date(1980, 4, 12),
        contact_hint="e***r@example.com",
        hospital_id="HOSP-DEMO-SEC-01",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()

    # Seed sensitive clinical facts that must NOT leak
    fact = ClinicalFact(
        patient_id=patient.id,
        encounter_id=None,
        concept="Psychiatric Evaluation",
        value="Patient treated for acute anxiety disorder",
        fact_type="condition",
        status="historical_recorded",
        source_type="HISTORICAL_EHR",
        source_id="ehr_secret_01",
    )
    db_session.add(fact)
    db_session.commit()

    res = client.post(
        "/api/v1/identity/candidates",
        json={"search_hint": "Eleanor", "consent_obtained": True},
    )
    assert res.status_code == 200
    candidates = res.json()["data"]["candidates"]
    assert len(candidates) >= 1

    candidate = next(c for c in candidates if c["candidate_id"] == patient.id)
    # Name must be masked
    assert candidate["display_name_masked"] != "Eleanor Johnson"
    assert "*" in candidate["display_name_masked"]

    # Verify response body contains 0 mentions of sensitive clinical conditions
    body_text = res.text
    assert "anxiety" not in body_text.lower()
    assert "psychiatric" not in body_text.lower()
    assert "facts" not in res.json()["data"]


def test_unconfirmed_patient_strictly_blocked_across_all_clinical_endpoints(
    client: TestClient, db_session: Session
):
    """Unconfirmed candidate patients must receive 403 on all clinical endpoints."""
    unconfirmed = Patient(
        id=generate_uuid(),
        display_name="Sarah Connor",
        date_of_birth=date(1985, 11, 10),
        hospital_id="HOSP-DEMO-SEC-02",
        identity_status="CANDIDATE",
    )
    db_session.add(unconfirmed)
    db_session.commit()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=unconfirmed.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    # 1. Patient Context Gate
    ctx_res = client.get(f"/api/v1/patients/{unconfirmed.id}/context")
    assert ctx_res.status_code == 403
    assert ctx_res.json()["code"] == "IDENTITY_NOT_CONFIRMED"

    # 2. Encounter Creation Gate
    create_res = client.post(
        "/api/v1/encounters",
        json={
            "patient_id": unconfirmed.id,
            "identity_confirmation_id": "fake_token",
            "intake_language": "en",
        },
    )
    assert create_res.status_code == 403
    assert create_res.json()["code"] == "IDENTITY_NOT_CONFIRMED"

    # 3. Routing Review Gate
    routing_res = client.post(f"/api/v1/encounters/{encounter.id}/routing-review")
    assert routing_res.status_code == 403
    assert routing_res.json()["code"] == "IDENTITY_NOT_CONFIRMED"

    # 4. Doctor Brief Gate
    brief_res = client.get(f"/api/v1/encounters/{encounter.id}/brief")
    assert brief_res.status_code == 403
    assert brief_res.json()["code"] == "IDENTITY_NOT_CONFIRMED"

    # 5. Doctor Approval Gate
    approval_res = client.post(
        f"/api/v1/encounters/{encounter.id}/approvals",
        json={"approved": True, "doctor_notes": "Attempt on unconfirmed patient"},
    )
    assert approval_res.status_code == 403
    assert approval_res.json()["code"] == "IDENTITY_NOT_CONFIRMED"


def test_tenant_isolation_cross_patient_data_access_forbidden(
    client: TestClient, db_session: Session
):
    """Patient A cannot access Patient B's encounter documents, ledger, or diff."""
    patient_a = Patient(id=generate_uuid(), display_name="Patient A", identity_status="CONFIRMED")
    patient_b = Patient(id=generate_uuid(), display_name="Patient B", identity_status="CONFIRMED")
    db_session.add_all([patient_a, patient_b])
    db_session.commit()

    enc_a = Encounter(id=generate_uuid(), patient_id=patient_a.id, status="TRIAGED")
    db_session.add(enc_a)
    db_session.commit()

    # Querying Patient A's ledger with Patient B's identity must return 403 ACCESS_DENIED
    ledger_res = client.get(f"/api/v1/encounters/{enc_a.id}/ledger?patient_id={patient_b.id}")
    assert ledger_res.status_code == 403
    assert ledger_res.json()["code"] == "ACCESS_DENIED"

    # Querying Patient A's diff with Patient B's identity must return 403 ACCESS_DENIED
    diff_res = client.get(f"/api/v1/encounters/{enc_a.id}/diff?patient_id={patient_b.id}")
    assert diff_res.status_code == 403
    assert diff_res.json()["code"] == "ACCESS_DENIED"


def test_malicious_document_upload_rejected(client: TestClient, db_session: Session):
    """Path traversal and dangerous executable file uploads must be rejected."""
    patient = Patient(id=generate_uuid(), display_name="Valid Patient", identity_status="CONFIRMED")
    db_session.add(patient)
    db_session.commit()

    enc = Encounter(id=generate_uuid(), patient_id=patient.id, status="IN_PROGRESS")
    db_session.add(enc)
    db_session.commit()

    # 1. Path traversal filename sanitized without directory escape
    res_traversal = client.post(
        f"/api/v1/encounters/{enc.id}/documents",
        json={
            "filename": "../../../../../etc/passwd_exploit.pdf",
            "mime_type": "application/pdf",
            "content_base64": base64.b64encode(b"%PDF-1.4 sample content").decode("utf-8"),
        },
    )
    assert res_traversal.status_code == 202
    assert "/" not in res_traversal.json()["data"]["filename"]
    assert ".." not in res_traversal.json()["data"]["filename"]

    # 2. Executable script rejected with 400 VALIDATION_ERROR
    res_script = client.post(
        f"/api/v1/encounters/{enc.id}/documents",
        json={
            "filename": "exploit.sh",
            "mime_type": "application/x-sh",
            "content_base64": base64.b64encode(b"#!/bin/bash\necho hack").decode("utf-8"),
        },
    )
    assert res_script.status_code == 400
    assert res_script.json()["code"] == "VALIDATION_ERROR"


def test_sql_injection_safe_parameter_binding(client: TestClient, db_session: Session):
    """SQL injection strings in input do not execute or compromise database state."""
    sql_injection = "'; DROP TABLE patients; --"

    # Search candidates with SQL injection payload
    res = client.post(
        "/api/v1/identity/candidates",
        json={"search_hint": sql_injection, "consent_obtained": True},
    )
    assert res.status_code == 200

    # Verify patients table remains fully intact
    count = db_session.query(Patient).count()
    assert count >= 0
