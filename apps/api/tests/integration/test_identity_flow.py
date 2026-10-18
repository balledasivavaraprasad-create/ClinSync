"""Integration tests for identity candidate lookup, secondary confirmation, and context gating."""

from datetime import date

from app.db.base import generate_uuid
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_candidate_lookup_without_consent_fails_400(client: TestClient) -> None:
    """Biometric consent is mandatory for candidate lookup."""
    response = client.post(
        "/api/v1/identity/candidates",
        json={"biometric_consent": False},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "Biometric consent is required" in data["message"]


def test_candidate_lookup_masks_display_name_and_excludes_medical_history(
    client: TestClient, db_session: Session
) -> None:
    """Candidate lookup must mask patient names and not disclose clinical records."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Jane Eleanor Watson",
        date_of_birth=date(1988, 5, 14),
        contact_hint="jane.watson@example.com",
        hospital_id="HOSP-DEMO-01",
        identity_status="CANDIDATE",
    )
    db_session.add(patient)

    # Seed sensitive clinical fact that must NOT appear in candidate lookup
    fact = ClinicalFact(
        id=generate_uuid(),
        patient_id=patient.id,
        concept="chronic_condition",
        value="Stage 2 Hypertension",
        fact_type="condition",
        status="historical_recorded",
        source_type="HISTORICAL_EHR",
        source_id="ehr_seed_01",
    )
    db_session.add(fact)
    db_session.commit()

    response = client.post(
        "/api/v1/identity/candidates",
        json={"biometric_consent": True},
    )
    assert response.status_code == 200
    res_data = response.json()
    assert "data" in res_data
    candidates = res_data["data"]["candidates"]
    assert len(candidates) >= 1

    matched = next((c for c in candidates if c["candidate_id"] == patient.id), None)
    assert matched is not None
    # Masked display name e.g. "J*** E*** W***"
    assert "Jane" not in matched["display_name_masked"]
    assert "Watson" not in matched["display_name_masked"]
    assert matched["display_name_masked"].startswith("J")
    # Medical facts must be completely absent from response
    assert "Hypertension" not in response.text
    assert "chronic_condition" not in response.text


def test_candidate_lookup_with_search_hint(client: TestClient, db_session: Session) -> None:
    """Search hint filters candidate pool."""
    p1 = Patient(
        id=generate_uuid(),
        display_name="Alice Smith",
        date_of_birth=date(1992, 1, 15),
        identity_status="CANDIDATE",
    )
    p2 = Patient(
        id=generate_uuid(),
        display_name="Bob Miller",
        date_of_birth=date(1980, 10, 20),
        identity_status="CANDIDATE",
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    response = client.post(
        "/api/v1/identity/candidates",
        json={"biometric_consent": True, "search_hint": "Smith"},
    )
    assert response.status_code == 200
    candidates = response.json()["data"]["candidates"]
    assert len(candidates) == 1
    assert candidates[0]["candidate_id"] == p1.id


def test_confirm_identity_mismatched_dob_returns_403(
    client: TestClient, db_session: Session
) -> None:
    """Mismatching date of birth triggers 403 IDENTITY_NOT_CONFIRMED."""
    patient = Patient(
        id=generate_uuid(),
        display_name="David Clark",
        date_of_birth=date(1975, 8, 22),
        identity_status="CANDIDATE",
    )
    db_session.add(patient)
    db_session.commit()

    response = client.post(
        "/api/v1/identity/confirm",
        json={
            "candidate_id": patient.id,
            "date_of_birth": "1980-01-01",  # Wrong DOB
            "consent_accepted": True,
        },
    )
    assert response.status_code == 403
    err = response.json()
    assert err["code"] == "IDENTITY_NOT_CONFIRMED"
    assert "Secondary identity check failed" in err["message"]

    # Verify patient remains unconfirmed in DB
    db_session.refresh(patient)
    assert patient.identity_status == "CANDIDATE"


def test_confirm_identity_success_issues_token_and_confirms_patient(
    client: TestClient, db_session: Session
) -> None:
    """Matching DOB confirms patient identity and issues token."""
    patient = Patient(
        id=generate_uuid(),
        display_name="David Clark",
        date_of_birth=date(1975, 8, 22),
        identity_status="CANDIDATE",
    )
    db_session.add(patient)
    db_session.commit()

    response = client.post(
        "/api/v1/identity/confirm",
        json={
            "candidate_id": patient.id,
            "date_of_birth": "1975-08-22",
            "consent_accepted": True,
        },
    )
    assert response.status_code == 200
    res_data = response.json()["data"]
    assert res_data["confirmed"] is True
    assert res_data["patient_id"] == patient.id
    assert res_data["patient_display_name"] == "David Clark"
    assert res_data["identity_confirmation_id"].startswith("conf_")

    # Verify state in DB
    db_session.refresh(patient)
    assert patient.identity_status == "CONFIRMED"


def test_patient_context_unconfirmed_patient_blocked_403(
    client: TestClient, db_session: Session
) -> None:
    """Unconfirmed patient's clinical context is strictly blocked."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Unconfirmed Patient",
        date_of_birth=date(1990, 1, 1),
        identity_status="CANDIDATE",
    )
    db_session.add(patient)
    db_session.commit()

    response = client.get(f"/api/v1/patients/{patient.id}/context")
    assert response.status_code == 403
    err = response.json()
    assert err["code"] == "IDENTITY_NOT_CONFIRMED"
    assert "Patient identity must be confirmed" in err["message"]


def test_patient_context_authorized_patient_returns_historical_facts(
    client: TestClient, db_session: Session
) -> None:
    """Confirmed patient's clinical context is accessible with provenance."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Confirmed Patient",
        date_of_birth=date(1990, 1, 1),
        identity_status="CONFIRMED",
    )
    db_session.add(patient)

    fact = ClinicalFact(
        id=generate_uuid(),
        patient_id=patient.id,
        concept="allergy",
        value="Penicillin",
        fact_type="allergy",
        status="doctor_confirmed",
        source_type="HISTORICAL_EHR",
        source_id="ehr_seed_99",
    )
    db_session.add(fact)
    db_session.commit()

    response = client.get(f"/api/v1/patients/{patient.id}/context")
    assert response.status_code == 200
    res_data = response.json()["data"]
    assert res_data["patient_id"] == patient.id
    assert res_data["display_name"] == "Confirmed Patient"
    assert len(res_data["historical_facts"]) == 1
    f = res_data["historical_facts"][0]
    assert f["concept"] == "allergy"
    assert f["value"] == "Penicillin"
    assert f["fact_type"] == "allergy"
    assert f["source_type"] == "HISTORICAL_EHR"


def test_manual_registration_fallback(client: TestClient) -> None:
    """Manual registration creates confirmed patient record for kiosk fallback."""
    response = client.post(
        "/api/v1/patients/register",
        json={
            "display_name": "Marcus Aurelius",
            "date_of_birth": "1980-04-26",
            "contact_hint": "marcus@rome.demo",
        },
    )
    assert response.status_code == 201
    res_data = response.json()["data"]
    assert res_data["display_name"] == "Marcus Aurelius"
    assert res_data["identity_status"] == "CONFIRMED"
    assert res_data["id"] is not None
