from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category
from app.utils.pagination import apply_pagination_query, build_pagination_meta


class CategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, category_id: UUID, user_id: UUID) -> Category | None:
        result = await self.db.execute(
            select(Category).where(Category.id == category_id, Category.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_paginated(
        self, user_id: UUID, page: int, limit: int, sort_by: str, sort_order: str, search: str | None
    ) -> tuple[list[Category], dict[str, int]]:
        query = select(Category)
        paginated, count_q = apply_pagination_query(
            query, Category, page, limit, sort_by, sort_order, search, ["name", "description"], user_id
        )
        total = (await self.db.execute(count_q)).scalar() or 0
        items = (await self.db.execute(paginated)).scalars().all()
        return list(items), build_pagination_meta(page, limit, total)

    async def create(self, category: Category) -> Category:
        self.db.add(category)
        await self.db.flush()
        await self.db.refresh(category)
        return category

    async def update(self, category: Category) -> Category:
        await self.db.flush()
        await self.db.refresh(category)
        return category

    async def delete(self, category: Category) -> None:
        await self.db.delete(category)

    async def count_by_user(self, user_id: UUID) -> int:
        result = await self.db.execute(select(func.count()).where(Category.user_id == user_id))
        return result.scalar() or 0
