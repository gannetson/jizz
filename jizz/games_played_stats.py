from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Literal

from django.db.models import Count
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils import timezone

from jizz.models import PlayerScore

Granularity = Literal['day', 'week', 'month']

_TRUNC = {
    'day': TruncDay,
    'week': TruncWeek,
    'month': TruncMonth,
}


def default_date_range() -> tuple[date, date]:
    """First day of the month 11 months ago through today (12 calendar months)."""
    end = timezone.localdate()
    month = end.month - 11
    year = end.year
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 1), end


def parse_date_param(value: str | None, fallback: date) -> date:
    if not value:
        return fallback
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return fallback


def parse_granularity(value: str | None) -> Granularity:
    if value in _TRUNC:
        return value  # type: ignore[return-value]
    return 'month'


def normalize_range(
    start: date,
    end: date,
    *,
    granularity: Granularity,
) -> tuple[date, date]:
    if start > end:
        start, end = end, start

    max_days = {'day': 366, 'week': 366 * 2, 'month': 366 * 5}[granularity]
    if (end - start).days > max_days:
        start = end - timedelta(days=max_days)

    return start, end


def _period_start(value: date | datetime, granularity: Granularity) -> date:
    if isinstance(value, datetime):
        value = timezone.localdate(value)
    if granularity == 'month':
        return value.replace(day=1)
    if granularity == 'week':
        return value - timedelta(days=value.weekday())
    return value


def _advance_period(current: date, granularity: Granularity) -> date:
    if granularity == 'day':
        return current + timedelta(days=1)
    if granularity == 'week':
        return current + timedelta(days=7)
    month = current.month + 1
    year = current.year
    if month > 12:
        month = 1
        year += 1
    return date(year, month, 1)


def _end_period(start: date, end: date, granularity: Granularity) -> date:
    if granularity == 'day':
        return start
    if granularity == 'week':
        return min(start + timedelta(days=6), end)
    if start.month == 12:
        last = date(start.year, 12, 31)
    else:
        last = date(start.year, start.month + 1, 1) - timedelta(days=1)
    return min(last, end)


def iter_periods(start: date, end: date, granularity: Granularity):
    current = _period_start(start, granularity)
    if current < start:
        current = start if granularity == 'day' else _period_start(start, granularity)
    while current <= end:
        yield current
        current = _advance_period(current, granularity)


def games_played_rows(
    start: date,
    end: date,
    *,
    granularity: Granularity = 'month',
) -> list[dict]:
    """
    Count distinct games and players per period from PlayerScore rows.

    Dates are taken from Game.created (PlayerScore has no timestamp).
    """
    start, end = normalize_range(start, end, granularity=granularity)
    trunc = _TRUNC[granularity]('game__created')

    start_dt = timezone.make_aware(datetime.combine(start, datetime.min.time()))
    end_dt = timezone.make_aware(datetime.combine(end, datetime.max.time()))

    aggregated = {
        _period_start(row['period'], granularity): row
        for row in (
            PlayerScore.objects.filter(
                game__isnull=False,
                game__created__gte=start_dt,
                game__created__lte=end_dt,
            )
            .annotate(period=trunc)
            .values('period')
            .annotate(
                games=Count('game_id', distinct=True),
                players=Count('player_id', distinct=True),
            )
        )
    }

    rows: list[dict] = []
    for period_start in iter_periods(start, end, granularity):
        bucket = aggregated.get(period_start, {})
        rows.append(
            {
                'period': period_start.isoformat(),
                'period_end': _end_period(period_start, end, granularity).isoformat(),
                'games': bucket.get('games', 0),
                'players': bucket.get('players', 0),
            }
        )
    return rows


def games_played_payload(
    start: date | None = None,
    end: date | None = None,
    *,
    granularity: Granularity | None = None,
) -> dict:
    default_start, default_end = default_date_range()
    start = start or default_start
    end = end or default_end
    granularity = granularity or 'month'
    start, end = normalize_range(start, end, granularity=granularity)
    return {
        'start': start.isoformat(),
        'end': end.isoformat(),
        'granularity': granularity,
        'series': games_played_rows(start, end, granularity=granularity),
    }
