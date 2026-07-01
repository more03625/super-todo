from fastapi import APIRouter

from app.controllers import (
    analytics_controller,
    auth_controller,
    category_controller,
    life_area_controller,
    task_controller,
)

api_router = APIRouter()
api_router.include_router(auth_controller.router)
api_router.include_router(category_controller.router)
api_router.include_router(life_area_controller.router)
api_router.include_router(task_controller.router)
api_router.include_router(analytics_controller.router)
