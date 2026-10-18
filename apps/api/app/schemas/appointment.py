"""Schemas for appointment slots query and atomic booking."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class AppointmentSlotSchema(BaseModel):
    """Schema for a single appointment slot matching OpenAPI AppointmentSlot."""

    slot_id: str
    doctor_id: str
    doctor_name: str
    department_id: str
    department_name: Optional[str] = None
    start_at: datetime
    end_at: datetime
    status: Literal["AVAILABLE", "HOLD", "BOOKED"]
    available: Optional[bool] = None

    def model_post_init(self, __context: object) -> None:
        if self.available is None:
            self.available = self.status == "AVAILABLE"


class SlotsData(BaseModel):
    """Data container for slots query response."""

    department_id: Optional[str] = None
    slots: list[AppointmentSlotSchema] = Field(default_factory=list)


class SlotsResponse(BaseModel):
    """Top-level response envelope matching OpenAPI GET /appointments/slots."""

    data: SlotsData
    request_id: str


class BookingRequest(BaseModel):
    """Booking request payload matching OpenAPI POST /appointments."""

    slot_id: str
    encounter_id: str
    idempotency_key: str


class BookingData(BaseModel):
    """Booking data container matching OpenAPI POST /appointments response."""

    booking_id: str
    slot_id: str
    start_at: datetime
    doctor_id: str
    status: str = "BOOKED"
    slot: Optional[AppointmentSlotSchema] = None
    confirmed_at: Optional[datetime] = None


class BookingResponse(BaseModel):
    """Top-level response envelope matching OpenAPI POST /appointments."""

    data: BookingData
    request_id: str
