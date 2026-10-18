"""Appointment slot and booking entity models."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.encounter import Encounter
    from app.models.patient import Patient


class AppointmentSlot(Base, TimestampMixin):
    """Authoritative SQL record for a physician appointment slot."""

    __tablename__ = "appointment_slots"

    slot_id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )
    doctor_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    doctor_name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    department_name: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )
    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    end_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="AVAILABLE",  # AVAILABLE | HOLD | BOOKED
        index=True,
    )

    # Relationships
    appointment: Mapped[Optional["Appointment"]] = relationship(
        "Appointment",
        back_populates="slot",
        uselist=False,
    )


class Appointment(Base):
    """Authoritative SQL record for a booked appointment linked to an encounter."""

    __tablename__ = "appointments"

    booking_id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=generate_uuid,
    )
    slot_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("appointment_slots.slot_id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True,
    )
    encounter_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("encounters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    patient_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="BOOKED",  # BOOKED | CANCELLED
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    slot: Mapped["AppointmentSlot"] = relationship(
        "AppointmentSlot",
        back_populates="appointment",
    )
    encounter: Mapped["Encounter"] = relationship(
        "Encounter",
        back_populates="appointment",
    )
    patient: Mapped["Patient"] = relationship(
        "Patient",
        back_populates="appointments",
    )
