"""Contract tests validating doctor queue and approval endpoints.

Conforms to openapi.json.
"""

import json
from pathlib import Path

from app.db.base import generate_uuid
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

OPENAPI_PATH = Path(__file__).resolve().parents[4] / "packages" / "contracts" / "openapi.json"


def _setup_confirmed_encounter(db: Session) -> tuple[Patient, Encounter]:
    patient = Patient(
        id=generate_uuid(),
        display_name="Contract Doctor Patient",
        identity_status="CONFIRMED",
    )
    db.add(patient)
    db.commit()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=patient.id,
        status="TRIAGED",
        assigned_department_id="dept_cardiology",
    )
    db.add(encounter)
    db.commit()
    return patient, encounter


def test_doctor_queue_and_approval_contracts(client: TestClient, db_session: Session):
    """Verify doctor queue and encounter approval conform to openapi.json."""
    with open(OPENAPI_PATH, "r", encoding="utf-8") as f:
        spec = json.load(f)

    schemas = spec["components"]["schemas"]
    queue_schema = schemas["DoctorQueueResponse"]
    approval_schema = schemas["ApprovalResponse"]
    encounter_schema = schemas["Encounter"]
    error_schema = schemas["ErrorDetail"]

    patient, encounter = _setup_confirmed_encounter(db_session)

    # 1. Add clinical fact to encounter
    fact = ClinicalFact(
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Heart Rate",
        value="82 bpm",
        fact_type="investigation",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="test_contract",
    )
    db_session.add(fact)
    db_session.commit()

    # 2. GET /doctors/{doctor_id}/queue
    queue_res = client.get("/api/v1/doctors/dr_clara_chen/queue")
    assert queue_res.status_code == 200
    queue_json = queue_res.json()

    # Validate DoctorQueueResponse schema
    for req_field in queue_schema["required"]:
        assert req_field in queue_json, (
            f"Missing required field in DoctorQueueResponse: {req_field}"
        )

    queue_data = queue_json["data"]
    assert "doctor_id" in queue_data
    assert "encounters" in queue_data
    assert isinstance(queue_data["encounters"], list)

    if queue_data["encounters"]:
        first_enc = queue_data["encounters"][0]
        for req_enc_field in encounter_schema["required"]:
            assert req_enc_field in first_enc, (
                f"Missing required field in Encounter: {req_enc_field}"
            )

    # 3. POST /encounters/{encounter_id}/approvals (Successful Doctor Sign-Off)
    approval_payload = {
        "approved": True,
        "doctor_notes": "Reviewed ECG and vitals. Patient stable for outpatient monitoring.",
        "doctor_id": "dr_clara_chen",
    }
    approval_res = client.post(
        f"/api/v1/encounters/{encounter.id}/approvals",
        json=approval_payload,
    )
    assert approval_res.status_code == 200
    approval_json = approval_res.json()

    # Validate ApprovalResponse schema
    for req_field in approval_schema["required"]:
        assert req_field in approval_json, (
            f"Missing required field in ApprovalResponse: {req_field}"
        )

    approval_data = approval_json["data"]
    assert "encounter_id" in approval_data
    assert "status" in approval_data
    assert "approved_at" in approval_data
    assert approval_data["status"] == "DOCTOR_REVIEWED"

    # 4. POST /encounters/{id}/approvals with unconfirmed patient (403 IDENTITY_NOT_CONFIRMED)
    unconfirmed_patient = Patient(
        id=generate_uuid(),
        display_name="Unconfirmed Contract Patient",
        identity_status="CANDIDATE",
    )
    db_session.add(unconfirmed_patient)
    db_session.commit()

    unconfirmed_encounter = Encounter(
        id=generate_uuid(),
        patient_id=unconfirmed_patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(unconfirmed_encounter)
    db_session.commit()

    forbidden_res = client.post(
        f"/api/v1/encounters/{unconfirmed_encounter.id}/approvals",
        json=approval_payload,
    )
    assert forbidden_res.status_code == 403
    forbidden_json = forbidden_res.json()

    for req_err_field in error_schema["required"]:
        assert req_err_field in forbidden_json, (
            f"Missing required field in ErrorDetail: {req_err_field}"
        )

    assert forbidden_json["code"] == "IDENTITY_NOT_CONFIRMED"
    assert forbidden_json["code"] in error_schema["properties"]["code"]["enum"]

    # 5. POST /encounters/{non_existent_id}/approvals (404 NOT_FOUND)
    not_found_res = client.post(
        "/api/v1/encounters/enc_nonexistent_999/approvals",
        json=approval_payload,
    )
    assert not_found_res.status_code == 404
    not_found_json = not_found_res.json()

    for req_err_field in error_schema["required"]:
        assert req_err_field in not_found_json, (
            f"Missing required field in ErrorDetail: {req_err_field}"
        )

    assert not_found_json["code"] == "NOT_FOUND"
    assert not_found_json["code"] in error_schema["properties"]["code"]["enum"]
