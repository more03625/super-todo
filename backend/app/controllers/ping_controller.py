from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.handlers.response_handler import ResponseHandler
from app.database.session import get_db

router = APIRouter(tags=["ping"])


@router.get("/ping")
async def ping(db: AsyncSession = Depends(get_db)):
    # SELECT 1 forces a real connection so pinging this endpoint wakes a
    # paused/sleeping database (e.g. free-tier Supabase/Render/Neon).
    await db.execute(text("SELECT 1"))
    return ResponseHandler.success({"ping": "pong", "database": "ok"})
