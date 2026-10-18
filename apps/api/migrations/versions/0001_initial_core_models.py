"""Initial core models: patients, encounters, audit_events

Revision ID: 0001_initial_core_models
Revises:
Create Date: 2026-10-18 11:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_core_models"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # patients table
    op.create_table(
        "patients",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("contact_hint", sa.String(length=50), nullable=True),
        sa.Column("hospital_id", sa.String(length=50), nullable=False),
        sa.Column(
            "identity_status", sa.String(length=30), nullable=False, server_default="CANDIDATE"
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_patients_hospital_id"), "patients", ["hospital_id"], unique=False)

    # encounters table
    op.create_table(
        "encounters",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="IN_PROGRESS"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("intake_language", sa.String(length=10), nullable=False, server_default="en"),
        sa.Column(
            "intake_status", sa.String(length=30), nullable=False, server_default="NOT_STARTED"
        ),
        sa.Column("identity_confirmation_id", sa.String(length=36), nullable=True),
        sa.Column("assigned_department_id", sa.String(length=50), nullable=True),
        sa.Column("appointment_id", sa.String(length=36), nullable=True),
        sa.Column("created_by", sa.String(length=50), nullable=False, server_default="SYSTEM"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_encounters_patient_id"), "encounters", ["patient_id"], unique=False)

    # audit_events table
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=True),
        sa.Column("encounter_id", sa.String(length=36), nullable=True),
        sa.Column("actor_id", sa.String(length=50), nullable=False),
        sa.Column("actor_role", sa.String(length=30), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=False),
        sa.Column("resource_id", sa.String(length=50), nullable=True),
        sa.Column("previous_state", sa.Text(), nullable=True),
        sa.Column("new_state", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_audit_events_patient_id"), "audit_events", ["patient_id"], unique=False
    )
    op.create_index(
        op.f("ix_audit_events_encounter_id"), "audit_events", ["encounter_id"], unique=False
    )
    op.create_index(op.f("ix_audit_events_timestamp"), "audit_events", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_events_timestamp"), table_name="audit_events")
    op.drop_index(op.f("ix_audit_events_encounter_id"), table_name="audit_events")
    op.drop_index(op.f("ix_audit_events_patient_id"), table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_index(op.f("ix_encounters_patient_id"), table_name="encounters")
    op.drop_table("encounters")

    op.drop_index(op.f("ix_patients_hospital_id"), table_name="patients")
    op.drop_table("patients")
