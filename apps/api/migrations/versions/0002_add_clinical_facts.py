"""Add clinical_facts table for Clinical Context Ledger.

Revision ID: 0002_add_clinical_facts
Revises: 0001_initial_core_models
Create Date: 2026-10-18 12:15:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_add_clinical_facts"
down_revision: Union[str, None] = "0001_initial_core_models"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clinical_facts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("encounter_id", sa.String(length=36), nullable=True),
        sa.Column("concept", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("clinical_time", sa.String(length=100), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fact_type", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="reported"),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_id", sa.String(length=100), nullable=False),
        sa.Column("source_location", sa.String(length=100), nullable=True),
        sa.Column("extraction_method", sa.String(length=50), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("reviewed_by", sa.String(length=50), nullable=True),
        sa.Column("supersedes_fact_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_clinical_facts_patient_id"), "clinical_facts", ["patient_id"], unique=False
    )
    op.create_index(
        op.f("ix_clinical_facts_encounter_id"), "clinical_facts", ["encounter_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_clinical_facts_encounter_id"), table_name="clinical_facts")
    op.drop_index(op.f("ix_clinical_facts_patient_id"), table_name="clinical_facts")
    op.drop_table("clinical_facts")
