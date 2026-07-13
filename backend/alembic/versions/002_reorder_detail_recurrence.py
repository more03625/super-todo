"""task reordering, my day, recurrence, task steps

Revision ID: 002
Revises: 001
Create Date: 2026-07-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

recurrenceunit = postgresql.ENUM("day", "week", "month", "year", name="recurrenceunit")


def upgrade() -> None:
    recurrenceunit.create(op.get_bind(), checkfirst=True)

    op.add_column("tasks", sa.Column("position", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("my_day_date", sa.Date(), nullable=True))
    op.add_column(
        "tasks",
        sa.Column(
            "recurrence_unit",
            postgresql.ENUM("day", "week", "month", "year", name="recurrenceunit", create_type=False),
            nullable=True,
        ),
    )
    op.add_column("tasks", sa.Column("recurrence_interval", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("recurrence_weekdays", sa.Integer(), nullable=True))
    op.create_index("ix_tasks_user_position", "tasks", ["user_id", "position"])

    op.create_table(
        "task_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_steps_task_id", "task_steps", ["task_id"])


def downgrade() -> None:
    op.drop_table("task_steps")
    op.drop_index("ix_tasks_user_position", table_name="tasks")
    op.drop_column("tasks", "recurrence_weekdays")
    op.drop_column("tasks", "recurrence_interval")
    op.drop_column("tasks", "recurrence_unit")
    op.drop_column("tasks", "my_day_date")
    op.drop_column("tasks", "position")
    recurrenceunit.drop(op.get_bind(), checkfirst=True)
