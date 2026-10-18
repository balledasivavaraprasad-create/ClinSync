"""Add appointment slots and appointments tables.

Revision ID: 0004_add_appointments
Revises: 0003_add_documents
Create Date: 2026-10-18 18:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_add_appointments"
down_revision: Union[str, None] = "0003_add_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "appointment_slots",
        sa.Column("slot_id", sa.String(length=64), nullable=False),
        sa.Column("doctor_id", sa.String(length=64), nullable=False),
        sa.Column("doctor_name", sa.String(length=128), nullable=False),
        sa.Column("department_id", sa.String(length=64), nullable=False),
        sa.Column("department_name", sa.String(length=128), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="AVAILABLE",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("slot_id"),
    )
    op.create_index(
        op.f("ix_appointment_slots_department_id"),
        "appointment_slots",
        ["department_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_slots_start_at"),
        "appointment_slots",
        ["start_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_slots_status"),
        "appointment_slots",
        ["status"],
        unique=False,
    )

    op.create_table(
        "appointments",
        sa.Column("booking_id", sa.String(length=64), nullable=False),
        sa.Column("slot_id", sa.String(length=64), nullable=False),
        sa.Column("encounter_id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="BOOKED",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["slot_id"], ["appointment_slots.slot_id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("booking_id"),
        sa.UniqueConstraint("idempotency_key"),
        sa.UniqueConstraint("slot_id"),
    )
    op.create_index(
        op.f("ix_appointments_encounter_id"),
        "appointments",
        ["encounter_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointments_patient_id"),
        "appointments",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointments_slot_id"),
        "appointments",
        ["slot_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_appointments_idempotency_key"),
        "appointments",
        ["idempotency_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_appointments_idempotency_key"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_slot_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_patient_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_encounter_id"), table_name="appointments")
    op.drop_table("appointments")

    op.drop_index(op.f("ix_appointment_slots_status"), table_name="appointment_slots")
    op.drop_index(op.f("ix_appointment_slots_start_at"), table_name="appointment_slots")
    op.drop_index(op.f("ix_appointment_slots_department_id"), table_name="appointment_slots")
    op.drop_table("appointment_slots")
