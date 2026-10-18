"""Document entity model for safe uploaded document metadata."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.encounter import Encounter
    from app.models.patient import Patient


class Document(Base, TimestampMixin):
    """Authoritative SQL record for uploaded medical document metadata."""

    __tablename__ = "documents"

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
    encounter_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("encounters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename_display: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    # UPLOADED | PROCESSING | EXTRACTED | FAILED
    processing_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="UPLOADED",
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="documents")
    encounter: Mapped["Encounter"] = relationship("Encounter", back_populates="documents")
