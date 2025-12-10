"""add schedules table

Revision ID: 0001_add_schedules_table
Revises: 
Create Date: 2025-11-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_add_schedules_table"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "schedules",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Optional index on created_at for quick ordering queries
    op.create_index("ix_schedules_created_at", "schedules", ["created_at"])


def downgrade():
    op.drop_index("ix_schedules_created_at", table_name="schedules")
    op.drop_table("schedules")
