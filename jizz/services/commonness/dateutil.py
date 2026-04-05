"""Parse GBIF event dates."""

from __future__ import annotations

from datetime import date


def parse_event_date(
    event_date_str: str | None,
    year: int | None,
    month: int | None,
    day: int | None,
) -> date | None:
    if event_date_str:
        s = event_date_str.strip()
        if s:
            day_part = s.split('T')[0].split(' ')[0]
            try:
                return date.fromisoformat(day_part)
            except ValueError:
                pass
    if year is not None:
        m = month if month is not None else 1
        d = day if day is not None else 1
        try:
            return date(year, m, d)
        except ValueError:
            return None
    return None
