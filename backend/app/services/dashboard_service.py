from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, DashboardSummary, LifeArea, Task, TaskStatus
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.task_repository import TaskRepository
from app.services.score_service import ScoreService


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.analytics_repo = AnalyticsRepository(db)
        self.task_repo = TaskRepository(db)
        self.score_service = ScoreService(db)

    async def get_dashboard(self, user_id: UUID) -> dict:
        today = date.today()
        cached = await self.analytics_repo.get_dashboard(user_id, today)
        if cached:
            return cached.cached_data

        daily = await self.analytics_repo.get_daily(user_id, today)
        if not daily:
            daily = await self.score_service.recalculate_for_user(user_id, today)

        streak = await self.analytics_repo.get_streak(user_id)
        today_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
        today_tasks = await self.task_repo.get_today_tasks(user_id, today_start)
        recent_events = await self.task_repo.get_recent_events(user_id)

        completed_today = sum(1 for t in today_tasks if t.status == TaskStatus.COMPLETED)
        pending_today = len(today_tasks) - completed_today

        cat_result = await self.db.execute(
            select(Category.name, Category.color, func.count(Task.id))
            .outerjoin(Task, Task.category_id == Category.id)
            .where(Category.user_id == user_id, Task.is_deleted.is_(False))
            .group_by(Category.id, Category.name, Category.color)
        )
        category_distribution = [{"name": r[0], "color": r[1], "count": r[2]} for r in cat_result.all()]

        la_result = await self.db.execute(
            select(LifeArea.name, LifeArea.color, func.count(Task.id))
            .outerjoin(Task, Task.life_area_id == LifeArea.id)
            .where(LifeArea.user_id == user_id, Task.is_deleted.is_(False))
            .group_by(LifeArea.id, LifeArea.name, LifeArea.color)
        )
        life_area_distribution = [{"name": r[0], "color": r[1], "count": r[2]} for r in la_result.all()]

        week_start = today - timedelta(days=today.weekday())
        week_summaries = await self.analytics_repo.get_daily_range(user_id, week_start, today)
        weekly_progress = sum(s.score for s in week_summaries) / max(len(week_summaries), 1)

        month_start = today.replace(day=1)
        month_summaries = await self.analytics_repo.get_daily_range(user_id, month_start, today)
        monthly_progress = sum(s.score for s in month_summaries) / max(len(month_summaries), 1)

        from app.services.achievement_service import AchievementService
        achievements = await AchievementService(self.db).list_for_user(user_id)
        achievement_count = sum(1 for a in achievements if a["unlocked"])

        data = {
            "today_score": daily.score,
            "score_breakdown": daily.breakdown,
            "tasks_completed_today": completed_today,
            "tasks_pending_today": pending_today,
            "current_streak": streak.current_streak if streak else 0,
            "longest_streak": streak.longest_streak if streak else 0,
            "weekly_progress": round(weekly_progress, 1),
            "monthly_progress": round(monthly_progress, 1),
            "achievement_count": achievement_count,
            "today_tasks": [
                {"id": str(t.id), "title": t.title, "status": t.status.value, "priority": t.priority.value}
                for t in today_tasks
            ],
            "recent_activity": [
                {"id": str(e.id), "event_type": e.event_type, "created_at": e.created_at.isoformat()}
                for e in recent_events
            ],
            "category_distribution": category_distribution,
            "life_area_distribution": life_area_distribution,
        }

        await self.analytics_repo.upsert_dashboard(
            DashboardSummary(user_id=user_id, snapshot_date=today, cached_data=data)
        )
        return data
