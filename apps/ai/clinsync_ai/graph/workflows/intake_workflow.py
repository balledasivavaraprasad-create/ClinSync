"""Compiled LangGraph state graph workflow for adaptive patient intake."""

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from clinsync_ai.graph.nodes.intake_nodes import (
    check_stopping_node,
    extract_facts_node,
    generate_question_node,
    safety_triage_node,
)
from clinsync_ai.graph.state import IntakeState
from clinsync_ai.routing.gateway import ModelGateway


def build_intake_workflow(gateway: ModelGateway | None = None) -> CompiledStateGraph:
    """Build and compile the LangGraph adaptive clinical intake state graph."""
    gw = gateway or ModelGateway()

    def safety_step(state: IntakeState) -> dict:
        return safety_triage_node(state)

    def extract_step(state: IntakeState) -> dict:
        return extract_facts_node(state, gateway=gw)

    def stop_step(state: IntakeState) -> dict:
        return check_stopping_node(state)

    def question_step(state: IntakeState) -> dict:
        return generate_question_node(state, gateway=gw)

    workflow = StateGraph(IntakeState)

    # Register workflow nodes
    workflow.add_node("safety", safety_step)
    workflow.add_node("extract", extract_step)
    workflow.add_node("check_stop", stop_step)
    workflow.add_node("generate_question", question_step)

    # Entry point
    workflow.set_entry_point("safety")

    # Conditional routing after safety triage
    def route_safety(state: IntakeState) -> str:
        if state.emergency_detected:
            return END
        return "extract"

    workflow.add_conditional_edges(
        "safety",
        route_safety,
        {END: END, "extract": "extract"},
    )

    # Standard progression to stopping condition evaluation
    workflow.add_edge("extract", "check_stop")

    # Conditional routing after checking stopping conditions
    def route_stop(state: IntakeState) -> str:
        if state.status != "IN_PROGRESS":
            return END
        return "generate_question"

    workflow.add_conditional_edges(
        "check_stop",
        route_stop,
        {END: END, "generate_question": "generate_question"},
    )

    workflow.add_edge("generate_question", END)

    return workflow.compile()


def advance_intake_turn(
    state: IntakeState,
    patient_input: str,
    gateway: ModelGateway | None = None,
    input_modality: str = "VOICE",
) -> IntakeState:
    """Execute a single conversational turn in the LangGraph intake workflow."""
    app = build_intake_workflow(gateway=gateway)

    # Prepare turn input
    current_state = state.model_copy(deep=True)
    current_state.last_patient_input = patient_input
    current_state.input_modality = input_modality
    if patient_input.strip():
        current_state.dialog_history.append({"role": "patient", "content": patient_input})

    result_dict = app.invoke(current_state)

    if isinstance(result_dict, IntakeState):
        return result_dict
    return IntakeState.model_validate(result_dict)
