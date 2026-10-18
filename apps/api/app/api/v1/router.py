"""Central API v1 router aggregator."""

from app.api.v1.routes.encounters import router as encounters_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.identity import router as identity_router
from app.api.v1.routes.patients import router as patients_router
from fastapi import APIRouter

api_v1_router = APIRouter()

# Include feature route modules
api_v1_router.include_router(health_router, tags=["Health"])
api_v1_router.include_router(identity_router, tags=["Identity"])
api_v1_router.include_router(patients_router, tags=["Patients"])
api_v1_router.include_router(encounters_router, tags=["Encounters"])
