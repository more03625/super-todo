from fastapi import APIRouter

from app.common.handlers.response_handler import ResponseHandler

router = APIRouter(tags=["ping"])


@router.get("/ping")
async def ping():
    return ResponseHandler.success({"message": "pong"})
