"""Adaptive intake service orchestrating LangGraph workflow turns."""

import uuid
from typing import Any
from pydantic import BaseModel, Field

from clinsync_ai.graph.state import ClinicalFactModel, IntakeState
from clinsync_ai.graph.workflows.intake_workflow import advance_intake_turn
from clinsync_ai.routing.gateway import ModelGateway


class IntakeTurnRequest(BaseModel):
    """Input payload matching IntakeAnswerRequest contract."""
    field_key: str = "patient_response"
    raw_response: str
    input_modality: str = "VOICE"


class IntakeTurnResponseData(BaseModel):
    """Inner data container for IntakeStateResponse contract."""
    encounter_id: str
    turn_count: int
    status: str
    next_question: str | None = None
    extracted_facts: list[ClinicalFactModel] = Field(default_factory=list)


class IntakeTurnResponse(BaseModel):
    """Outer contract envelope matching IntakeStateResponse."""
    data: IntakeTurnResponseData
    request_id: str

    @property
    def status(self) -> str:
        return self.data.status

    @property
    def turn_count(self) -> int:
        return self.data.turn_count

    @property
    def next_question(self) -> str | None:
        return self.data.next_question

    @property
    def extracted_facts(self) -> list[ClinicalFactModel]:
        return self.data.extracted_facts

    @property
    def is_complete(self) -> bool:
        return self.data.status in ("COMPLETED", "ESCALATE_EMERGENCY")


class AdaptiveIntakeService:
    """Manages conversational clinical intake sessions using the LangGraph engine."""

    def __init__(self, gateway: ModelGateway | None = None):
        self.gateway = gateway
        self._sessions: dict[str, IntakeState] = {}

    def get_or_create_session(
        self,
        encounter_id: str,
        patient_id: str = "PATIENT-DEMO-001",
        max_turns: int = 5,
    ) -> IntakeState:
        """Retrieve existing intake session or initialize a fresh state."""
        if encounter_id not in self._sessions:
            self._sessions[encounter_id] = IntakeState(
                encounter_id=encounter_id,
                patient_id=patient_id,
                max_turns=max_turns,
                status="IN_PROGRESS",
                next_question="Hello, what brings you in to see the doctor today?",
            )
        return self._sessions[encounter_id]

    def advance(
        self,
        encounter_id: str,
        patient_statement: str,
        patient_id: str = "PATIENT-DEMO-001",
        input_modality: str = "VOICE",
    ) -> IntakeTurnResponse:
        """Advance intake workflow by one patient turn and return contract response."""
        req_id = f"req-{uuid.uuid4().hex[:12]}"
        state = self.get_or_create_session(encounter_id=encounter_id, patient_id=patient_id)

        # Advance state via LangGraph workflow
        updated_state = advance_intake_turn(
            state=state,
            patient_input=patient_statement,
            gateway=self.gateway,
            input_modality=input_modality,
        )
        self._sessions[encounter_id] = updated_state

        return IntakeTurnResponse(
            data=IntakeTurnResponseData(
                encounter_id=updated_state.encounter_id,
                turn_count=updated_state.turn_count,
                status=updated_state.status,
                next_question=updated_state.next_question,
                extracted_facts=updated_state.extracted_facts,
            ),
            request_id=req_id,
        )

    def process_turn(
        self,
        encounter_id: str,
        request: IntakeTurnRequest,
        patient_id: str = "PATIENT-DEMO-001",
    ) -> IntakeTurnResponse:
        """Process turn using IntakeTurnRequest payload."""
        return self.advance(
            encounter_id=encounter_id,
            patient_statement=request.raw_response,
            patient_id=patient_id,
            input_modality=request.input_modality,
        )

    def get_session(self, encounter_id: str) -> IntakeState | None:
        """Inspect current state of an intake session."""
        return self._sessions.get(encounter_id)

    def clear(self) -> None:
        """Clear all active sessions (for test isolation)."""
        self._sessions.clear()
