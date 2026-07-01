from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailySummary, DashboardSummary, Streak, WeeklySummary, MonthlySummary, YearlySummary


class AnalyticsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_daily(self, user_id: UUID, target_date: date) -> DailySummary | None:
        result = await self.db.execute(
            select(DailySummary).where(DailySummary.user_id == user_id, DailySummary.date == target_date)
        )
        return result.scalar_one_or_none()

    async def upsert_daily(self, summary: DailySummary) -> DailySummary:
        existing = await self.get_daily(summary.user_id, summary.date)
        if existing:
            existing.score = summary.score
            existing.breakdown = summary.breakdown
            existing.tasks_completed = summary.tasks_completed
            existing.tasks_pending = summary.tasks_pending
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        self.db.add(summary)
        await self.db.flush()
        await self.db.refresh(summary)
        return summary

    async def get_daily_range(self, user_id: UUID, start: date, end: date) -> list[DailySummary]:
        result = await self.db.execute(
            select(DailySummary)
            .where(DailySummary.user_id == user_id, DailySummary.date >= start, DailySummary.date <= end)
            .order_by(DailySummary.date)
        )
        return list(result.scalars().all())

    async def get_streak(self, user_id: UUID) -> Streak | None:
        result = await self.db.execute(select(Streak).where(Streak.user_id == user_id))
        return result.scalar_one_or_none()

    async def upsert_streak(self, streak: Streak) -> Streak:
        existing = await self.get_streak(streak.user_id)
        if existing:
            existing.current_streak = streak.current_streak
            existing.longest_streak = streak.longest_streak
            existing.last_completion_date = streak.last_completion_date
            existing.broken_count = streak.broken_count
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        self.db.add(streak)
        await self.db.flush()
        await self.db.refresh(streak)
        return streak

    async def get_dashboard(self, user_id: UUID, snapshot_date: date) -> DashboardSummary | None:
        result = await self.db.execute(
            select(DashboardSummary).where(
                DashboardSummary.user_id == user_id, DashboardSummary.snapshot_date == snapshot_date
            )
        )
        return result.scalar_one_or_none()

    async def upsert_dashboard(self, summary: DashboardSummary) -> DashboardSummary:
        existing = await self.get_dashboard(summary.user_id, summary.snapshot_date)
        if existing:
            existing.cached_data = summary.cached_data
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        self.db.add(summary)
        await self.db.flush()
        await self.db.refresh(summary)
        return summary

    async def get_weekly(self, user_id: UUID, week_start: date) -> WeeklySummary | None:
        result = await self.db.execute(
            select(WeeklySummary).where(WeeklySummary.user_id == user_id, WeeklySummary.week_start == week_start)
        )
        return result.scalar_one_or_none()

    async def upsert_weekly(self, summary: WeeklySummary) -> WeeklySummary:
        existing = await self.get_weekly(summary.user_id, summary.week_start)
        if existing:
            existing.aggregates = summary.aggregates
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        self.db.add(summary)
        await self.db.flush()
        await self.db.refresh(summary)
        return summary

    async def get_monthly(self, user_id: UUID, month: str) -> MonthlySummary | None:
        result = await self.db.execute(
            select(MonthlySummary).where(MonthlySummary.user_id == user_id, MonthlySummary.month == month)
        )
        return result.scalar_one_or_none()

    async def upsert_monthly(self, summary: MonthlySummary) -> MonthlySummary:
        existing = await self.get_monthly(summary.user_id, summary.month)
        if existing:
            existing.aggregates = summary.aggregates
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        self.db.add(summary)
        await self.db.flush()
        await self.db.refresh(summary)
        return summary

    async def get_yearly(self, user_id: UUID, year: int) -> YearlySummary | None:
        result = await self.db.execute(
            select(YearlySummary).where(YearlySummary.user_id == user_id, YearlySummary.year == year)
        )
        return result.scalar_one_or_none()

    async def upsert_yearly(self, summary: YearlySummary) -> YearlySummary:
        existing = await self.get_yearly(summary.user_id, summary.year)
        if existing:
            existing.aggregates = summary.aggregates
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        self.db.add(summary)
        await self.db.flush()
        await self.db.refresh(summary)
        return summary
