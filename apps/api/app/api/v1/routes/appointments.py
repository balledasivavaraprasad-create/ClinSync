"""Appointment slot query and atomic booking routes."""

from datetime import date
from typing import Optional

from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.appointment import BookingRequest, BookingResponse, SlotsResponse
from app.services.appointment_service import AppointmentService
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/appointments", tags=["Appointments"])
appointment_service = AppointmentService()


@router.get(
    "/slots",
    response_model=SlotsResponse,
    summary="Query seeded available appointment slots",
    description=(
        "Query available appointment slots filtered by department and optional date window."
    ),
)
def get_available_slots(
    department_id: str = Query(..., description="Hospital department identifier"),
    date: Optional[date] = Query(None, description="Optional target date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> SlotsResponse:
    """Retrieve available appointment slots for a department."""
    return appointment_service.get_available_slots(
        db=db,
        department_id=department_id,
        date_filter=date,
        request_id=request_id,
    )


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Atomically book an appointment slot",
    description=(
        "Atomically book an available appointment slot within a database transaction. "
        "Guarantees idempotency via client idempotency_key and rejects concurrent duplicate "
        "bookings with 409 SLOT_UNAVAILABLE."
    ),
)
def book_appointment(
    payload: BookingRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> BookingResponse:
    """Atomically book an appointment slot for an encounter."""
    return appointment_service.book_appointment(
        db=db,
        payload=payload,
        request_id=request_id,
    )
