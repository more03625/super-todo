# SuperToDo — Agent Coding Standards

**Read this file before writing any code in every session.**

## 1. Architecture Rules

- Clean Architecture: controllers → services → repositories
- Business logic **only** in services
- Database access **only** in repositories (SQLAlchemy)
- Controllers call services; services call repositories
- Never hardcode achievements or business rules in controllers

## 2. API Standards

- Always use `ResponseHandler` for success responses
- Always use `ErrorHandler` for errors — never raise unstructured exceptions in services
- All list endpoints support pagination, filtering, sorting, searching via `success_with_pagination`
- Domain error codes as string constants in `app/common/constants/error_codes.py`

## 3. Code Quality

- Python type hints on all functions; Pydantic v2 for request/response schemas
- Functions under 50 lines; files focused and single-purpose
- Dependency injection via FastAPI `Depends()`
- No TODO comments, no placeholder implementations, no mock services, no in-memory storage
- No fake/seed user task data — only system seeds (achievements, default life areas)

## 4. Database

- SQLAlchemy 2.0 models in `backend/app/models/`
- All models include `id`, `created_at`, `updated_at`
- Migrations via Alembic — review generated SQL before applying
- Indexes and FK constraints on every relation

## 5. Frontend Standards

- **Tailwind CSS v4** for all styling — no Bootstrap
- **Lucide React** for icons
- React Hook Form + Zod for all forms
- React Query for server state; optimistic updates on task completion
- Every async view must have skeleton loader + empty state + error state
- Light/dark mode via `class="dark"` on `<html>`

## 6. UI Standards

- Distinctive SaaS aesthetic: custom design tokens in `globals.css`, indigo brand palette, Inter font
- Responsive desktop-first; sidebar collapses to mobile drawer
- Subtle transitions only (150ms); avoid generic admin-template look

## 7. Tech Stack

- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, JWT, Passlib, APScheduler
- **Frontend:** Next.js 15, TypeScript, Bootstrap 5, Axios, React Query, Chart.js, Day.js
- **Database:** PostgreSQL 16

## 8. File Naming

- Backend: snake_case files and functions (`task_service.py` → `TaskService` class)
- Frontend: PascalCase components, camelCase hooks/utils
