from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Achievement, UserAchievement


class AchievementRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Achievement]:
        result = await self.db.execute(select(Achievement).order_by(Achievement.code))
        return list(result.scalars().all())

    async def get_user_achievements(self, user_id: UUID) -> list[UserAchievement]:
        result = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
        return list(result.scalars().all())

    async def has_achievement(self, user_id: UUID, achievement_id: UUID) -> bool:
        result = await self.db.execute(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def unlock(self, user_achievement: UserAchievement) -> UserAchievement:
        self.db.add(user_achievement)
        await self.db.flush()
        await self.db.refresh(user_achievement)
        return user_achievement
