from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from uuid import UUID
from datetime import date, datetime

from app.models import TaskPriority, TaskStatus, UserRole

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# Auth
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(ORMModel):
    id: UUID
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


# Pagination
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = "created_at"
    sort_order: str = "desc"
    search: str | None = None


# Category
class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str = "folder"
    color: str = "#6366f1"
    description: str | None = None
    display_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    description: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class CategoryResponse(ORMModel):
    id: UUID
    name: str
    icon: str
    color: str
    description: str | None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Life Area
class LifeAreaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str = "star"
    color: str = "#10b981"
    description: str | None = None
    display_order: int = 0
    is_active: bool = True


class LifeAreaUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    description: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class LifeAreaResponse(ORMModel):
    id: UUID
    name: str
    icon: str
    color: str
    description: str | None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Task
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    category_id: UUID | None = None
    life_area_id: UUID | None = None
    estimated_minutes: int | None = None
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    category_id: UUID | None = None
    life_area_id: UUID | None = None
    estimated_minutes: int | None = None
    actual_minutes: int | None = None
    due_date: date | None = None
    is_archived: bool | None = None


class TaskResponse(ORMModel):
    id: UUID
    title: str
    description: str | None
    priority: TaskPriority
    status: TaskStatus
    category_id: UUID | None
    life_area_id: UUID | None
    estimated_minutes: int | None
    actual_minutes: int | None
    due_date: date | None
    completed_at: datetime | None
    is_archived: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class TaskFilterParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = "created_at"
    sort_order: str = "desc"
    search: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    category_id: UUID | None = None
    life_area_id: UUID | None = None
    include_archived: bool = False
    due_date_from: date | None = None
    due_date_to: date | None = None


# Dashboard & Analytics
class StreakResponse(ORMModel):
    current_streak: int
    longest_streak: int
    last_completion_date: date | None
    broken_count: int


class DailyScoreResponse(BaseModel):
    date: date
    score: int
    breakdown: dict | None
    tasks_completed: int
    tasks_pending: int


class HeatmapDay(BaseModel):
    date: str
    score: int
    level: int


class AchievementResponse(ORMModel):
    id: UUID
    code: str
    name: str
    description: str | None
    icon: str
    unlocked: bool = False
    unlocked_at: datetime | None = None
