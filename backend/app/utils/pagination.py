from math import ceil
from typing import Any
from uuid import UUID

from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


def apply_pagination_query(
    query: Select[Any],
    model: Any,
    page: int,
    limit: int,
    sort_by: str,
    sort_order: str,
    search: str | None,
    search_fields: list[str],
    user_id: UUID | None = None,
    user_field: str = "user_id",
    extra_filters: dict[str, Any] | None = None,
) -> tuple[Select[Any], Select[Any]]:
    if user_id is not None:
        query = query.where(getattr(model, user_field) == user_id)

    if extra_filters:
        for key, value in extra_filters.items():
            if value is not None and hasattr(model, key):
                query = query.where(getattr(model, key) == value)

    if search and search_fields:
        clauses = [getattr(model, f).ilike(f"%{search}%") for f in search_fields if hasattr(model, f)]
        if clauses:
            query = query.where(or_(*clauses))

    sort_col = getattr(model, sort_by, model.created_at)
    query = query.order_by(desc(sort_col) if sort_order == "desc" else asc(sort_col))

    count_query = select(func.count()).select_from(query.subquery())
    offset = (page - 1) * limit
    paginated = query.offset(offset).limit(limit)
    return paginated, count_query


def build_pagination_meta(page: int, limit: int, total: int) -> dict[str, int]:
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": ceil(total / limit) if total > 0 else 0,
    }
