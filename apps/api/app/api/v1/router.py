"""Central API v1 router aggregator."""

from app.api.v1.routes.health import router as health_router
from fastapi import APIRouter

api_v1_router = APIRouter()

# Include feature route modules
api_v1_router.include_router(health_router, tags=["Health"])
