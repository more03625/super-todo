from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.handlers.response_handler import ResponseHandler
from app.common.interfaces.openapi_success_response import PaginationMeta
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas import CategoryCreate, CategoryUpdate, PaginationParams
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def list_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = "display_order",
    sort_order: str = "asc",
    search: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, limit=limit, sort_by=sort_by, sort_order=sort_order, search=search)
    items, pagination = await CategoryService(db).list_categories(user, params)
    return ResponseHandler.success_with_pagination(
        [i.model_dump() for i in items],
        PaginationMeta(**pagination),
    )


@router.get("/{category_id}")
async def get_category(category_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await CategoryService(db).get_category(user, category_id)
    return ResponseHandler.success(item.model_dump())


@router.post("")
async def create_category(data: CategoryCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await CategoryService(db).create_category(user, data)
    return ResponseHandler.created(item.model_dump())


@router.put("/{category_id}")
async def update_category(
    category_id: UUID, data: CategoryUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    item = await CategoryService(db).update_category(user, category_id, data)
    return ResponseHandler.updated(item.model_dump())


@router.delete("/{category_id}")
async def delete_category(category_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await CategoryService(db).delete_category(user, category_id)
    return ResponseHandler.deleted()
