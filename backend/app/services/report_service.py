from datetime import date, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MonthlySummary, WeeklySummary, YearlySummary
from app.repositories.analytics_repository import AnalyticsRepository
from app.services.score_service import ScoreService


class ReportService:
    def __init__(self, db: AsyncSession):
        self.analytics_repo = AnalyticsRepository(db)
        self.score_service = ScoreService(db)
        self.db = db

    async def get_heatmap(self, user_id: UUID, months: int) -> list[dict]:
        end = date.today()
        start = end - timedelta(days=months * 30)
        summaries = await self.analytics_repo.get_daily_range(user_id, start, end)
        summary_map = {s.date: s.score for s in summaries}
        days = []
        current = start
        while current <= end:
            score = summary_map.get(current, 0)
            days.append({
                "date": current.isoformat(),
                "score": score,
                "level": ScoreService.score_to_level(score),
            })
            current += timedelta(days=1)
        return days

    async def get_weekly_report(self, user_id: UUID) -> dict:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        cached = await self.analytics_repo.get_weekly(user_id, week_start)
        if cached and cached.aggregates:
            return cached.aggregates

        summaries = await self.analytics_repo.get_daily_range(user_id, week_start, today)
        if not summaries:
            for i in range((today - week_start).days + 1):
                d = week_start + timedelta(days=i)
                await self.score_service.recalculate_for_user(user_id, d)
            summaries = await self.analytics_repo.get_daily_range(user_id, week_start, today)

        total_completed = sum(s.tasks_completed for s in summaries)
        total_pending = sum(s.tasks_pending for s in summaries)
        total = total_completed + total_pending
        avg_score = sum(s.score for s in summaries) / max(len(summaries), 1)

        best = max(summaries, key=lambda s: s.score, default=None)
        worst = min(summaries, key=lambda s: s.score, default=None)
        streak = await self.analytics_repo.get_streak(user_id)

        report = {
            "week_start": week_start.isoformat(),
            "tasks_completed": total_completed,
            "tasks_pending": total_pending,
            "completion_percent": round(total_completed / total * 100, 1) if total else 0,
            "daily_score_average": round(avg_score, 1),
            "best_day": {"date": best.date.isoformat(), "score": best.score} if best else None,
            "worst_day": {"date": worst.date.isoformat(), "score": worst.score} if worst else None,
            "longest_streak": streak.longest_streak if streak else 0,
            "daily_scores": [{"date": s.date.isoformat(), "score": s.score} for s in summaries],
        }

        await self.analytics_repo.upsert_weekly(
            WeeklySummary(user_id=user_id, week_start=week_start, aggregates=report)
        )
        return report

    async def get_monthly_report(self, user_id: UUID) -> dict:
        today = date.today()
        month_key = today.strftime("%Y-%m")
        cached = await self.analytics_repo.get_monthly(user_id, month_key)
        if cached and cached.aggregates:
            return cached.aggregates

        month_start = today.replace(day=1)
        summaries = await self.analytics_repo.get_daily_range(user_id, month_start, today)
        heatmap = await self.get_heatmap(user_id, 1)

        from app.services.achievement_service import AchievementService
        achievements = await AchievementService(self.db).list_for_user(user_id)
        unlocked = [a for a in achievements if a["unlocked"]]

        total_completed = sum(s.tasks_completed for s in summaries)
        total = total_completed + sum(s.tasks_pending for s in summaries)

        report = {
            "month": month_key,
            "tasks_completed": total_completed,
            "completion_percent": round(total_completed / total * 100, 1) if total else 0,
            "average_score": round(sum(s.score for s in summaries) / max(len(summaries), 1), 1),
            "heatmap": heatmap,
            "achievements_unlocked": len(unlocked),
            "weekly_comparison": [
                {"date": s.date.isoformat(), "score": s.score, "completed": s.tasks_completed}
                for s in summaries
            ],
        }

        await self.analytics_repo.upsert_monthly(
            MonthlySummary(user_id=user_id, month=month_key, aggregates=report)
        )
        return report

    async def get_yearly_report(self, user_id: UUID) -> dict:
        year = date.today().year
        cached = await self.analytics_repo.get_yearly(user_id, year)
        if cached and cached.aggregates:
            return cached.aggregates

        year_start = date(year, 1, 1)
        summaries = await self.analytics_repo.get_daily_range(user_id, year_start, date.today())
        heatmap = await self.get_heatmap(user_id, 12)

        from app.services.achievement_service import AchievementService
        achievements = await AchievementService(self.db).list_for_user(user_id)

        monthly_scores: dict[int, list[int]] = {}
        for s in summaries:
            monthly_scores.setdefault(s.date.month, []).append(s.score)

        best_month = max(monthly_scores.items(), key=lambda x: sum(x[1]) / len(x[1]), default=(1, [0]))
        streak = await self.analytics_repo.get_streak(user_id)

        report = {
            "year": year,
            "total_tasks": sum(s.tasks_completed + s.tasks_pending for s in summaries),
            "average_daily_score": round(sum(s.score for s in summaries) / max(len(summaries), 1), 1),
            "most_productive_month": best_month[0],
            "longest_streak": streak.longest_streak if streak else 0,
            "achievements": achievements,
            "heatmap": heatmap,
            "monthly_trend": [
                {"month": m, "average_score": round(sum(scores) / len(scores), 1)}
                for m, scores in sorted(monthly_scores.items())
            ],
        }

        await self.analytics_repo.upsert_yearly(
            YearlySummary(user_id=user_id, year=year, aggregates=report)
        )
        return report
