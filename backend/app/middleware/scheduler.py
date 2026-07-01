from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models import User
from app.services.score_service import ScoreService
from app.services.report_service import ReportService

scheduler = AsyncIOScheduler()


async def nightly_summary_job():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.is_active.is_(True)))
        users = result.scalars().all()
        score_service = ScoreService(db)
        report_service = ReportService(db)
        for user in users:
            await score_service.recalculate_for_user(user.id)
            await report_service.get_weekly_report(user.id)
        await db.commit()


def setup_scheduler():
    if not scheduler.running:
        scheduler.add_job(nightly_summary_job, "cron", hour=0, minute=5)
        scheduler.start()
