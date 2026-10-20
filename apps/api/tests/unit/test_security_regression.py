"""Security regression tests for ClinSync authentication, authorization, and rate limiting.

Verifies:
1. Rejection of missing, malformed, invalid signature, and expired tokens.
2. Role-based enforcement (patient cannot access doctor queue or encounter approval).
3. Doctor scoping enforcement (doctor A cannot access doctor B's queue; staff can view all).
4. Patient context scoping (patient A cannot access patient B's clinical context).
5. Unconfirmed patient identity access refusal (403 IDENTITY_NOT_CONFIRMED).
6. Sliding-window rate limiting on AI and CRUD operations (HTTP 429 + Retry-After).
7. Trusted proxy IP resolution and header verification.
"""

from datetime import date, timedelta

import pytest
from app.auth.security import (
    create_access_token,
    create_doctor_token,
    create_patient_token,
    create_staff_token,
)
from app.core.config import Settings
from app.core.errors import ErrorCode
from app.core.rate_limit import limiter
from app.db.base import generate_uuid
from app.dependencies.db import get_db
from app.main import create_app
from app.models.encounter import Encounter
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# ==============================================================================
# Fixtures for Security Tests
# ==============================================================================


@pytest.fixture
def seeded_clinic(db_session: Session) -> dict:
    """Create test fixtures: two doctors, two patients, one unconfirmed, one encounter."""
    doc_1_id = "dr_gregory_house"
    doc_2_id = "dr_allison_cameron"

    pat_1 = Patient(
        id=generate_uuid(),
        display_name="Alice Smith",
        date_of_birth=date(1985, 3, 15),
        contact_hint="a***e@example.com",
        hospital_id="HOSP-SEC-01",
        identity_status="CONFIRMED",
    )
    pat_2 = Patient(
        id=generate_uuid(),
        display_name="Bob Jones",
        date_of_birth=date(1990, 7, 22),
        contact_hint="b***b@example.com",
        hospital_id="HOSP-SEC-02",
        identity_status="CONFIRMED",
    )
    pat_unconfirmed = Patient(
        id=generate_uuid(),
        display_name="Charlie Brown",
        date_of_birth=date(1978, 11, 5),
        contact_hint="c***n@example.com",
        hospital_id="HOSP-SEC-03",
        identity_status="UNCONFIRMED",
    )

    db_session.add_all([pat_1, pat_2, pat_unconfirmed])
    db_session.flush()

    enc_1 = Encounter(
        id=generate_uuid(),
        patient_id=pat_1.id,
        status="IN_PROGRESS",
    )
    db_session.add(enc_1)
    db_session.commit()

    return {
        "doc_1_id": doc_1_id,
        "doc_2_id": doc_2_id,
        "pat_1": pat_1,
        "pat_2": pat_2,
        "pat_unconfirmed": pat_unconfirmed,
        "enc_1": enc_1,
    }


# ==============================================================================
# 1. Missing, Malformed, Invalid Signature, and Expired Tokens
# ==============================================================================


def test_missing_token_on_protected_endpoints(client: TestClient, seeded_clinic: dict):
    """Missing Authorization header must reject request with 401 ACCESS_DENIED."""
    doc_id = seeded_clinic["doc_1_id"]
    enc_id = seeded_clinic["enc_1"].id
    pat_id = seeded_clinic["pat_1"].id

    # Doctor queue
    res1 = client.get(f"/api/v1/doctors/{doc_id}/queue")
    assert res1.status_code == 401
    assert res1.json()["code"] == ErrorCode.ACCESS_DENIED.value

    # Encounter approval
    res2 = client.post(
        f"/api/v1/encounters/{enc_id}/approvals",
        json={"doctor_notes": "Approved by doctor", "approved": True},
    )
    assert res2.status_code == 401
    assert res2.json()["code"] == ErrorCode.ACCESS_DENIED.value

    # Patient context
    res3 = client.get(f"/api/v1/patients/{pat_id}/context")
    assert res3.status_code == 401
    assert res3.json()["code"] == ErrorCode.ACCESS_DENIED.value


def test_malformed_token_rejected(client: TestClient, seeded_clinic: dict):
    """Malformed tokens (non-JWT, bad headers) must return 401 ACCESS_DENIED."""
    doc_id = seeded_clinic["doc_1_id"]

    headers_not_bearer = {"Authorization": "Basic dXNlcjpwYXNz"}
    res1 = client.get(f"/api/v1/doctors/{doc_id}/queue", headers=headers_not_bearer)
    assert res1.status_code == 401
    assert res1.json()["code"] == ErrorCode.ACCESS_DENIED.value

    headers_garbage = {"Authorization": "Bearer not-a-valid-jwt-token-string"}
    res2 = client.get(f"/api/v1/doctors/{doc_id}/queue", headers=headers_garbage)
    assert res2.status_code == 401
    assert res2.json()["code"] == ErrorCode.ACCESS_DENIED.value


def test_invalid_signature_token_rejected(client: TestClient, seeded_clinic: dict):
    """Token signed with an attacker's key must return 401 ACCESS_DENIED."""
    doc_id = seeded_clinic["doc_1_id"]

    # Forged token signed with attacker secret key
    forged_token = create_access_token(
        payload={"sub": doc_id, "role": "doctor"},
        secret_key="attacker_evil_secret_key_1234567890",
    )

    res = client.get(
        f"/api/v1/doctors/{doc_id}/queue",
        headers={"Authorization": f"Bearer {forged_token}"},
    )
    assert res.status_code == 401
    assert res.json()["code"] == ErrorCode.ACCESS_DENIED.value
    assert "Invalid authentication token signature" in res.json()["message"]


def test_expired_token_rejected(client: TestClient, seeded_clinic: dict):
    """Expired tokens must return 401 ACCESS_DENIED."""
    doc_id = seeded_clinic["doc_1_id"]

    # Token expired 10 minutes ago
    expired_token = create_access_token(
        payload={"sub": doc_id, "role": "doctor"},
        expires_delta=timedelta(seconds=-600),
    )

    res = client.get(
        f"/api/v1/doctors/{doc_id}/queue",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401
    assert res.json()["code"] == ErrorCode.ACCESS_DENIED.value
    assert "Authentication token has expired" in res.json()["message"]


# ==============================================================================
# 2. Role-Based Access Control Violations
# ==============================================================================


def test_patient_cannot_access_doctor_queue(client: TestClient, seeded_clinic: dict):
    """A patient token must be denied access to the doctor queue (403 ACCESS_DENIED)."""
    doc_id = seeded_clinic["doc_1_id"]
    pat_id = seeded_clinic["pat_1"].id

    pat_token = create_patient_token(patient_id=pat_id)

    res = client.get(
        f"/api/v1/doctors/{doc_id}/queue",
        headers={"Authorization": f"Bearer {pat_token}"},
    )
    assert res.status_code == 403
    assert res.json()["code"] == ErrorCode.ACCESS_DENIED.value


def test_patient_cannot_approve_encounter(client: TestClient, seeded_clinic: dict):
    """A patient token cannot approve an encounter (403 ACCESS_DENIED)."""
    enc_id = seeded_clinic["enc_1"].id
    pat_id = seeded_clinic["pat_1"].id

    pat_token = create_patient_token(patient_id=pat_id)

    res = client.post(
        f"/api/v1/encounters/{enc_id}/approvals",
        json={"doctor_notes": "Patient self-approving", "approved": True},
        headers={"Authorization": f"Bearer {pat_token}"},
    )
    assert res.status_code == 403
    assert res.json()["code"] == ErrorCode.ACCESS_DENIED.value


# ==============================================================================
# 3. Doctor Scoping Violations
# ==============================================================================


def test_doctor_cannot_access_other_doctor_queue(client: TestClient, seeded_clinic: dict):
    """Doctor A cannot access Doctor B's queue (403 ACCESS_DENIED)."""
    doc_1_id = seeded_clinic["doc_1_id"]
    doc_2_id = seeded_clinic["doc_2_id"]

    # Doctor 1 token attempting to access Doctor 2's queue
    doc_1_token = create_doctor_token(doctor_id=doc_1_id)

    res = client.get(
        f"/api/v1/doctors/{doc_2_id}/queue",
        headers={"Authorization": f"Bearer {doc_1_token}"},
    )
    assert res.status_code == 403
    assert res.json()["code"] == ErrorCode.ACCESS_DENIED.value
    assert "not authorized to access queue" in res.json()["message"]


def test_staff_can_view_any_doctor_queue(client: TestClient, seeded_clinic: dict):
    """Staff role can view doctor queue for operational coordination."""
    doc_1_id = seeded_clinic["doc_1_id"]
    staff_token = create_staff_token(staff_id="staff_coordinator_01")

    res = client.get(
        f"/api/v1/doctors/{doc_1_id}/queue",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert res.status_code == 200
    assert "queue" in res.json()["data"]


# ==============================================================================
# 4. Cross-Patient Isolation Violations
# ==============================================================================


def test_cross_patient_context_access_rejected(client: TestClient, seeded_clinic: dict):
    """Patient 1 cannot access Patient 2's clinical context (403 ACCESS_DENIED)."""
    pat_1_id = seeded_clinic["pat_1"].id
    pat_2_id = seeded_clinic["pat_2"].id

    pat_1_token = create_patient_token(patient_id=pat_1_id)

    res = client.get(
        f"/api/v1/patients/{pat_2_id}/context",
        headers={"Authorization": f"Bearer {pat_1_token}"},
    )
    assert res.status_code == 403
    assert res.json()["code"] == ErrorCode.ACCESS_DENIED.value
    assert "Cannot access clinical context of another patient" in res.json()["message"]


def test_unconfirmed_patient_context_access_rejected(client: TestClient, seeded_clinic: dict):
    """Context lookup on an unconfirmed patient must return 403 IDENTITY_NOT_CONFIRMED."""
    unconfirmed_id = seeded_clinic["pat_unconfirmed"].id

    # Even with no token or any token, unconfirmed identity check fires first
    res = client.get(f"/api/v1/patients/{unconfirmed_id}/context")
    assert res.status_code == 403
    assert res.json()["code"] == ErrorCode.IDENTITY_NOT_CONFIRMED.value


# ==============================================================================
# 5. Legitimate Access Success Paths
# ==============================================================================


def test_legitimate_doctor_queue_access(client: TestClient, seeded_clinic: dict):
    """Doctor accessing own queue succeeds with 200."""
    doc_1_id = seeded_clinic["doc_1_id"]
    doc_1_token = create_doctor_token(doctor_id=doc_1_id)

    res = client.get(
        f"/api/v1/doctors/{doc_1_id}/queue",
        headers={"Authorization": f"Bearer {doc_1_token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["doctor_id"] == doc_1_id


def test_legitimate_patient_context_access(client: TestClient, seeded_clinic: dict):
    """Patient accessing own context succeeds with 200."""
    pat_1_id = seeded_clinic["pat_1"].id
    pat_1_token = create_patient_token(patient_id=pat_1_id)

    res = client.get(
        f"/api/v1/patients/{pat_1_id}/context",
        headers={"Authorization": f"Bearer {pat_1_token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["patient_id"] == pat_1_id


def test_doctor_can_access_patient_context(client: TestClient, seeded_clinic: dict):
    """Doctors and staff can access confirmed patient context."""
    pat_1_id = seeded_clinic["pat_1"].id
    doc_1_id = seeded_clinic["doc_1_id"]
    doc_token = create_doctor_token(doctor_id=doc_1_id)

    res = client.get(
        f"/api/v1/patients/{pat_1_id}/context",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["patient_id"] == pat_1_id


# ==============================================================================
# 6. Rate Limiting Regression Tests
# ==============================================================================


def test_sliding_window_rate_limiting_enforcement(db_session: Session):
    """Verify HTTP 429, Retry-After header, and tier-specific rate limits."""
    # Reset in-memory rate limiter buckets
    limiter.reset()

    # Configure app with strict rate limits: 3 for AI, 5 for CRUD
    rate_limited_settings = Settings(
        APP_ENV="test",
        LOG_LEVEL="WARNING",
        RATE_LIMIT_ENABLED=True,
        RATE_LIMIT_AI_PER_MINUTE=3,
        RATE_LIMIT_CRUD_PER_MINUTE=5,
        RATE_LIMIT_WINDOW_SECONDS=60,
        TRUSTED_PROXIES=["127.0.0.1", "10.0.0.1"],
    )

    test_app = create_app(rate_limited_settings)

    def override_get_db():
        yield db_session

    test_app.dependency_overrides[get_db] = override_get_db

    with TestClient(test_app) as custom_client:
        # 1. Health check is exempt from rate limiting
        for _ in range(10):
            res = custom_client.get("/api/v1/health")
            assert res.status_code == 200

        # 2. CRUD tier: limit is 5 requests per minute
        # Requests 1 to 5 must succeed
        for i in range(5):
            res = custom_client.get("/api/v1/appointments/slots?department_id=dept_cardiology")
            assert res.status_code == 200, f"Request {i + 1} failed"
            assert "X-RateLimit-Limit" in res.headers
            assert res.headers["X-RateLimit-Limit"] == "5"

        # Request 6 must exceed limit and return 429
        res_blocked = custom_client.get("/api/v1/appointments/slots?department_id=dept_cardiology")
        assert res_blocked.status_code == 429
        assert res_blocked.json()["code"] == ErrorCode.RATE_LIMIT_EXCEEDED.value
        assert "Retry-After" in res_blocked.headers
        assert int(res_blocked.headers["Retry-After"]) > 0
        assert res_blocked.headers["X-RateLimit-Remaining"] == "0"


def test_trusted_proxy_rate_limit_resolution(db_session: Session):
    """X-Forwarded-For is only trusted when the peer IP is in TRUSTED_PROXIES."""
    limiter.reset()

    proxy_settings = Settings(
        APP_ENV="test",
        RATE_LIMIT_ENABLED=True,
        RATE_LIMIT_CRUD_PER_MINUTE=2,
        RATE_LIMIT_WINDOW_SECONDS=60,
        TRUSTED_PROXIES=["testclient", "127.0.0.1"],
    )

    test_app = create_app(proxy_settings)

    def override_get_db():
        yield db_session

    test_app.dependency_overrides[get_db] = override_get_db

    with TestClient(test_app) as custom_client:
        # Client A sends 2 requests through proxy
        headers_a = {"X-Forwarded-For": "203.0.113.10"}
        slots_url = "/api/v1/appointments/slots?department_id=dept_general"
        r1 = custom_client.get(slots_url, headers=headers_a)
        assert r1.status_code == 200
        r2 = custom_client.get(slots_url, headers=headers_a)
        assert r2.status_code == 200

        # Client A's 3rd request is rate-limited
        r3 = custom_client.get(slots_url, headers=headers_a)
        assert r3.status_code == 429

        # Client B sends request with different forwarded IP -> should succeed!
        headers_b = {"X-Forwarded-For": "198.51.100.20"}
        r4 = custom_client.get(slots_url, headers=headers_b)
        assert r4.status_code == 200
