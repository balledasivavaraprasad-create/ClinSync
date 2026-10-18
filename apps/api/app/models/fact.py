"""ClinicalFact entity model for Clinical Context Ledger."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, generate_uuid

if TYPE_CHECKING:
    from app.models.encounter import Encounter
    from app.models.patient import Patient


class ClinicalFact(Base):
    """Authoritative SQL record for a single clinical ledger entry."""

    __tablename__ = "clinical_facts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    patient_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("encounters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    concept: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    clinical_time: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    # symptom | medication | allergy | condition | investigation | procedure | other
    fact_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # reported | extracted_unverified | historical_recorded | doctor_confirmed
    # uncertain | conflicting | rejected
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="reported")
    # PATIENT_VOICE | PATIENT_FORM | UPLOADED_DOCUMENT | HISTORICAL_EHR | DOCTOR_INPUT
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    source_id: Mapped[str] = mapped_column(String(100), nullable=False)
    source_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    extraction_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    supersedes_fact_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="facts")
    encounter: Mapped[Optional["Encounter"]] = relationship("Encounter", back_populates="facts")
