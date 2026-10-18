"""Audit event entity model for sensitive actions and clinical approvals."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, generate_uuid


class AuditEvent(Base):
    """Append-only audit log for sensitive operations and record approvals."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    patient_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    encounter_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    actor_id: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_role: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # PATIENT | DOCTOR | SYSTEM | ADMIN
    action: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g., IDENTITY_CONFIRMED, ENCOUNTER_CREATED
    resource_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # PATIENT | ENCOUNTER | APPOINTMENT | FACT
    resource_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    previous_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
