"""Unit tests for LangGraph Adaptive Intake Workflow (TASK-P3-201)."""

import pytest
from clinsync_ai.graph.nodes.intake_nodes import (
    check_stopping_node,
    extract_facts_node,
    generate_question_node,
    safety_triage_node,
)
from clinsync_ai.graph.state import (
    ClinicalFactModel,
    IntakeState,
    WorkflowStatus,
)
from clinsync_ai.graph.workflows.intake_workflow import (
    advance_intake_turn,
    build_intake_workflow,
)
from clinsync_ai.intake.service import (
    AdaptiveIntakeService,
    IntakeTurnRequest,
)


def test_safety_triage_emergency_detection():
    """Red-flag medical emergencies must trigger immediate escalation."""
    state = IntakeState(
        patient_id="PAT-EMERG-001",
        encounter_id="ENC-001",
        last_patient_input="I have severe crushing chest pain radiating to my left arm and I can't breathe",
    )
    result = safety_triage_node(state)
    assert result["emergency_detected"] is True
    assert result["status"] == "ESCALATE_EMERGENCY"
    assert "extracted_facts" in result
    assert len(result["extracted_facts"]) >= 1
    assert result["extracted_facts"][0].concept == "emergency_symptom"


def test_safety_triage_routine_symptoms():
    """Routine symptoms must pass safety triage without triggering emergency escalation."""
    state = IntakeState(
        patient_id="PAT-ROUTINE-001",
        encounter_id="ENC-002",
        last_patient_input="I've had a dry cough and mild runny nose for three days",
    )
    result = safety_triage_node(state)
    assert result["emergency_detected"] is False
    assert result["status"] == "IN_PROGRESS"


def test_extract_facts_updates_fields_and_provenance(offline_gateway):
    """Fact extraction must update known fields and maintain audit provenance."""
    state = IntakeState(
        patient_id="PAT-ROUTINE-001",
        encounter_id="ENC-002",
        turn_count=1,
        last_patient_input="I have a sore throat for about 5 days now, pain is 4 out of 10",
        missing_fields=["chief_complaint", "duration_onset", "severity_progression"],
    )
    result = extract_facts_node(state, gateway=offline_gateway)
    facts = result["extracted_facts"]
    assert len(facts) >= 2

    # Check provenance
    for fact in facts:
        assert fact.source_type == "PATIENT_VOICE"
        assert fact.status == "reported"
        assert fact.encounter_id == "ENC-002"
        assert fact.patient_id == "PAT-ROUTINE-001"

    assert "chief_complaint" in result["known_fields"]
    assert "duration_onset" in result["known_fields"]
    assert "chief_complaint" not in result["missing_fields"]
    assert "duration_onset" not in result["missing_fields"]


def test_check_stopping_max_turns():
    """Workflow must terminate when max turns limit is reached (bounded loop invariant)."""
    state = IntakeState(
        patient_id="PAT-003",
        encounter_id="ENC-003",
        turn_count=5,
        max_turns=5,
        missing_fields=["medications"],
    )
    result = check_stopping_node(state)
    assert result["status"] == "COMPLETED"
    assert result["next_question"] is None


def test_check_stopping_patient_completion_signal():
    """Patient completion phrases must conclude intake without further prompting."""
    state = IntakeState(
        patient_id="PAT-004",
        encounter_id="ENC-004",
        turn_count=2,
        max_turns=5,
        last_patient_input="No, that is all the information I have.",
        known_fields={"chief_complaint": "headache"},
        missing_fields=["allergies"],
    )
    result = check_stopping_node(state)
    assert result["status"] == "COMPLETED"
    assert result["next_question"] is None


def test_generate_question_targets_missing_fields_without_repetition(offline_gateway):
    """Question generation must target missing/uncertain fields without re-asking known facts."""
    state = IntakeState(
        patient_id="PAT-005",
        encounter_id="ENC-005",
        turn_count=1,
        known_fields={"chief_complaint": "knee pain"},
        missing_fields=["duration_onset", "severity_progression"],
    )
    result = generate_question_node(state, gateway=offline_gateway)
    question = result["next_question"]
    assert question is not None
    assert "long" in question.lower() or "start" in question.lower() or "duration" in question.lower() or "health" in question.lower()


def test_langgraph_workflow_compilation(offline_gateway):
    """The LangGraph intake workflow must compile cleanly into a StateGraph."""
    graph = build_intake_workflow(gateway=offline_gateway)
    assert graph is not None


def test_advance_intake_turn_routine_progression(offline_gateway):
    """Executing advance_intake_turn must correctly progress turn count and state."""
    initial_state = IntakeState(
        patient_id="PAT-INTAKE-100",
        encounter_id="ENC-100",
        turn_count=0,
        max_turns=5,
    )
    updated_state = advance_intake_turn(
        state=initial_state,
        patient_input="I've been feeling dizzy since yesterday morning",
        gateway=offline_gateway,
    )

    assert updated_state.turn_count == 1
    assert updated_state.status == "IN_PROGRESS"
    assert updated_state.emergency_detected is False
    assert len(updated_state.extracted_facts) >= 1
    assert updated_state.next_question is not None


def test_advance_intake_turn_emergency_escalation(offline_gateway):
    """Executing advance_intake_turn on emergency input must transition to ESCALATE_EMERGENCY."""
    initial_state = IntakeState(
        patient_id="PAT-INTAKE-999",
        encounter_id="ENC-999",
        turn_count=0,
    )
    updated_state = advance_intake_turn(
        state=initial_state,
        patient_input="Patient is coughing up blood and having severe chest pain",
        gateway=offline_gateway,
    )

    assert updated_state.emergency_detected is True
    assert updated_state.status == "ESCALATE_EMERGENCY"
    assert "ESCALATION REQUIRED" in (updated_state.next_question or "")


def test_adaptive_intake_service_turn_orchestration(offline_gateway):
    """AdaptiveIntakeService must serialize/deserialize state and produce compliant contract responses."""
    service = AdaptiveIntakeService(gateway=offline_gateway)

    # Turn 1
    req1 = IntakeTurnRequest(
        field_key="chief_complaint",
        raw_response="I have a sprained ankle from playing soccer",
    )
    res1 = service.process_turn(encounter_id="ENC-SVC-01", request=req1, patient_id="PAT-SVC-01")

    assert res1.turn_count == 1
    assert res1.status == "IN_PROGRESS"
    assert res1.is_complete is False
    assert res1.next_question is not None
    assert len(res1.extracted_facts) >= 1

    # Turn 2 - Provide next answer
    req2 = IntakeTurnRequest(
        field_key="duration_severity",
        raw_response="It happened 2 days ago and pain is about 6 out of 10",
    )
    res2 = service.process_turn(encounter_id="ENC-SVC-01", request=req2, patient_id="PAT-SVC-01")

    assert res2.turn_count == 2
    session = service.get_session("ENC-SVC-01")
    assert session is not None
    assert "duration_onset" in session.known_fields or "severity_progression" in session.known_fields

    # Turn 3 - Conclude
    req3 = IntakeTurnRequest(
        field_key="final_notes",
        raw_response="No, that is all the information.",
    )
    res3 = service.process_turn(encounter_id="ENC-SVC-01", request=req3, patient_id="PAT-SVC-01")

    assert res3.is_complete is True
    assert res3.status == "COMPLETED"
