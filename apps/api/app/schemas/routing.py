"""Schemas for clinical routing and safety policy review."""

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


class DecisionResult(BaseModel):
    """Routing decision details matching OpenAPI 3.1.0 DecisionResultResponse data property."""

    decision: Literal[
        "ROUTINE_SCHEDULING",
        "HUMAN_REVIEW",
        "URGENT_ESCALATION",
        "UNABLE_TO_DETERMINE",
    ]
    reason_codes: list[str] = Field(default_factory=list)
    recommended_department_id: Optional[str] = None
    policy_version: str = "clinsync-policy-v1.0"
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    encounter_id: Optional[str] = None


class DecisionResultResponse(BaseModel):
    """Top-level response envelope matching OpenAPI /encounters/{id}/routing-review."""

    data: DecisionResult
    request_id: str
