"""Routing and triage policy review service conforming to OpenAPI DecisionResultResponse."""

import uuid
from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, Field

from clinsync_ai.graph.state import ClinicalFactModel
from clinsync_ai.guardrails.triage_guard import TriageEvaluation, TriagePolicyGuard
from clinsync_ai.routing.gateway import ModelGateway
from clinsync_ai.routing.recommender import SpecialtyRecommender


class DecisionResult(BaseModel):
    """Routing decision details matching OpenAPI 3.1.0 DecisionResultResponse data property."""
    decision: Literal["ROUTINE_SCHEDULING", "HUMAN_REVIEW", "URGENT_ESCALATION", "UNABLE_TO_DETERMINE"]
    reason_codes: list[str] = Field(default_factory=list)
    recommended_department_id: str | None = None
    policy_version: str = "clinsync-policy-v1.0"
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DecisionResultResponse(BaseModel):
    """Top-level response envelope matching OpenAPI /encounters/{id}/routing-review."""
    data: DecisionResult
    request_id: str = Field(default_factory=lambda: f"req_routing_{uuid.uuid4().hex[:12]}")


class RoutingReviewService:
    """Evaluates clinical encounters and enforces deterministic safety policies."""

    def __init__(
        self,
        gateway: ModelGateway | None = None,
        policy_version: str = "clinsync-policy-v1.0",
    ):
        self.gateway = gateway
        self.policy_version = policy_version
        self.guard = TriagePolicyGuard(policy_version=policy_version)
        self.recommender = SpecialtyRecommender(gateway=gateway)

    def review_encounter(
        self,
        encounter_id: str,
        patient_input: str = "",
        chief_complaint: str = "",
        symptoms: list[str] | None = None,
        facts: list[ClinicalFactModel] | None = None,
        unresolved_conflicts: list[Any] | None = None,
        request_id: str | None = None,
    ) -> DecisionResultResponse:
        """Run deterministic triage policy and constrained specialty routing."""
        req_id = request_id or f"req_routing_{uuid.uuid4().hex[:12]}"
        
        # 1. First Pass: Deterministic Emergency Red Flag Check
        combined_text = " ".join(filter(None, [patient_input, chief_complaint] + (symptoms or [])))
        is_emerg, red_codes, red_pats = self.guard.evaluate_text_for_emergency(combined_text)
        if is_emerg:
            return DecisionResultResponse(
                data=DecisionResult(
                    decision="URGENT_ESCALATION",
                    reason_codes=["ACUTE_RED_FLAG_DETECTED"] + list(set(red_codes)),
                    recommended_department_id=None,
                    policy_version=self.policy_version,
                    evaluated_at=datetime.now(timezone.utc).isoformat(),
                ),
                request_id=req_id,
            )

        # 2. Specialty Recommendation (Model Gateway or Deterministic Rules)
        spec_rec = self.recommender.recommend(
            chief_complaint=chief_complaint,
            symptoms=symptoms,
            facts=facts,
            context_notes=patient_input,
        )

        # 3. Guard Candidate Decision Through Inviolable Triage Guard
        candidate_decision = (
            "ROUTINE_SCHEDULING"
            if (spec_rec.department_id and not spec_rec.is_ambiguous)
            else ("UNABLE_TO_DETERMINE" if not combined_text.strip() else "HUMAN_REVIEW")
        )

        triage_eval: TriageEvaluation = self.guard.guard_candidate_decision(
            candidate_decision=candidate_decision,
            candidate_department_id=spec_rec.department_id,
            patient_input=combined_text,
            unresolved_conflicts=unresolved_conflicts,
            is_ambiguous=spec_rec.is_ambiguous,
        )

        return DecisionResultResponse(
            data=DecisionResult(
                decision=triage_eval.decision,
                reason_codes=triage_eval.reason_codes,
                recommended_department_id=triage_eval.recommended_department_id,
                policy_version=self.policy_version,
                evaluated_at=datetime.now(timezone.utc).isoformat(),
            ),
            request_id=req_id,
        )
