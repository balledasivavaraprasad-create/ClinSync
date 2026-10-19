"""Unit tests for Mem0 Memory Harness and memory-informed question generation."""

from clinsync_ai.graph.state import IntakeState
from clinsync_ai.graph.nodes.intake_nodes import (
    extract_facts_node,
    generate_question_node,
)
from clinsync_ai.memory.harness import Mem0MemoryHarness, default_memory_harness


def test_mem0_memory_harness_add_search_and_clear():
    harness = Mem0MemoryHarness()
    enc_id = "enc_test_mem0_01"

    item1 = harness.add(
        content="I have a terrible body ache that started 3 days ago.",
        user_id="pat_001",
        encounter_id=enc_id,
        turn_index=1,
        concept="chief_complaint",
    )
    assert item1.content == "I have a terrible body ache that started 3 days ago."
    assert item1.concept == "chief_complaint"
    assert not item1.negated

    # Add self-correction / negated item
    item2 = harness.add(
        content="fever",
        user_id="pat_001",
        encounter_id=enc_id,
        turn_index=1,
        concept="negated_symptom",
        negated=True,
    )
    assert item2.negated

    # Search
    results = harness.search("body ache", encounter_id=enc_id)
    assert len(results) >= 1
    assert "body ache" in results[0].content

    # Affirmed and Negated extraction
    affirmed, negated = harness.get_affirmed_and_negated(enc_id)
    assert len(affirmed) == 1
    assert len(negated) == 1
    assert "fever" in negated

    # Prompt format
    prompt_str = harness.format_memory_for_prompt(enc_id)
    assert "Previous Patient Statements & Clinical Memory" in prompt_str
    assert "body ache" in prompt_str
    assert "fever" in prompt_str

    # Clear
    harness.clear(enc_id)
    assert len(harness.get_all(enc_id)) == 0


def test_intake_nodes_record_and_recall_with_mem0():
    enc_id = "enc_test_mem0_flow"
    default_memory_harness.clear(enc_id)

    initial_state = IntakeState(
        encounter_id=enc_id,
        patient_id="pat_002",
        status="IN_PROGRESS",
        last_patient_input="I have joint pain in my right knee.",
        missing_fields=["duration_onset", "severity_progression", "associated_symptoms"],
        known_fields={},
    )

    # 1. Extraction turn records to Mem0
    extracted_state_dict = extract_facts_node(initial_state)
    memories = default_memory_harness.get_all(enc_id)
    assert len(memories) >= 1
    assert any("knee" in m.content or "joint pain" in m.content for m in memories)

    # 2. Next question incorporates the memory
    updated_state = initial_state.model_copy(update=extracted_state_dict)
    q_dict = generate_question_node(updated_state)
    next_q = q_dict["next_question"]

    assert next_q is not None
    # Verify that the generated question acknowledges the chief complaint (joint pain / knee)
    assert "joint pain" in next_q.lower() or "symptoms" in next_q.lower()
