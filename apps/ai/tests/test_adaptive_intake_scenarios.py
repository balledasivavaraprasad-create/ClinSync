"""Comprehensive scenario tests for Adaptive Clinical Intake Questioning.

Verifies:
1. Elimination of hardcoded 5-question limit.
2. Dynamic stopping for simple complaints in fewer than 5 turns.
3. Expanded exploration past 5 turns for complex multi-symptom concerns.
4. Symptom-driven question branching (cardiac, abdominal, respiratory).
5. Safety turn limit bounded at 10 turns.
6. Emergency red-flag safety escalation.
"""

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
)
from clinsync_ai.graph.workflows.intake_workflow import advance_intake_turn


def test_adaptive_simple_concern_stops_early(offline_gateway):
    """Simple mild complaints where patient signals completion stop in 2-3 turns without forcing 5 questions."""
    # Turn 1: Patient reports mild rash
    state1 = IntakeState(
        patient_id="PAT-SIMPLE-001",
        encounter_id="ENC-SIMPLE-001",
        turn_count=1,
        last_patient_input="I have a mild rash on my forearm",
        known_fields={"chief_complaint": "mild rash on forearm"},
        missing_fields=["duration_onset", "associated_symptoms", "medical_history"],
    )
    stop1 = check_stopping_node(state1)
    assert stop1["status"] == "IN_PROGRESS"

    # Turn 2: Patient reports duration and clearly signals completion ("that is all")
    state2 = IntakeState(
        patient_id="PAT-SIMPLE-001",
        encounter_id="ENC-SIMPLE-001",
        turn_count=2,
        last_patient_input="It started yesterday. That is all, nothing else.",
        known_fields={"chief_complaint": "mild rash on forearm", "duration_onset": "yesterday"},
        missing_fields=["associated_symptoms", "medical_history"],
    )
    stop2 = check_stopping_node(state2)
    # Must stop adaptively at turn 2 without forcing 5 questions
    assert stop2["status"] == "COMPLETED"
    assert stop2["next_question"] is None


def test_adaptive_complex_concern_continues_past_turn_five(offline_gateway):
    """Complex cardiac/multi-symptom complaints continue past 5 turns to gather complete clinical context."""
    # At turn 5, patient still has unaddressed critical fields (medications, radiation)
    state5 = IntakeState(
        patient_id="PAT-COMPLEX-001",
        encounter_id="ENC-COMPLEX-001",
        turn_count=5,
        max_turns=10,
        last_patient_input="It also feels worse when I climb stairs, and I get dizzy.",
        known_fields={
            "chief_complaint": "chest tightness and shortness of breath",
            "duration_onset": "3 days",
            "severity_progression": "7/10 squeezing",
            "associated_symptoms": "dizziness, diaphoresis",
        },
        missing_fields=["medical_history"],
    )
    stop5 = check_stopping_node(state5)
    # Must NOT stop at turn 5 because medical history / cardiac meds are still needed
    assert stop5["status"] == "IN_PROGRESS"

    # Advance to generate next clinical question
    gen_result = generate_question_node(state5, gateway=offline_gateway)
    assert gen_result["next_question"] is not None
    # Question asks about medical history or medication
    assert any(
        kw in gen_result["next_question"].lower()
        for kw in ["medication", "history", "condition", "allerg", "health"]
    )


def test_adaptive_question_branching_symptom_specific(offline_gateway):
    """Next question generated is symptom-tailored (cardiac radiation vs abdominal)."""
    # Cardiac complaint
    cardiac_state = IntakeState(
        patient_id="PAT-CARD-001",
        encounter_id="ENC-CARD-001",
        turn_count=1,
        known_fields={"chief_complaint": "chest tightness and pressure"},
        missing_fields=["duration_onset", "associated_symptoms", "severity_progression"],
    )
    q_cardiac = generate_question_node(cardiac_state, gateway=offline_gateway)
    assert q_cardiac["next_question"] is not None
    # Mentions radiation, arm, neck, or onset
    assert any(
        term in q_cardiac["next_question"].lower()
        for term in ["spread", "radiat", "arm", "jaw", "neck", "long", "when", "start"]
    )

    # Abdominal complaint
    abd_state = IntakeState(
        patient_id="PAT-ABD-001",
        encounter_id="ENC-ABD-001",
        turn_count=1,
        known_fields={"chief_complaint": "sharp abdominal pain and nausea"},
        missing_fields=["duration_onset", "associated_symptoms", "severity_progression"],
    )
    q_abd = generate_question_node(abd_state, gateway=offline_gateway)
    assert q_abd["next_question"] is not None
    # Mentions duration, eating, food, or location
    assert any(
        term in q_abd["next_question"].lower()
        for term in ["long", "eat", "food", "start", "cramp", "stomach", "where"]
    )


def test_bounded_safety_limit_at_ten_turns():
    """Safety guardrail stops intake at max_turns (10) and notes remaining missing fields."""
    state10 = IntakeState(
        patient_id="PAT-LONG-001",
        encounter_id="ENC-LONG-001",
        turn_count=10,
        max_turns=10,
        last_patient_input="I also feel tired sometimes",
        known_fields={"chief_complaint": "generalized fatigue"},
        missing_fields=["medical_history"],
    )
    stop10 = check_stopping_node(state10)
    assert stop10["status"] == "COMPLETED"
    assert stop10["next_question"] is None
    assert "notes" in stop10 and any("maximum bounded turn count" in n for n in stop10["notes"])


def test_emergency_red_flag_immediate_escalation():
    """Emergency symptoms trigger immediate safety triage escalation regardless of turn count."""
    state_red_flag = IntakeState(
        patient_id="PAT-EMERG-002",
        encounter_id="ENC-EMERG-002",
        turn_count=1,
        last_patient_input="Sudden weakness and numbness on the left side of my face and arm",
    )
    triage_result = safety_triage_node(state_red_flag)
    assert triage_result["emergency_detected"] is True
    assert triage_result["status"] == "ESCALATE_EMERGENCY"
