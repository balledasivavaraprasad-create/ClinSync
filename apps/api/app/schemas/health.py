"""Health check response schemas."""

from pydantic import BaseModel, Field

from app.schemas.common import ResponseEnvelope


class HealthData(BaseModel):
    """Health check payload."""

    status: str = Field(default="healthy", description="Service health state")
    version: str = Field(..., description="API version")
    database: str = Field(..., description="Database connection status: connected | error")
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")


class HealthResponse(ResponseEnvelope[HealthData]):
    """Standard health check response envelope."""

    pass
