"""Clinical safety policy review and specialty routing routes."""

from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.routing import DecisionResultResponse
from app.services.routing_service import RoutingService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/encounters", tags=["Routing & Safety"])
routing_service = RoutingService()


@router.post(
    "/{encounter_id}/routing-review",
    response_model=DecisionResultResponse,
    summary="Run deterministic routing/safety policy",
    description=(
        "Run deterministic clinical safety policy and specialty routing rules. "
        "High-risk red flags trigger mandatory urgent escalation; routine presentations "
        "route strictly to allowlisted hospital departments."
    ),
)
def evaluate_routing(
    encounter_id: str,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> DecisionResultResponse:
    """Evaluate encounter safety policies and specialty routing."""
    return routing_service.evaluate_routing(
        db=db,
        encounter_id=encounter_id,
        request_id=request_id,
    )
