"""Add documents table for safe storage and metadata tracking.

Revision ID: 0003_add_documents
Revises: 0002_add_clinical_facts
Create Date: 2026-10-18 13:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_add_documents"
down_revision: Union[str, None] = "0002_add_clinical_facts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("encounter_id", sa.String(length=36), nullable=False),
        sa.Column("filename_display", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column(
            "processing_status",
            sa.String(length=30),
            nullable=False,
            server_default="UPLOADED",
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_documents_patient_id"), "documents", ["patient_id"], unique=False)
    op.create_index(op.f("ix_documents_encounter_id"), "documents", ["encounter_id"], unique=False)
    op.create_index(
        op.f("ix_documents_checksum_sha256"),
        "documents",
        ["checksum_sha256"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_documents_checksum_sha256"), table_name="documents")
    op.drop_index(op.f("ix_documents_encounter_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_patient_id"), table_name="documents")
    op.drop_table("documents")
