"""Patient entity model."""

from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.encounter import Encounter
    from app.models.fact import ClinicalFact


class Patient(Base, TimestampMixin):
    """Authoritative SQL record for synthetic patient."""

    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contact_hint: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    hospital_id: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True, default="HOSP-DEMO-01"
    )
    identity_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="CANDIDATE",  # CANDIDATE | CONFIRMED | UNVERIFIED
    )

    # Relationships
    encounters: Mapped[list["Encounter"]] = relationship(
        "Encounter",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    facts: Mapped[list["ClinicalFact"]] = relationship(
        "ClinicalFact",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
