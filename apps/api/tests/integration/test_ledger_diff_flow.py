"""Integration tests for Clinical Context Ledger and Patient Context Diff APIs."""

from app.db.base import generate_uuid
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact as ClinicalFactModel
from app.models.patient import Patient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def _seed_patient_and_encounter(
    db: Session, name: str = "Demo Patient"
) -> tuple[Patient, Encounter]:
    """Helper to seed a confirmed patient and an encounter."""
    patient = Patient(
        id=generate_uuid(),
        display_name=name,
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
    db.refresh(patient)
    db.refresh(encounter)
    return patient, encounter


def test_get_ledger_nonexistent_encounter_returns_404(client: TestClient):
    """GET /encounters/{id}/ledger on nonexistent encounter returns 404 NOT_FOUND."""
    res = client.get("/api/v1/encounters/enc_missing_001/ledger")
    assert res.status_code == 404
    assert res.json()["code"] == "NOT_FOUND"


def test_get_diff_nonexistent_encounter_returns_404(client: TestClient):
    """GET /encounters/{id}/diff on nonexistent encounter returns 404 NOT_FOUND."""
    res = client.get("/api/v1/encounters/enc_missing_001/diff")
    assert res.status_code == 404
    assert res.json()["code"] == "NOT_FOUND"


def test_get_ledger_empty_encounter(client: TestClient, db_session: Session):
    """Empty encounter returns empty facts list and empty conflicts."""
    _, encounter = _seed_patient_and_encounter(db_session)

    res = client.get(f"/api/v1/encounters/{encounter.id}/ledger")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["encounter_id"] == encounter.id
    assert data["facts"] == []
    assert data["unresolved_conflicts"] == []


def test_get_ledger_with_provenance_and_conflict_detection(client: TestClient, db_session: Session):
    """Ledger preserves provenance and tags unresolved conflicts."""
    patient, encounter = _seed_patient_and_encounter(db_session)

    # 1. Fact from patient voice
    f1 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Chest Pain",
        value="Substernal pressure 7/10",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_VOICE",
        source_id="kiosk_voice_01",
        source_location="turn 1",
        confidence=0.98,
    )
    # 2. Fact from uploaded document
    f2 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Blood Pressure",
        value="145/95",
        unit="mmHg",
        fact_type="investigation",
        status="extracted_unverified",
        source_type="UPLOADED_DOCUMENT",
        source_id="doc_vitals_01",
        source_location="page 1",
        confidence=0.92,
        extraction_method="LlamaIndex_OCR",
    )
    # 3. Conflicting fact
    f3 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Symptom Duration",
        value="3 days (patient statement) vs 2 weeks (clinic referral)",
        fact_type="symptom",
        status="conflicting",
        source_type="UPLOADED_DOCUMENT",
        source_id="doc_referral_01",
        confidence=0.75,
    )
    db_session.add_all([f1, f2, f3])
    db_session.commit()

    res = client.get(f"/api/v1/encounters/{encounter.id}/ledger")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["encounter_id"] == encounter.id
    assert len(data["facts"]) == 3

    # Check provenance
    doc_fact = next(f for f in data["facts"] if f["concept"] == "Blood Pressure")
    assert doc_fact["source_type"] == "UPLOADED_DOCUMENT"
    assert doc_fact["source_id"] == "doc_vitals_01"
    assert doc_fact["source_location"] == "page 1"
    assert doc_fact["confidence"] == 0.92

    # Check unresolved conflict surfaced
    assert len(data["unresolved_conflicts"]) >= 1
    assert any("Symptom Duration" in c for c in data["unresolved_conflicts"])


def test_get_diff_calculates_new_changed_and_conflicting_facts(
    client: TestClient, db_session: Session
):
    """Diff correctly classifies new facts, changed facts, and surfaced conflicts."""
    patient, encounter = _seed_patient_and_encounter(db_session)

    # Historical facts from previous records
    h1 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=None,  # Baseline EHR
        concept="Hypertension Medication",
        value="Lisinopril 10mg daily",
        fact_type="medication",
        status="historical_recorded",
        source_type="HISTORICAL_EHR",
        source_id="ehr_baseline",
    )
    h2 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=None,
        concept="Drug Allergies",
        value="No known drug allergies",
        fact_type="allergy",
        status="historical_recorded",
        source_type="HISTORICAL_EHR",
        source_id="ehr_baseline",
    )
    db_session.add_all([h1, h2])
    db_session.commit()

    # Current encounter facts
    # 1. New fact (never seen historically)
    c1 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Shortness of Breath",
        value="Mild dyspnea on exertion",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_VOICE",
        source_id="intake_turn_2",
    )
    # 2. Changed fact (dosage updated)
    c2 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Hypertension Medication",
        value="Lisinopril 20mg daily",
        fact_type="medication",
        status="reported",
        source_type="PATIENT_FORM",
        source_id="intake_form_1",
    )
    # 3. Conflicting fact with historical "No known allergies"
    c3 = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient.id,
        encounter_id=encounter.id,
        concept="Drug Allergies",
        value="Penicillin hives and wheezing",
        fact_type="allergy",
        status="conflicting",
        source_type="PATIENT_VOICE",
        source_id="intake_turn_3",
    )
    db_session.add_all([c1, c2, c3])
    db_session.commit()

    res = client.get(f"/api/v1/encounters/{encounter.id}/diff")
    assert res.status_code == 200
    data = res.json()["data"]

    # 1. new_facts
    assert len(data["new_facts"]) == 1
    assert data["new_facts"][0]["concept"] == "Shortness of Breath"

    # 2. changed_facts
    assert len(data["changed_facts"]) >= 1
    med_change = next(
        cf for cf in data["changed_facts"] if cf["previous"]["concept"] == "Hypertension Medication"
    )
    assert med_change["previous"]["value"] == "Lisinopril 10mg daily"
    assert med_change["current"]["value"] == "Lisinopril 20mg daily"
    # Web client compatibility: check historical alias exists
    assert med_change["historical"]["value"] == "Lisinopril 10mg daily"

    # 3. conflicts
    assert len(data["conflicts"]) >= 1
    assert any("Drug Allergies" in c for c in data["conflicts"])
    assert data["unresolved_count"] >= 1


def test_patient_ledger_and_diff_isolation(client: TestClient, db_session: Session):
    """Patient A's facts do not leak into Patient B's ledger or diff."""
    patient_a, enc_a = _seed_patient_and_encounter(db_session, "Patient A")
    patient_b, enc_b = _seed_patient_and_encounter(db_session, "Patient B")

    fa = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=patient_a.id,
        encounter_id=enc_a.id,
        concept="Patient A Exclusive Diagnosis",
        value="Type 2 Diabetes",
        fact_type="condition",
        status="reported",
        source_type="PATIENT_VOICE",
        source_id="intake_a",
    )
    db_session.add(fa)
    db_session.commit()

    # Query Patient B's ledger
    res_b_ledger = client.get(f"/api/v1/encounters/{enc_b.id}/ledger")
    assert res_b_ledger.status_code == 200
    assert len(res_b_ledger.json()["data"]["facts"]) == 0

    # Query Patient B's diff
    res_b_diff = client.get(f"/api/v1/encounters/{enc_b.id}/diff")
    assert res_b_diff.status_code == 200
    assert len(res_b_diff.json()["data"]["new_facts"]) == 0
    assert len(res_b_diff.json()["data"]["changed_facts"]) == 0


def test_get_ledger_and_diff_unauthorized_patient_fails_403(
    client: TestClient, db_session: Session
):
    """Encounter ledger or diff with mismatched patient_id returns 403 ACCESS_DENIED."""
    patient_a, enc_a = _seed_patient_and_encounter(db_session, "Patient A")
    patient_b = Patient(
        id=generate_uuid(),
        display_name="Patient B",
        identity_status="CONFIRMED",
    )
    db_session.add(patient_b)
    db_session.commit()

    # Query Patient A's encounter passing Patient B's patient_id
    res_ledger = client.get(f"/api/v1/encounters/{enc_a.id}/ledger?patient_id={patient_b.id}")
    assert res_ledger.status_code == 403
    assert res_ledger.json()["code"] == "ACCESS_DENIED"

    res_diff = client.get(f"/api/v1/encounters/{enc_a.id}/diff?patient_id={patient_b.id}")
    assert res_diff.status_code == 403
    assert res_diff.json()["code"] == "ACCESS_DENIED"
