"""ClinSync Routing, Triage Guardrails, and Gateway package."""

from clinsync_ai.routing.gateway import ModelGateway
from clinsync_ai.routing.recommender import (
    SpecialtyCandidateSchema,
    SpecialtyRecommendation,
    SpecialtyRecommender,
)
from clinsync_ai.routing.service import (
    DecisionResult,
    DecisionResultResponse,
    RoutingReviewService,
)
from clinsync_ai.routing.specialty_catalog import (
    ALLOWLISTED_DEPARTMENTS,
    HospitalDepartment,
    get_department,
    is_valid_department_id,
    normalize_department_candidate,
)

__all__ = [
    "ModelGateway",
    "SpecialtyRecommender",
    "SpecialtyRecommendation",
    "SpecialtyCandidateSchema",
    "RoutingReviewService",
    "DecisionResult",
    "DecisionResultResponse",
    "ALLOWLISTED_DEPARTMENTS",
    "HospitalDepartment",
    "is_valid_department_id",
    "get_department",
    "normalize_department_candidate",
]
