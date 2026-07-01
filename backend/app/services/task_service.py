from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.constants import error_codes as EC
from app.common.handlers.error_handler import ErrorHandler
from app.models import Task, TaskEvent, TaskStatus, User
from app.repositories.task_repository import TaskRepository
from app.schemas import TaskCreate, TaskFilterParams, TaskResponse, TaskUpdate
from app.services.achievement_service import AchievementService
from app.services.score_service import ScoreService


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
            await self.score_service.recalculate_for_user(user.id)
            await self.achievement_service.evaluate(user.id, {"type": "task_completed"})

        updated = await self.repo.update(task)
        return TaskResponse.model_validate(updated)

    async def delete_task(self, user: User, task_id: UUID) -> None:
        task = await self.repo.get_by_id(task_id, user.id)
        if not task:
            ErrorHandler.not_found({"code": EC.TASK_NOT_FOUND, "message": "Task not found"})
        await self.repo.soft_delete(task)
