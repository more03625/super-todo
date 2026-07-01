from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class RateLimitMeta(BaseModel):
    limit: int
    remaining: int
    reset_time: str | None = None


class ResponseMetadata(BaseModel):
    remaining_attempts: int | None = None
    cooldown_period: int | None = None
    rate_limit: RateLimitMeta | None = None


class OpenApiSuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    status_code: int = 200
    message: str = "Operation completed successfully"
    data: T
    metadata: ResponseMetadata | None = None


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    pagination: PaginationMeta
