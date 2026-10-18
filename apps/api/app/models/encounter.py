"""Encounter entity model."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.fact import ClinicalFact
    from app.models.patient import Patient


class Encounter(Base, TimestampMixin):
    """Authoritative SQL record for intake and consultation encounter."""

    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    patient_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="IN_PROGRESS",  # IN_PROGRESS | TRIAGED | BOOKED | DOCTOR_REVIEWED | COMPLETED
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    intake_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    intake_status: Mapped[str] = mapped_column(String(30), default="NOT_STARTED", nullable=False)
    identity_confirmation_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    assigned_department_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    appointment_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_by: Mapped[str] = mapped_column(String(50), default="SYSTEM", nullable=False)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="encounters")
    facts: Mapped[list["ClinicalFact"]] = relationship(
        "ClinicalFact",
        back_populates="encounter",
        cascade="all, delete-orphan",
    )
