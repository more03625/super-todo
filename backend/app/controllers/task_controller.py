from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.handlers.response_handler import ResponseHandler
from app.common.interfaces.openapi_success_response import PaginationMeta
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import TaskPriority, TaskStatus, User
from app.schemas import TaskCreate, TaskFilterParams, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
async def list_tasks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: str | None = None,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    category_id: UUID | None = None,
    life_area_id: UUID | None = None,
    include_archived: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = TaskFilterParams(
        page=page, limit=limit, sort_by=sort_by, sort_order=sort_order, search=search,
        status=status, priority=priority, category_id=category_id, life_area_id=life_area_id,
        include_archived=include_archived,
    )
    items, pagination = await TaskService(db).list_tasks(user, params)
    return ResponseHandler.success_with_pagination(
        [i.model_dump(mode="json") for i in items],
        PaginationMeta(**pagination),
    )


@router.get("/{task_id}")
async def get_task(task_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await TaskService(db).get_task(user, task_id)
    return ResponseHandler.success(item.model_dump(mode="json"))


@router.post("")
async def create_task(data: TaskCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await TaskService(db).create_task(user, data)
    return ResponseHandler.created(item.model_dump(mode="json"))


@router.put("/{task_id}")
async def update_task(
    task_id: UUID, data: TaskUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    item = await TaskService(db).update_task(user, task_id, data)
    return ResponseHandler.updated(item.model_dump(mode="json"))


@router.delete("/{task_id}")
async def delete_task(task_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await TaskService(db).delete_task(user, task_id)
    return ResponseHandler.deleted()
