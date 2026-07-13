from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.constants import error_codes as EC
from app.common.handlers.error_handler import ErrorHandler
from app.models import Task, TaskEvent, TaskStatus, TaskStep, User
from app.repositories.task_repository import TaskRepository
from app.schemas import (
    TaskCreate,
    TaskFilterParams,
    TaskResponse,
    TaskStepCreate,
    TaskStepResponse,
    TaskStepUpdate,
    TaskUpdate,
)
from app.services.achievement_service import AchievementService
from app.services.score_service import ScoreService
from app.utils.recurrence import next_due_date


class TaskService:
    def __init__(self, db: AsyncSession):
        self.repo = TaskRepository(db)
        self.db = db
        self.score_service = ScoreService(db)
        self.achievement_service = AchievementService(db)

    async def list_tasks(self, user: User, params: TaskFilterParams) -> tuple[list[TaskResponse], dict]:
        items, pagination = await self.repo.list_paginated(
            user.id,
            params.page,
            params.limit,
            params.sort_by,
            params.sort_order,
            params.search,
            params.status,
            params.priority.value if params.priority else None,
            params.category_id,
            params.life_area_id,
            params.include_archived,
            params.due_date_from,
            params.due_date_to,
            params.my_day_date,
        )
        return [TaskResponse.model_validate(t) for t in items], pagination

    async def get_task(self, user: User, task_id: UUID) -> TaskResponse:
        task = await self.repo.get_by_id(task_id, user.id)
        if not task:
            ErrorHandler.not_found({"code": EC.TASK_NOT_FOUND, "message": "Task not found"})
        return TaskResponse.model_validate(task)

    async def create_task(self, user: User, data: TaskCreate) -> TaskResponse:
        task = Task(user_id=user.id, **data.model_dump())
        created = await self.repo.create(task)
        await self.repo.log_event(
            TaskEvent(user_id=user.id, task_id=created.id, event_type="created", metadata_={"title": created.title})
        )
        await self.achievement_service.evaluate(user.id, {"type": "task_created"})
        return TaskResponse.model_validate(created)

    async def update_task(self, user: User, task_id: UUID, data: TaskUpdate) -> TaskResponse:
        task = await self.repo.get_by_id(task_id, user.id)
        if not task:
            ErrorHandler.not_found({"code": EC.TASK_NOT_FOUND, "message": "Task not found"})

        old_status = task.status
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(task, key, value)

        if data.status == TaskStatus.COMPLETED and old_status != TaskStatus.COMPLETED:
            task.completed_at = datetime.now(timezone.utc)
            await self.repo.log_event(
                TaskEvent(user_id=user.id, task_id=task.id, event_type="completed", metadata_={})
            )
            if task.recurrence_unit is not None:
                await self._spawn_next_occurrence(user, task)
            await self.score_service.recalculate_for_user(user.id)
            await self.achievement_service.evaluate(user.id, {"type": "task_completed"})

        updated = await self.repo.update(task)
        return TaskResponse.model_validate(updated)

    async def _spawn_next_occurrence(self, user: User, task: Task) -> None:
        base = task.due_date or datetime.now(timezone.utc).date()
        next_due = next_due_date(base, task.recurrence_unit, task.recurrence_interval, task.recurrence_weekdays)
        next_task = Task(
            user_id=user.id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            category_id=task.category_id,
            life_area_id=task.life_area_id,
            estimated_minutes=task.estimated_minutes,
            due_date=next_due,
            status=TaskStatus.PENDING,
            recurrence_unit=task.recurrence_unit,
            recurrence_interval=task.recurrence_interval,
            recurrence_weekdays=task.recurrence_weekdays,
        )
        created = await self.repo.create(next_task)
        # The completed row keeps its history but stops recurring, so
        # un-completing and re-completing it cannot spawn duplicates.
        task.recurrence_unit = None
        task.recurrence_interval = None
        task.recurrence_weekdays = None
        await self.repo.log_event(
            TaskEvent(
                user_id=user.id,
                task_id=task.id,
                event_type="recurrence_spawned",
                metadata_={"next_task_id": str(created.id), "next_due_date": next_due.isoformat()},
            )
        )

    async def reorder_tasks(self, user: User, task_ids: list[UUID]) -> None:
        tasks = await self.repo.get_by_ids(task_ids, user.id)
        by_id = {t.id: t for t in tasks}
        missing = [tid for tid in task_ids if tid not in by_id]
        if missing:
            ErrorHandler.not_found({"code": EC.TASK_NOT_FOUND, "message": "Task not found"})
        for index, tid in enumerate(task_ids):
            by_id[tid].position = index
        await self.db.flush()

    async def delete_task(self, user: User, task_id: UUID) -> None:
        task = await self.repo.get_by_id(task_id, user.id)
        if not task:
            ErrorHandler.not_found({"code": EC.TASK_NOT_FOUND, "message": "Task not found"})
        await self.repo.soft_delete(task)

    async def _get_owned_task(self, user: User, task_id: UUID) -> Task:
        task = await self.repo.get_by_id(task_id, user.id)
        if not task:
            ErrorHandler.not_found({"code": EC.TASK_NOT_FOUND, "message": "Task not found"})
        return task

    async def list_steps(self, user: User, task_id: UUID) -> list[TaskStepResponse]:
        await self._get_owned_task(user, task_id)
        steps = await self.repo.list_steps(task_id)
        return [TaskStepResponse.model_validate(s) for s in steps]

    async def create_step(self, user: User, task_id: UUID, data: TaskStepCreate) -> TaskStepResponse:
        await self._get_owned_task(user, task_id)
        max_pos = await self.repo.max_step_position(task_id)
        step = TaskStep(task_id=task_id, title=data.title, position=max_pos + 1)
        created = await self.repo.create_step(step)
        return TaskStepResponse.model_validate(created)

    async def update_step(self, user: User, task_id: UUID, step_id: UUID, data: TaskStepUpdate) -> TaskStepResponse:
        await self._get_owned_task(user, task_id)
        step = await self.repo.get_step(step_id, task_id)
        if not step:
            ErrorHandler.not_found({"code": EC.TASK_STEP_NOT_FOUND, "message": "Task step not found"})
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(step, key, value)
        updated = await self.repo.update_step(step)
        return TaskStepResponse.model_validate(updated)

    async def delete_step(self, user: User, task_id: UUID, step_id: UUID) -> None:
        await self._get_owned_task(user, task_id)
        step = await self.repo.get_step(step_id, task_id)
        if not step:
            ErrorHandler.not_found({"code": EC.TASK_STEP_NOT_FOUND, "message": "Task step not found"})
        await self.repo.delete_step(step)
