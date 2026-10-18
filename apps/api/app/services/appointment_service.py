"""Appointment booking and slot management service."""

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ClinSyncAppException, ErrorCode
from app.models.appointment import Appointment, AppointmentSlot
from app.models.encounter import Encounter
from app.schemas.appointment import (
    AppointmentSlotSchema,
    BookingData,
    BookingRequest,
    BookingResponse,
    SlotsData,
    SlotsResponse,
)

# Standard Seed Data for Hospital Departments
SEED_SLOTS = [
    {
        "slot_id": "slot_cardio_101",
        "doctor_id": "dr_clara_chen",
        "doctor_name": "Dr. Clara Chen, MD (Cardiology)",
        "department_id": "dept_cardiology",
        "department_name": "Cardiology & Chest Pain Center",
        "start_offset_hours": 2,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_cardio_102",
        "doctor_id": "dr_clara_chen",
        "doctor_name": "Dr. Clara Chen, MD (Cardiology)",
        "department_id": "dept_cardiology",
        "department_name": "Cardiology & Chest Pain Center",
        "start_offset_hours": 3,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_internal_201",
        "doctor_id": "dr_marcus_vance",
        "doctor_name": "Dr. Marcus Vance, MD (Internal Medicine)",
        "department_id": "dept_internal_med",
        "department_name": "General Internal Medicine",
        "start_offset_hours": 4,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_neuro_301",
        "doctor_id": "dr_elena_rostova",
        "doctor_name": "Dr. Elena Rostova, MD (Neurology)",
        "department_id": "dept_neurology",
        "department_name": "Neurology & Stroke Unit",
        "start_offset_hours": 5,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_ortho_401",
        "doctor_id": "dr_james_wilson",
        "doctor_name": "Dr. James Wilson, MD (Orthopedics)",
        "department_id": "dept_orthopedics",
        "department_name": "Orthopedics & Musculoskeletal",
        "start_offset_hours": 6,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_pulm_501",
        "doctor_id": "dr_amita_patel",
        "doctor_name": "Dr. Amita Patel, MD (Pulmonology)",
        "department_id": "dept_pulmonology",
        "department_name": "Pulmonology & Respiratory Care",
        "start_offset_hours": 7,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_ent_601",
        "doctor_id": "dr_robert_lang",
        "doctor_name": "Dr. Robert Lang, MD (ENT)",
        "department_id": "dept_ent",
        "department_name": "Otolaryngology / ENT",
        "start_offset_hours": 8,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_derm_701",
        "doctor_id": "dr_sophia_martinez",
        "doctor_name": "Dr. Sophia Martinez, MD (Dermatology)",
        "department_id": "dept_dermatology",
        "department_name": "Dermatology",
        "start_offset_hours": 9,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
    {
        "slot_id": "slot_gp_801",
        "doctor_id": "dr_alex_rivera",
        "doctor_name": "Dr. Alex Rivera, MD (Primary Care)",
        "department_id": "dept_general_practice",
        "department_name": "Primary Care / General Practice",
        "start_offset_hours": 10,
        "duration_minutes": 30,
        "status": "AVAILABLE",
    },
]


class AppointmentService:
    """Service handling slot availability queries and atomic booking transactions."""

    def get_available_slots(
        self,
        db: Session,
        department_id: str,
        date_filter: Optional[date] = None,
        request_id: str = "req_unknown",
    ) -> SlotsResponse:
        """Query seeded available doctor appointment slots for a department."""
        # Ensure demo slots are seeded
        self.seed_demo_slots_if_empty(db)

        query = db.query(AppointmentSlot).filter(AppointmentSlot.department_id == department_id)

        if date_filter:
            query = query.filter(func.date(AppointmentSlot.start_at) == date_filter)

        slots = query.order_by(AppointmentSlot.start_at.asc()).all()

        slot_schemas = [
            AppointmentSlotSchema(
                slot_id=s.slot_id,
                doctor_id=s.doctor_id,
                doctor_name=s.doctor_name,
                department_id=s.department_id,
                department_name=s.department_name,
                start_at=s.start_at,
                end_at=s.end_at,
                status=s.status,
                available=(s.status == "AVAILABLE"),
            )
            for s in slots
        ]

        return SlotsResponse(
            data=SlotsData(
                department_id=department_id,
                slots=slot_schemas,
            ),
            request_id=request_id,
        )

    def book_appointment(
        self,
        db: Session,
        payload: BookingRequest,
        request_id: str = "req_unknown",
    ) -> BookingResponse:
        """Atomically book an appointment slot within a database transaction."""
        encounter = (
            db.query(Encounter)
            .options(joinedload(Encounter.patient))
            .filter(Encounter.id == payload.encounter_id)
            .first()
        )
        if not encounter:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Encounter '{payload.encounter_id}' not found.",
            )

        # Scoped authorization check: Patient identity must be confirmed
        if not encounter.patient or encounter.patient.identity_status != "CONFIRMED":
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.IDENTITY_NOT_CONFIRMED,
                message="Patient identity must be confirmed before booking an appointment.",
            )

        # Check idempotency
        existing_booking = (
            db.query(Appointment)
            .filter(Appointment.idempotency_key == payload.idempotency_key)
            .first()
        )
        if existing_booking:
            if (
                existing_booking.slot_id == payload.slot_id
                and existing_booking.encounter_id == payload.encounter_id
            ):
                slot = existing_booking.slot
                slot_schema = (
                    AppointmentSlotSchema(
                        slot_id=slot.slot_id,
                        doctor_id=slot.doctor_id,
                        doctor_name=slot.doctor_name,
                        department_id=slot.department_id,
                        department_name=slot.department_name,
                        start_at=slot.start_at,
                        end_at=slot.end_at,
                        status=slot.status,
                        available=(slot.status == "AVAILABLE"),
                    )
                    if slot
                    else None
                )
                return BookingResponse(
                    data=BookingData(
                        booking_id=existing_booking.booking_id,
                        slot_id=existing_booking.slot_id,
                        start_at=slot.start_at if slot else existing_booking.created_at,
                        doctor_id=slot.doctor_id if slot else "dr_unknown",
                        status="BOOKED",
                        slot=slot_schema,
                        confirmed_at=existing_booking.created_at,
                    ),
                    request_id=request_id,
                )
            else:
                raise ClinSyncAppException(
                    status_code=409,
                    code=ErrorCode.IDEMPOTENCY_CONFLICT,
                    message=(
                        "Idempotency key has already been used with different booking parameters."
                    ),
                )

        # Retrieve slot and verify status
        slot = (
            db.query(AppointmentSlot)
            .filter(AppointmentSlot.slot_id == payload.slot_id)
            .with_for_update()
            .first()
        )
        if not slot:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Appointment slot '{payload.slot_id}' not found.",
            )

        if slot.status != "AVAILABLE":
            # Check if this slot was booked by the same idempotency key (concurrent race)
            existing_booking = (
                db.query(Appointment)
                .filter(Appointment.idempotency_key == payload.idempotency_key)
                .first()
            )
            if (
                existing_booking
                and existing_booking.slot_id == payload.slot_id
                and existing_booking.encounter_id == payload.encounter_id
            ):
                slot_schema = (
                    AppointmentSlotSchema(
                        slot_id=slot.slot_id,
                        doctor_id=slot.doctor_id,
                        doctor_name=slot.doctor_name,
                        department_id=slot.department_id,
                        department_name=slot.department_name,
                        start_at=slot.start_at,
                        end_at=slot.end_at,
                        status=slot.status,
                        available=(slot.status == "AVAILABLE"),
                    )
                    if slot
                    else None
                )
                return BookingResponse(
                    data=BookingData(
                        booking_id=existing_booking.booking_id,
                        slot_id=existing_booking.slot_id,
                        start_at=slot.start_at if slot else existing_booking.created_at,
                        doctor_id=slot.doctor_id if slot else "dr_unknown",
                        status="BOOKED",
                        slot=slot_schema,
                        confirmed_at=existing_booking.created_at,
                    ),
                    request_id=request_id,
                )
            raise ClinSyncAppException(
                status_code=409,
                code=ErrorCode.SLOT_UNAVAILABLE,
                message="The requested appointment slot is no longer available.",
            )

        # Atomic booking inside transaction
        try:
            slot.status = "BOOKED"
            booking_id = f"bkg_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)

            booking = Appointment(
                booking_id=booking_id,
                slot_id=slot.slot_id,
                encounter_id=encounter.id,
                patient_id=encounter.patient_id,
                idempotency_key=payload.idempotency_key,
                status="BOOKED",
                created_at=now,
            )
            db.add(booking)

            # Update encounter status to BOOKED and associate appointment_id
            encounter.status = "BOOKED"
            encounter.appointment_id = booking_id

            db.commit()
            db.refresh(booking)
            db.refresh(slot)
        except IntegrityError:
            db.rollback()
            # If concurrent replay with identical idempotency key raced, return idempotent result
            concurrent_booking = (
                db.query(Appointment)
                .filter(Appointment.idempotency_key == payload.idempotency_key)
                .first()
            )
            if concurrent_booking:
                if (
                    concurrent_booking.slot_id == payload.slot_id
                    and concurrent_booking.encounter_id == payload.encounter_id
                ):
                    slot = concurrent_booking.slot
                    slot_schema = (
                        AppointmentSlotSchema(
                            slot_id=slot.slot_id,
                            doctor_id=slot.doctor_id,
                            doctor_name=slot.doctor_name,
                            department_id=slot.department_id,
                            department_name=slot.department_name,
                            start_at=slot.start_at,
                            end_at=slot.end_at,
                            status=slot.status,
                            available=(slot.status == "AVAILABLE"),
                        )
                        if slot
                        else None
                    )
                    return BookingResponse(
                        data=BookingData(
                            booking_id=concurrent_booking.booking_id,
                            slot_id=concurrent_booking.slot_id,
                            start_at=slot.start_at if slot else concurrent_booking.created_at,
                            doctor_id=slot.doctor_id if slot else "dr_unknown",
                            status="BOOKED",
                            slot=slot_schema,
                            confirmed_at=concurrent_booking.created_at,
                        ),
                        request_id=request_id,
                    )
                raise ClinSyncAppException(
                    status_code=409,
                    code=ErrorCode.IDEMPOTENCY_CONFLICT,
                    message=(
                        "Idempotency key has already been used with different booking parameters."
                    ),
                ) from None
            raise ClinSyncAppException(
                status_code=409,
                code=ErrorCode.SLOT_UNAVAILABLE,
                message="The requested appointment slot is no longer available.",
            ) from None

        slot_schema = AppointmentSlotSchema(
            slot_id=slot.slot_id,
            doctor_id=slot.doctor_id,
            doctor_name=slot.doctor_name,
            department_id=slot.department_id,
            department_name=slot.department_name,
            start_at=slot.start_at,
            end_at=slot.end_at,
            status=slot.status,
            available=False,
        )

        return BookingResponse(
            data=BookingData(
                booking_id=booking.booking_id,
                slot_id=slot.slot_id,
                start_at=slot.start_at,
                doctor_id=slot.doctor_id,
                status="BOOKED",
                slot=slot_schema,
                confirmed_at=booking.created_at,
            ),
            request_id=request_id,
        )

    def seed_demo_slots_if_empty(self, db: Session) -> None:
        """Seed initial available doctor appointment slots if table is empty."""
        count = db.query(AppointmentSlot).count()
        if count > 0:
            return

        base_time = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        for seed in SEED_SLOTS:
            start_at = base_time + timedelta(hours=seed["start_offset_hours"])
            end_at = start_at + timedelta(minutes=seed["duration_minutes"])
            slot = AppointmentSlot(
                slot_id=seed["slot_id"],
                doctor_id=seed["doctor_id"],
                doctor_name=seed["doctor_name"],
                department_id=seed["department_id"],
                department_name=seed["department_name"],
                start_at=start_at,
                end_at=end_at,
                status=seed["status"],
            )
            db.add(slot)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
