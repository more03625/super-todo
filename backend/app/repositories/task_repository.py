from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import Date, and_, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Task, TaskEvent, TaskStatus, TaskStep
from app.utils.pagination import apply_pagination_query, build_pagination_meta


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, task_id: UUID, user_id: UUID) -> Task | None:
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        user_id: UUID,
        page: int,
        limit: int,
        sort_by: str,
        sort_order: str,
        search: str | None,
        status: TaskStatus | None = None,
        priority: str | None = None,
        category_id: UUID | None = None,
        life_area_id: UUID | None = None,
        include_archived: bool = False,
        due_date_from: date | None = None,
        due_date_to: date | None = None,
        my_day_date: date | None = None,
    ) -> tuple[list[Task], dict[str, int]]:
        query = select(Task).where(Task.is_deleted.is_(False))
        extra = {"status": status, "priority": priority, "category_id": category_id, "life_area_id": life_area_id}
        if not include_archived:
            extra["is_archived"] = False
        if my_day_date is not None:
            extra["my_day_date"] = my_day_date

        if due_date_from is not None and due_date_to is not None:
            query = query.where(
                or_(
                    # Task span [creation day, due date] overlaps the range —
                    # the client shows a dated task on every day until it's due.
                    and_(
                        Task.due_date.is_not(None),
                        Task.due_date >= due_date_from,
                        cast(Task.created_at, Date) <= due_date_to,
                    ),
                    and_(
                        Task.due_date.is_(None),
                        cast(Task.created_at, Date) >= due_date_from,
                        cast(Task.created_at, Date) <= due_date_to,
                    ),
                    # Recurring tasks project future occurrences client-side,
                    # so any visible range may need them.
                    Task.recurrence_unit.is_not(None),
                    # Pinned to My Day on a day inside the range.
                    and_(Task.my_day_date >= due_date_from, Task.my_day_date <= due_date_to),
                )
            )

        paginated, count_q = apply_pagination_query(
            query, Task, page, limit, sort_by, sort_order, search, ["title", "description"], user_id, extra_filters=extra
        )
        total = (await self.db.execute(count_q)).scalar() or 0
        items = (await self.db.execute(paginated)).scalars().all()
        return list(items), build_pagination_meta(page, limit, total)

    async def create(self, task: Task) -> Task:
        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def update(self, task: Task) -> Task:
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def soft_delete(self, task: Task) -> Task:
        task.is_deleted = True
        return await self.update(task)

    async def get_by_ids(self, task_ids: list[UUID], user_id: UUID) -> list[Task]:
        result = await self.db.execute(
            select(Task).where(Task.id.in_(task_ids), Task.user_id == user_id, Task.is_deleted.is_(False))
        )
        return list(result.scalars().all())

    async def list_steps(self, task_id: UUID) -> list[TaskStep]:
        result = await self.db.execute(
            select(TaskStep).where(TaskStep.task_id == task_id).order_by(TaskStep.position, TaskStep.created_at)
        )
        return list(result.scalars().all())

    async def get_step(self, step_id: UUID, task_id: UUID) -> TaskStep | None:
        result = await self.db.execute(
            select(TaskStep).where(TaskStep.id == step_id, TaskStep.task_id == task_id)
        )
        return result.scalar_one_or_none()

    async def max_step_position(self, task_id: UUID) -> int:
        result = await self.db.execute(
            select(func.max(TaskStep.position)).where(TaskStep.task_id == task_id)
        )
        max_pos = result.scalar()
        return max_pos if max_pos is not None else -1

    async def create_step(self, step: TaskStep) -> TaskStep:
        self.db.add(step)
        await self.db.flush()
        await self.db.refresh(step)
        return step

    async def update_step(self, step: TaskStep) -> TaskStep:
        await self.db.flush()
        await self.db.refresh(step)
        return step

    async def delete_step(self, step: TaskStep) -> None:
        await self.db.delete(step)
        await self.db.flush()

    async def log_event(self, event: TaskEvent) -> None:
        self.db.add(event)
        await self.db.flush()

    async def count_completed(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(Task.user_id == user_id, Task.status == TaskStatus.COMPLETED, Task.is_deleted.is_(False))
        )
        return result.scalar() or 0

    async def get_today_tasks(self, user_id: UUID, today_start: datetime) -> list[Task]:
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.is_deleted.is_(False),
                Task.is_archived.is_(False),
                Task.created_at >= today_start,
            ).order_by(Task.created_at.desc()).limit(20)
        )
        return list(result.scalars().all())

    async def get_recent_events(self, user_id: UUID, limit: int = 10) -> list[TaskEvent]:
        result = await self.db.execute(
            select(TaskEvent).where(TaskEvent.user_id == user_id).order_by(TaskEvent.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())
