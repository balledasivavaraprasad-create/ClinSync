"""Contract tests validating document, ledger, and diff endpoints against openapi.json."""

import base64
import json
from pathlib import Path

from app.db.base import generate_uuid
from app.models.encounter import Encounter
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

OPENAPI_PATH = Path(__file__).resolve().parents[4] / "packages" / "contracts" / "openapi.json"


def _setup_encounter(db: Session) -> tuple[Patient, Encounter]:
    patient = Patient(
        id=generate_uuid(),
        display_name="Contract Test Patient",
        identity_status="CONFIRMED",
    )
    db.add(patient)
    db.commit()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=patient.id,
        status="IN_PROGRESS",
    )
    db.add(encounter)
    db.commit()
    return patient, encounter


def test_document_and_ledger_contracts(client: TestClient, db_session: Session):
    """Verify document upload, status, ledger, and diff conform to openapi.json schemas."""
    with open(OPENAPI_PATH, "r", encoding="utf-8") as f:
        spec = json.load(f)

    schemas = spec["components"]["schemas"]
    doc_status_schema = schemas["DocumentStatusResponse"]
    ledger_schema = schemas["LedgerResponse"]
    diff_schema = schemas["DiffResponse"]

    _, encounter = _setup_encounter(db_session)

    # 1. POST /encounters/{id}/documents
    pdf_b64 = base64.b64encode(b"%PDF-1.4\n%EOF\n").decode("utf-8")
    upload_res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "contract_test.pdf",
            "mime_type": "application/pdf",
            "content_base64": pdf_b64,
        },
    )
    assert upload_res.status_code == 202
    upload_json = upload_res.json()
    for req_field in doc_status_schema["required"]:
        assert req_field in upload_json, f"Missing required field in upload: {req_field}"
    assert "document_id" in upload_json["data"]
    assert "status" in upload_json["data"]
    allowed_statuses = doc_status_schema["properties"]["data"]["properties"]["status"]["enum"]
    assert upload_json["data"]["status"] in allowed_statuses

    doc_id = upload_json["data"]["document_id"]

    # 2. GET /documents/{id}/status
    status_res = client.get(f"/api/v1/documents/{doc_id}/status")
    assert status_res.status_code == 200
    status_json = status_res.json()
    for req_field in doc_status_schema["required"]:
        assert req_field in status_json, f"Missing required field in status: {req_field}"

    # 3. GET /encounters/{id}/ledger
    ledger_res = client.get(f"/api/v1/encounters/{encounter.id}/ledger")
    assert ledger_res.status_code == 200
    ledger_json = ledger_res.json()
    for req_field in ledger_schema["required"]:
        assert req_field in ledger_json, f"Missing required field in ledger: {req_field}"
    assert "encounter_id" in ledger_json["data"]
    assert "facts" in ledger_json["data"]
    assert "unresolved_conflicts" in ledger_json["data"]

    # 4. GET /encounters/{id}/diff
    diff_res = client.get(f"/api/v1/encounters/{encounter.id}/diff")
    assert diff_res.status_code == 200
    diff_json = diff_res.json()
    for req_field in diff_schema["required"]:
        assert req_field in diff_json, f"Missing required field in diff: {req_field}"
    assert "encounter_id" in diff_json["data"]
    assert "new_facts" in diff_json["data"]
    assert "changed_facts" in diff_json["data"]
    assert "conflicts" in diff_json["data"]
