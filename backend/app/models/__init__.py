import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RecurrenceUnit(str, enum.Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


def _pg_enum(enum_class: type[enum.Enum], pg_name: str) -> Enum:
    """Map Python enums to PostgreSQL enum values (lowercase), not member names."""
    return Enum(
        enum_class,
        values_callable=lambda members: [m.value for m in members],
        name=pg_name,
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(_pg_enum(UserRole, "userrole"), default=UserRole.USER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    categories: Mapped[list["Category"]] = relationship(back_populates="user")
    life_areas: Mapped[list["LifeArea"]] = relationship(back_populates="user")
    tasks: Mapped[list["Task"]] = relationship(back_populates="user")
    streak: Mapped["Streak | None"] = relationship(back_populates="user", uselist=False)


class Category(TimestampMixin, Base):
    __tablename__ = "categories"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="folder")
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    description: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship(back_populates="categories")
    tasks: Mapped[list["Task"]] = relationship(back_populates="category")

    __table_args__ = (Index("ix_categories_user_id", "user_id"),)


class LifeArea(TimestampMixin, Base):
    __tablename__ = "life_areas"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="star")
    color: Mapped[str] = mapped_column(String(7), default="#10b981")
    description: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship(back_populates="life_areas")
    tasks: Mapped[list["Task"]] = relationship(back_populates="life_area")

    __table_args__ = (Index("ix_life_areas_user_id", "user_id"),)


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"))
    life_area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("life_areas.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[TaskPriority] = mapped_column(_pg_enum(TaskPriority, "taskpriority"), default=TaskPriority.MEDIUM)
    status: Mapped[TaskStatus] = mapped_column(_pg_enum(TaskStatus, "taskstatus"), default=TaskStatus.PENDING)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    actual_minutes: Mapped[int | None] = mapped_column(Integer)
    due_date: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int | None] = mapped_column(Integer)
    my_day_date: Mapped[date | None] = mapped_column(Date)
    recurrence_unit: Mapped[RecurrenceUnit | None] = mapped_column(_pg_enum(RecurrenceUnit, "recurrenceunit"))
    recurrence_interval: Mapped[int | None] = mapped_column(Integer)
    # Bitmask of weekdays for weekly recurrence: bit 0 = Monday ... bit 6 = Sunday
    recurrence_weekdays: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship(back_populates="tasks")
    category: Mapped["Category | None"] = relationship(back_populates="tasks")
    life_area: Mapped["LifeArea | None"] = relationship(back_populates="tasks")
    events: Mapped[list["TaskEvent"]] = relationship(back_populates="task")
    steps: Mapped[list["TaskStep"]] = relationship(back_populates="task", order_by="TaskStep.position")

    __table_args__ = (
        Index("ix_tasks_user_id_status", "user_id", "status"),
        Index("ix_tasks_user_id", "user_id"),
        Index("ix_tasks_user_position", "user_id", "position"),
    )


class TaskStep(TimestampMixin, Base):
    __tablename__ = "task_steps"

    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    task: Mapped["Task"] = relationship(back_populates="steps")

    __table_args__ = (Index("ix_task_steps_task_id", "task_id"),)


class TaskEvent(TimestampMixin, Base):
    __tablename__ = "task_events"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)

    task: Mapped["Task"] = relationship(back_populates="events")


class DailySummary(TimestampMixin, Base):
    __tablename__ = "daily_summary"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0)
    breakdown: Mapped[dict | None] = mapped_column(JSONB)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    tasks_pending: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_daily_summary_user_date"),
        Index("ix_daily_summary_user_date", "user_id", "date"),
    )


class WeeklySummary(TimestampMixin, Base):
    __tablename__ = "weekly_summary"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    aggregates: Mapped[dict | None] = mapped_column(JSONB)

    __table_args__ = (Index("ix_weekly_summary_user_week", "user_id", "week_start"),)


class MonthlySummary(TimestampMixin, Base):
    __tablename__ = "monthly_summary"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    month: Mapped[str] = mapped_column(String(7), nullable=False)
    aggregates: Mapped[dict | None] = mapped_column(JSONB)

    __table_args__ = (Index("ix_monthly_summary_user_month", "user_id", "month"),)


class YearlySummary(TimestampMixin, Base):
    __tablename__ = "yearly_summary"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    aggregates: Mapped[dict | None] = mapped_column(JSONB)

    __table_args__ = (Index("ix_yearly_summary_user_year", "user_id", "year"),)


class Achievement(TimestampMixin, Base):
    __tablename__ = "achievements"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str] = mapped_column(String(50), default="trophy")
    rule_definition: Mapped[dict] = mapped_column(JSONB, nullable=False)


class UserAchievement(TimestampMixin, Base):
    __tablename__ = "user_achievements"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    achievement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("achievements.id"), nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),)


class Streak(TimestampMixin, Base):
    __tablename__ = "streaks"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_completion_date: Mapped[date | None] = mapped_column(Date)
    broken_count: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(back_populates="streak")


class DashboardSummary(TimestampMixin, Base):
    __tablename__ = "dashboard_summary"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    cached_data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    __table_args__ = (Index("ix_dashboard_summary_user_date", "user_id", "snapshot_date"),)
