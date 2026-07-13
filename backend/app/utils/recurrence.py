import calendar
from datetime import date, timedelta

from app.models import RecurrenceUnit

# recurrence_weekdays bitmask: bit 0 = Monday ... bit 6 = Sunday (matches date.weekday())


def _add_months(base: date, months: int) -> date:
    total = base.year * 12 + (base.month - 1) + months
    year, month = divmod(total, 12)
    month += 1
    day = min(base.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def next_due_date(
    base: date,
    unit: RecurrenceUnit,
    interval: int | None = None,
    weekdays_mask: int | None = None,
) -> date:
    """Next occurrence strictly after base."""
    interval = max(1, interval or 1)

    if unit == RecurrenceUnit.DAY:
        return base + timedelta(days=interval)

    if unit == RecurrenceUnit.WEEK:
        if not weekdays_mask:
            return base + timedelta(weeks=interval)
        base_week = _week_start(base)
        candidate = base + timedelta(days=1)
        # At most interval weeks + 7 days until a selected weekday recurs
        for _ in range(interval * 7 + 7):
            weeks_apart = (_week_start(candidate) - base_week).days // 7
            if weeks_apart % interval == 0 and weekdays_mask & (1 << candidate.weekday()):
                return candidate
            candidate += timedelta(days=1)
        return base + timedelta(weeks=interval)

    if unit == RecurrenceUnit.MONTH:
        return _add_months(base, interval)

    if unit == RecurrenceUnit.YEAR:
        return _add_months(base, 12 * interval)

    raise ValueError(f"Unsupported recurrence unit: {unit}")
