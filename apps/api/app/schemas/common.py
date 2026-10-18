"""Common request and response envelope schemas."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ResponseEnvelope(BaseModel, Generic[T]):
    """Standardized response envelope with data and request_id."""

    data: T
    request_id: str = Field(..., description="Unique request tracing ID")
