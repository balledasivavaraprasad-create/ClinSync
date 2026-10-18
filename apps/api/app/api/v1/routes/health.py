"""Health check route."""

from datetime import datetime, timezone

from app.core.config import get_settings
from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.health import HealthData, HealthResponse
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

router = APIRouter()
settings = get_settings()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Check API runtime status, configuration, and database connectivity.",
)
def get_health(
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> HealthResponse:
    """Return API health status and verify database connection."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    now_iso = datetime.now(timezone.utc).isoformat()
    return HealthResponse(
        data=HealthData(
            status="healthy" if db_status == "connected" else "degraded",
            version=settings.VERSION,
            database=db_status,
            timestamp=now_iso,
        ),
        request_id=request_id,
    )
