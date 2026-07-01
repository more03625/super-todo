from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.constants import error_codes as EC
from app.common.handlers.error_handler import ErrorHandler
from app.models import LifeArea, User
from app.repositories.life_area_repository import LifeAreaRepository
from app.schemas import LifeAreaCreate, LifeAreaResponse, LifeAreaUpdate, PaginationParams


class LifeAreaService:
    def __init__(self, db: AsyncSession):
        self.repo = LifeAreaRepository(db)

    async def list_life_areas(self, user: User, params: PaginationParams) -> tuple[list[LifeAreaResponse], dict]:
        items, pagination = await self.repo.list_paginated(
            user.id, params.page, params.limit, params.sort_by, params.sort_order, params.search
        )
        return [LifeAreaResponse.model_validate(la) for la in items], pagination

    async def get_life_area(self, user: User, life_area_id: UUID) -> LifeAreaResponse:
        life_area = await self.repo.get_by_id(life_area_id, user.id)
        if not life_area:
            ErrorHandler.not_found({"code": EC.LIFE_AREA_NOT_FOUND, "message": "Life area not found"})
        return LifeAreaResponse.model_validate(life_area)

    async def create_life_area(self, user: User, data: LifeAreaCreate) -> LifeAreaResponse:
        life_area = LifeArea(user_id=user.id, **data.model_dump())
        created = await self.repo.create(life_area)
        return LifeAreaResponse.model_validate(created)

    async def update_life_area(self, user: User, life_area_id: UUID, data: LifeAreaUpdate) -> LifeAreaResponse:
        life_area = await self.repo.get_by_id(life_area_id, user.id)
        if not life_area:
            ErrorHandler.not_found({"code": EC.LIFE_AREA_NOT_FOUND, "message": "Life area not found"})
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(life_area, key, value)
        updated = await self.repo.update(life_area)
        return LifeAreaResponse.model_validate(updated)

    async def delete_life_area(self, user: User, life_area_id: UUID) -> None:
        life_area = await self.repo.get_by_id(life_area_id, user.id)
        if not life_area:
            ErrorHandler.not_found({"code": EC.LIFE_AREA_NOT_FOUND, "message": "Life area not found"})
        await self.repo.delete(life_area)
