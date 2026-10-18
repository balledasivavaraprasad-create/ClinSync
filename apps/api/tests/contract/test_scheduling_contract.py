"""Contract tests validating routing review and appointment scheduling endpoints.

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
        display_name="Contract Routing Patient",
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


def test_routing_and_appointments_contracts(client: TestClient, db_session: Session):
    """Verify routing review, slots query, booking, and 409 conflict conform to openapi.json."""
    with open(OPENAPI_PATH, "r", encoding="utf-8") as f:
        spec = json.load(f)

    schemas = spec["components"]["schemas"]
    decision_schema = schemas["DecisionResultResponse"]
    slots_schema = schemas["SlotsResponse"]
    slot_item_schema = schemas["AppointmentSlot"]
    booking_schema = schemas["BookingResponse"]
    error_schema = schemas["ErrorDetail"]

    patient, encounter = _setup_confirmed_encounter(db_session)

    # 1. POST /encounters/{id}/routing-review
    fact = ClinicalFact(
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Chief Complaint",
        value="Patient notes palpitations and racing pulse",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="test_contract",
    )
    db_session.add(fact)
    db_session.commit()

    routing_res = client.post(f"/api/v1/encounters/{encounter.id}/routing-review")
    assert routing_res.status_code == 200
    routing_json = routing_res.json()

    for req_field in decision_schema["required"]:
        assert req_field in routing_json, (
            f"Missing required field in DecisionResultResponse: {req_field}"
        )

    decision_data = routing_json["data"]
    for req_data_field in decision_schema["properties"]["data"]["required"]:
        assert req_data_field in decision_data, f"Missing field in DecisionResult: {req_data_field}"

    allowed_decisions = decision_schema["properties"]["data"]["properties"]["decision"]["enum"]
    assert decision_data["decision"] in allowed_decisions

    # 2. GET /appointments/slots
    slots_res = client.get("/api/v1/appointments/slots?department_id=dept_cardiology")
    assert slots_res.status_code == 200
    slots_json = slots_res.json()

    for req_field in slots_schema["required"]:
        assert req_field in slots_json, f"Missing required field in SlotsResponse: {req_field}"

    slots_list = slots_json["data"]["slots"]
    assert len(slots_list) > 0
    first_slot = slots_list[0]
    for req_slot_field in slot_item_schema["required"]:
        assert req_slot_field in first_slot, (
            f"Missing required field in AppointmentSlot: {req_slot_field}"
        )

    target_slot_id = first_slot["slot_id"]

    # 3. POST /appointments (Successful Booking)
    booking_payload = {
        "slot_id": target_slot_id,
        "encounter_id": encounter.id,
        "idempotency_key": "contract_idem_key_01",
    }
    booking_res = client.post("/api/v1/appointments", json=booking_payload)
    assert booking_res.status_code == 201
    booking_json = booking_res.json()

    for req_field in booking_schema["required"]:
        assert req_field in booking_json, f"Missing required field in BookingResponse: {req_field}"

    booking_data = booking_json["data"]
    assert "booking_id" in booking_data
    assert "slot_id" in booking_data
    assert "status" in booking_data
    assert booking_data["status"] == "BOOKED"

    # 4. POST /appointments (409 SLOT_UNAVAILABLE Conflict)
    conflict_payload = {
        "slot_id": target_slot_id,
        "encounter_id": encounter.id,
        "idempotency_key": "contract_idem_key_different",
    }
    conflict_res = client.post("/api/v1/appointments", json=conflict_payload)
    assert conflict_res.status_code == 409
    conflict_json = conflict_res.json()

    for req_error_field in error_schema["required"]:
        assert req_error_field in conflict_json, (
            f"Missing required field in ErrorDetail: {req_error_field}"
        )

    assert conflict_json["code"] == "SLOT_UNAVAILABLE"
    allowed_error_codes = error_schema["properties"]["code"]["enum"]
    assert conflict_json["code"] in allowed_error_codes
