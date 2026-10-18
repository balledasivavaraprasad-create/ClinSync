"""Unit tests for ClinicalContextLedger and PatientContextDiffEngine (TASK-P3-301)."""

import pytest
from clinsync_ai.clinical_context.diff import PatientContextDiffEngine
from clinsync_ai.clinical_context.ledger import ClinicalContextLedger
from clinsync_ai.graph.state import ClinicalFactModel


def test_clinical_context_ledger_add_and_query():
    """Ledger must store facts and query by status and fact_type without losing provenance."""
    ledger = ClinicalContextLedger(encounter_id="ENC-LEDGER-001")

    f1 = ClinicalFactModel(
        id="FACT-01",
        patient_id="PAT-01",
        encounter_id="ENC-LEDGER-001",
        concept="chief_complaint",
        value="Persistent dry cough",
        fact_type="symptom",
        status="reported",
        source_type="PATIENT_VOICE",
        source_id="TURN-1",
    )
    f2 = ClinicalFactModel(
        id="FACT-02",
        patient_id="PAT-01",
        encounter_id="ENC-LEDGER-001",
        concept="blood_pressure",
        value="120/80",
        unit="mmHg",
        fact_type="investigation",
        status="extracted_unverified",
        source_type="UPLOADED_DOCUMENT",
        source_id="DOC-99",
        source_location="Page 1",
    )
    ledger.add_facts([f1, f2])

    assert len(ledger.facts) == 2
    reported = ledger.get_facts_by_status("reported")
    assert len(reported) == 1
    assert reported[0].id == "FACT-01"

    unverified = ledger.get_facts_by_status("extracted_unverified")
    assert len(unverified) == 1
    assert unverified[0].id == "FACT-02"

    res = ledger.to_contract_response()
    assert res.data.encounter_id == "ENC-LEDGER-001"
    assert len(res.data.facts) == 2
    assert len(res.data.unresolved_conflicts) == 0


def test_clinical_context_ledger_detects_allergy_medication_contraindication():
    """Ledger must flag contraindication when medication matches known allergy (Rule 11)."""
    ledger = ClinicalContextLedger(encounter_id="ENC-CONTRA-002")

    allergy_fact = ClinicalFactModel(
        id="FACT-ALG-01",
        patient_id="PAT-02",
        encounter_id="ENC-CONTRA-002",
        concept="allergy",
        value="Penicillin",
        fact_type="allergy",
        status="historical_recorded",
        source_type="HISTORICAL_EHR",
        source_id="EHR-HIST-01",
    )
    med_fact = ClinicalFactModel(
        id="FACT-MED-01",
        patient_id="PAT-02",
        encounter_id="ENC-CONTRA-002",
        concept="medication",
        value="Amoxicillin 500mg oral",
        fact_type="medication",
        status="extracted_unverified",
        source_type="UPLOADED_DOCUMENT",
        source_id="DOC-PRESCRIPTION-01",
    )

    ledger.add_facts([allergy_fact, med_fact])

    assert len(ledger.unresolved_conflicts) >= 1
    assert any("Contraindication conflict" in c for c in ledger.unresolved_conflicts)
    assert any("Amoxicillin" in c and "Penicillin" in c for c in ledger.unresolved_conflicts)

    # Invariant: Neither fact is erased; both are preserved with conflicting status
    assert allergy_fact.status == "conflicting"
    assert med_fact.status == "conflicting"


def test_patient_context_diff_engine_identifies_new_and_changed():
    """Diff engine must separate new findings, evolved/changed facts, and contradictions."""
    diff_engine = PatientContextDiffEngine()

    historical = [
        ClinicalFactModel(
            id="FACT-H1",
            patient_id="PAT-DIFF-01",
            concept="blood_pressure",
            value="120/80",
            unit="mmHg",
            fact_type="investigation",
            status="historical_recorded",
            source_type="HISTORICAL_EHR",
            source_id="HIST-01",
        ),
        ClinicalFactModel(
            id="FACT-H2",
            patient_id="PAT-DIFF-01",
            concept="allergy",
            value="Penicillin",
            fact_type="allergy",
            status="historical_recorded",
            source_type="HISTORICAL_EHR",
            source_id="HIST-02",
        ),
    ]

    current = [
        # Changed: Blood Pressure increased
        ClinicalFactModel(
            id="FACT-C1",
            patient_id="PAT-DIFF-01",
            encounter_id="ENC-DIFF-01",
            concept="blood_pressure",
            value="150/95",
            unit="mmHg",
            fact_type="investigation",
            status="extracted_unverified",
            source_type="UPLOADED_DOCUMENT",
            source_id="DOC-VITALS",
        ),
        # New: Dyspnea symptom
        ClinicalFactModel(
            id="FACT-C2",
            patient_id="PAT-DIFF-01",
            encounter_id="ENC-DIFF-01",
            concept="symptom",
            value="shortness of breath",
            fact_type="symptom",
            status="reported",
            source_type="PATIENT_VOICE",
            source_id="TURN-1",
        ),
        # Conflicting: Candidate Amoxicillin contravenes Penicillin allergy
        ClinicalFactModel(
            id="FACT-C3",
            patient_id="PAT-DIFF-01",
            encounter_id="ENC-DIFF-01",
            concept="medication",
            value="Amoxicillin 250mg",
            fact_type="medication",
            status="reported",
            source_type="PATIENT_VOICE",
            source_id="TURN-2",
        ),
    ]

    res = diff_engine.compute_diff(
        encounter_id="ENC-DIFF-01",
        historical_facts=historical,
        current_facts=current,
    )

    assert res.data.encounter_id == "ENC-DIFF-01"

    # Verify new facts
    assert len(res.data.new_facts) >= 2
    assert any(f.concept == "symptom" and "shortness of breath" in f.value for f in res.data.new_facts)

    # Verify changed facts
    assert len(res.data.changed_facts) == 1
    ch = res.data.changed_facts[0]
    assert ch.previous.value == "120/80"
    assert ch.current.value == "150/95"

    # Verify conflicts
    assert len(res.data.conflicts) >= 1
    assert any("Contraindication" in c and "Amoxicillin" in c for c in res.data.conflicts)
