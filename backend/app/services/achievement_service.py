from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Achievement, Task, TaskStatus, UserAchievement
from app.repositories.achievement_repository import AchievementRepository
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.task_repository import TaskRepository


class AchievementService:
    def __init__(self, db: AsyncSession):
        self.repo = AchievementRepository(db)
        self.task_repo = TaskRepository(db)
        self.analytics_repo = AnalyticsRepository(db)
        self.db = db

    async def evaluate(self, user_id: UUID, event: dict) -> list[str]:
        unlocked_codes: list[str] = []
        achievements = await self.repo.get_all()
        user_unlocked = {ua.achievement_id for ua in await self.repo.get_user_achievements(user_id)}

        completed_count = await self.task_repo.count_completed(user_id)
        streak = await self.analytics_repo.get_streak(user_id)
        current_streak = streak.current_streak if streak else 0

        for achievement in achievements:
            if achievement.id in user_unlocked:
                continue
            if await self._check_rule(achievement, user_id, event, completed_count, current_streak):
                await self.repo.unlock(
                    UserAchievement(
                        user_id=user_id,
                        achievement_id=achievement.id,
                        unlocked_at=datetime.now(timezone.utc),
                    )
                )
                unlocked_codes.append(achievement.code)
        return unlocked_codes

    async def _check_rule(
        self, achievement: Achievement, user_id: UUID, event: dict, completed_count: int, current_streak: int
    ) -> bool:
        rule = achievement.rule_definition
        rule_type = rule.get("type")

        if rule_type == "task_count":
            threshold = rule.get("threshold", 0)
            if event.get("type") in ("task_created", "task_completed") and completed_count >= threshold:
                return completed_count >= threshold

        if rule_type == "streak":
            threshold = rule.get("threshold", 0)
            return current_streak >= threshold

        if rule_type == "first_task" and event.get("type") == "task_created":
            result = await self.db.execute(
                select(func.count()).where(Task.user_id == user_id, Task.is_deleted.is_(False))
            )
            return (result.scalar() or 0) >= 1

        if rule_type == "perfect_week":
            return rule.get("threshold", 7) <= current_streak

        return False

    async def list_for_user(self, user_id: UUID) -> list[dict]:
        achievements = await self.repo.get_all()
        user_achievements = {
            ua.achievement_id: ua.unlocked_at for ua in await self.repo.get_user_achievements(user_id)
        }
        result = []
        for a in achievements:
            unlocked_at = user_achievements.get(a.id)
            result.append({
                "id": str(a.id),
                "code": a.code,
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "unlocked": unlocked_at is not None,
                "unlocked_at": unlocked_at.isoformat() if unlocked_at else None,
            })
        return result
