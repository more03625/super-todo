from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.constants import error_codes as EC
from app.common.handlers.error_handler import ErrorHandler
from app.models import Category, User
from app.repositories.category_repository import CategoryRepository
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate, PaginationParams


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.repo = CategoryRepository(db)

    async def list_categories(self, user: User, params: PaginationParams) -> tuple[list[CategoryResponse], dict]:
        items, pagination = await self.repo.list_paginated(
            user.id, params.page, params.limit, params.sort_by, params.sort_order, params.search
        )
        return [CategoryResponse.model_validate(c) for c in items], pagination

    async def get_category(self, user: User, category_id: UUID) -> CategoryResponse:
        category = await self.repo.get_by_id(category_id, user.id)
        if not category:
            ErrorHandler.not_found({"code": EC.CATEGORY_NOT_FOUND, "message": "Category not found"})
        return CategoryResponse.model_validate(category)

    async def create_category(self, user: User, data: CategoryCreate) -> CategoryResponse:
        category = Category(user_id=user.id, **data.model_dump())
        created = await self.repo.create(category)
        return CategoryResponse.model_validate(created)

    async def update_category(self, user: User, category_id: UUID, data: CategoryUpdate) -> CategoryResponse:
        category = await self.repo.get_by_id(category_id, user.id)
        if not category:
            ErrorHandler.not_found({"code": EC.CATEGORY_NOT_FOUND, "message": "Category not found"})
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(category, key, value)
        updated = await self.repo.update(category)
        return CategoryResponse.model_validate(updated)

    async def delete_category(self, user: User, category_id: UUID) -> None:
        category = await self.repo.get_by_id(category_id, user.id)
        if not category:
            ErrorHandler.not_found({"code": EC.CATEGORY_NOT_FOUND, "message": "Category not found"})
        await self.repo.delete(category)
