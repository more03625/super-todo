from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.handlers.response_handler import ResponseHandler
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.services.achievement_service import AchievementService
from app.services.dashboard_service import DashboardService
from app.services.report_service import ReportService
from app.repositories.analytics_repository import AnalyticsRepository

router = APIRouter(tags=["analytics"])


@router.get("/dashboard")
async def dashboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await DashboardService(db).get_dashboard(user.id)
    return ResponseHandler.success(data)


@router.get("/heatmap")
async def heatmap(
    range: str = Query("1m", pattern="^(1m|3m|6m|1y)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    months_map = {"1m": 1, "3m": 3, "6m": 6, "1y": 12}
    data = await ReportService(db).get_heatmap(user.id, months_map[range])
    return ResponseHandler.success(data)


@router.get("/reports/weekly")
async def weekly_report(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await ReportService(db).get_weekly_report(user.id)
    return ResponseHandler.success(data)


@router.get("/reports/monthly")
async def monthly_report(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await ReportService(db).get_monthly_report(user.id)
    return ResponseHandler.success(data)


@router.get("/reports/yearly")
async def yearly_report(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await ReportService(db).get_yearly_report(user.id)
    return ResponseHandler.success(data)


@router.get("/achievements")
async def achievements(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await AchievementService(db).list_for_user(user.id)
    return ResponseHandler.success(data)


@router.get("/streaks")
async def streaks(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    streak = await AnalyticsRepository(db).get_streak(user.id)
    if not streak:
        return ResponseHandler.success({
            "current_streak": 0, "longest_streak": 0,
            "last_completion_date": None, "broken_count": 0,
        })
    return ResponseHandler.success({
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_completion_date": streak.last_completion_date.isoformat() if streak.last_completion_date else None,
        "broken_count": streak.broken_count,
    })
