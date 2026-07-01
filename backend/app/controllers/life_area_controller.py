from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.handlers.response_handler import ResponseHandler
from app.common.interfaces.openapi_success_response import PaginationMeta
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas import LifeAreaCreate, LifeAreaUpdate, PaginationParams
from app.services.life_area_service import LifeAreaService

router = APIRouter(prefix="/life-areas", tags=["life-areas"])


@router.get("")
async def list_life_areas(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = "display_order",
    sort_order: str = "asc",
    search: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, limit=limit, sort_by=sort_by, sort_order=sort_order, search=search)
    items, pagination = await LifeAreaService(db).list_life_areas(user, params)
    return ResponseHandler.success_with_pagination(
        [i.model_dump() for i in items],
        PaginationMeta(**pagination),
    )


@router.get("/{life_area_id}")
async def get_life_area(life_area_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await LifeAreaService(db).get_life_area(user, life_area_id)
    return ResponseHandler.success(item.model_dump())


@router.post("")
async def create_life_area(data: LifeAreaCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await LifeAreaService(db).create_life_area(user, data)
    return ResponseHandler.created(item.model_dump())


@router.put("/{life_area_id}")
async def update_life_area(
    life_area_id: UUID, data: LifeAreaUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    item = await LifeAreaService(db).update_life_area(user, life_area_id, data)
    return ResponseHandler.updated(item.model_dump())


@router.delete("/{life_area_id}")
async def delete_life_area(life_area_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await LifeAreaService(db).delete_life_area(user, life_area_id)
    return ResponseHandler.deleted()
