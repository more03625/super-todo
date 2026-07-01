from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailySummary, Streak, Task, TaskPriority, TaskStatus
from app.repositories.analytics_repository import AnalyticsRepository


class ScoreService:
    WEIGHTS = {
        "completion_rate": 0.40,
        "priority_completion": 0.20,
        "time_accuracy": 0.15,
        "consistency": 0.15,
        "streak_bonus": 0.10,
    }

    def __init__(self, db: AsyncSession):
        self.db = db
        self.analytics_repo = AnalyticsRepository(db)

    async def recalculate_for_user(self, user_id: UUID, target_date: date | None = None) -> DailySummary:
        target_date = target_date or date.today()
        day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.is_deleted.is_(False),
                Task.created_at >= day_start,
                Task.created_at < day_end,
            )
        )
        tasks = list(result.scalars().all())

        total = len(tasks)
        completed = [t for t in tasks if t.status == TaskStatus.COMPLETED]
        pending = total - len(completed)

        completion_rate = (len(completed) / total * 100) if total else 0

        high_priority = [t for t in tasks if t.priority in (TaskPriority.HIGH, TaskPriority.URGENT)]
        high_completed = [t for t in high_priority if t.status == TaskStatus.COMPLETED]
        priority_completion = (len(high_completed) / len(high_priority) * 100) if high_priority else 100

        accuracy_scores = []
        for t in completed:
            if t.estimated_minutes and t.actual_minutes:
                diff = abs(t.estimated_minutes - t.actual_minutes) / max(t.estimated_minutes, 1)
                accuracy_scores.append(max(0, 100 - diff * 100))
        time_accuracy = sum(accuracy_scores) / len(accuracy_scores) if accuracy_scores else 50

        consistency = min(100, len(completed) * 20) if completed else 0

        streak = await self.analytics_repo.get_streak(user_id)
        streak_bonus = min(100, (streak.current_streak if streak else 0) * 10)

        breakdown = {
            "completion_rate": round(completion_rate, 1),
            "priority_completion": round(priority_completion, 1),
            "time_accuracy": round(time_accuracy, 1),
            "consistency": round(consistency, 1),
            "streak_bonus": round(streak_bonus, 1),
        }

        score = round(
            breakdown["completion_rate"] * self.WEIGHTS["completion_rate"]
            + breakdown["priority_completion"] * self.WEIGHTS["priority_completion"]
            + breakdown["time_accuracy"] * self.WEIGHTS["time_accuracy"]
            + breakdown["consistency"] * self.WEIGHTS["consistency"]
            + breakdown["streak_bonus"] * self.WEIGHTS["streak_bonus"]
        )
        score = min(100, max(0, score))

        summary = DailySummary(
            user_id=user_id,
            date=target_date,
            score=score,
            breakdown=breakdown,
            tasks_completed=len(completed),
            tasks_pending=pending,
        )
        saved = await self.analytics_repo.upsert_daily(summary)
        await self._update_streak(user_id, len(completed) > 0, target_date)
        return saved

    async def _update_streak(self, user_id: UUID, had_completion: bool, target_date: date) -> None:
        streak = await self.analytics_repo.get_streak(user_id)
        if not streak:
            streak = Streak(user_id=user_id)

        if had_completion:
            if streak.last_completion_date == target_date - timedelta(days=1):
                streak.current_streak += 1
            elif streak.last_completion_date != target_date:
                streak.current_streak = 1
            streak.last_completion_date = target_date
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        elif streak.last_completion_date and streak.last_completion_date < target_date - timedelta(days=1):
            streak.broken_count += 1
            streak.current_streak = 0

        await self.analytics_repo.upsert_streak(streak)

    @staticmethod
    def score_to_level(score: int) -> int:
        if score == 0:
            return 0
        if score <= 25:
            return 1
        if score <= 50:
            return 2
        if score <= 75:
            return 3
        return 4
