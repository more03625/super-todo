from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LifeArea
from app.utils.pagination import apply_pagination_query, build_pagination_meta


class LifeAreaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, life_area_id: UUID, user_id: UUID) -> LifeArea | None:
        result = await self.db.execute(
            select(LifeArea).where(LifeArea.id == life_area_id, LifeArea.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_paginated(
        self, user_id: UUID, page: int, limit: int, sort_by: str, sort_order: str, search: str | None
    ) -> tuple[list[LifeArea], dict[str, int]]:
        query = select(LifeArea)
        paginated, count_q = apply_pagination_query(
            query, LifeArea, page, limit, sort_by, sort_order, search, ["name", "description"], user_id
        )
        total = (await self.db.execute(count_q)).scalar() or 0
        items = (await self.db.execute(paginated)).scalars().all()
        return list(items), build_pagination_meta(page, limit, total)

    async def create(self, life_area: LifeArea) -> LifeArea:
        self.db.add(life_area)
        await self.db.flush()
        await self.db.refresh(life_area)
        return life_area

    async def update(self, life_area: LifeArea) -> LifeArea:
        await self.db.flush()
        await self.db.refresh(life_area)
        return life_area

    async def delete(self, life_area: LifeArea) -> None:
        await self.db.delete(life_area)

    async def count_by_user(self, user_id: UUID) -> int:
        result = await self.db.execute(select(func.count()).where(LifeArea.user_id == user_id))
        return result.scalar() or 0
