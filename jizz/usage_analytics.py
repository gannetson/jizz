from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

from django.db.models import Count
from django.db.models.functions import TruncDay
from django.utils import timezone

from jizz.models import UsageEvent, UserProfile

_PLATFORM_CHOICES = {'web', 'ios', 'android'}
_DEVICE_CHOICES = {'desktop', 'mobile', 'tablet', 'unknown'}
_EVENT_TYPE_CHOICES = {'page_view', 'feature'}
_COUNTRY_RE = re.compile(r'^[A-Za-z]{2}$')


def get_client_ip(request) -> str | None:
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = (request.META.get('REMOTE_ADDR') or '').strip()
    return ip or None


def resolve_country_code(request, client_country: str | None = None) -> str:
    if client_country:
        code = client_country.strip().upper()[:2]
        if _COUNTRY_RE.match(code):
            return code

    cf_country = (request.META.get('HTTP_CF_IPCOUNTRY') or '').strip().upper()
    if cf_country and cf_country != 'XX' and _COUNTRY_RE.match(cf_country):
        return cf_country

    user = getattr(request, 'user', None)
    if user and user.is_authenticated:
        try:
            profile = user.profile
            code = (profile.country_id or '').strip().upper()
            if code and _COUNTRY_RE.match(code):
                return code
        except UserProfile.DoesNotExist:
            pass

    return ''


def parse_device_type(user_agent: str) -> str:
    ua = (user_agent or '').lower()
    if not ua:
        return 'unknown'
    if 'ipad' in ua or 'tablet' in ua:
        return 'tablet'
    if 'mobile' in ua or 'iphone' in ua or 'android' in ua:
        return 'mobile'
    return 'desktop'


def normalize_platform(value: str | None) -> str:
    platform = (value or 'web').strip().lower()
    return platform if platform in _PLATFORM_CHOICES else 'web'


def normalize_event_type(value: str | None) -> str:
    event_type = (value or 'page_view').strip().lower()
    return event_type if event_type in _EVENT_TYPE_CHOICES else 'page_view'


def normalize_path(value: str | None) -> str:
    path = (value or '/').strip()
    if not path.startswith('/'):
        path = f'/{path}'
    return path[:500]


def record_usage_event(
    request,
    *,
    path: str,
    event_type: str = 'page_view',
    platform: str | None = None,
    session_key: str = '',
    country_code: str | None = None,
    metadata: dict | None = None,
) -> UsageEvent:
    user_agent = (request.META.get('HTTP_USER_AGENT') or '')[:2000]
    device_type = parse_device_type(user_agent)
    user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None

    return UsageEvent.objects.create(
        event_type=normalize_event_type(event_type),
        path=normalize_path(path),
        platform=normalize_platform(platform),
        device_type=device_type,
        country_code=resolve_country_code(request, country_code),
        ip_address=get_client_ip(request),
        user=user,
        session_key=(session_key or '')[:64],
        user_agent=user_agent,
        metadata=metadata or {},
    )


def default_date_range() -> tuple[date, date]:
    end = timezone.localdate()
    return end - timedelta(days=29), end


def parse_date_param(value: str | None, fallback: date) -> date:
    if not value:
        return fallback
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return fallback


def normalize_range(start: date, end: date) -> tuple[date, date]:
    if start > end:
        start, end = end, start
    if (end - start).days > 366:
        start = end - timedelta(days=366)
    return start, end


def _filtered_queryset(
    start: date,
    end: date,
    *,
    platform: str | None = None,
    device_type: str | None = None,
    country_code: str | None = None,
    event_type: str | None = None,
):
    start_dt = timezone.make_aware(datetime.combine(start, datetime.min.time()))
    end_dt = timezone.make_aware(datetime.combine(end, datetime.max.time()))
    qs = UsageEvent.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)

    if platform in _PLATFORM_CHOICES:
        qs = qs.filter(platform=platform)
    if device_type in _DEVICE_CHOICES:
        qs = qs.filter(device_type=device_type)
    if country_code and _COUNTRY_RE.match(country_code.upper()):
        qs = qs.filter(country_code=country_code.upper())
    if event_type in _EVENT_TYPE_CHOICES:
        qs = qs.filter(event_type=event_type)
    return qs


def usage_stats_payload(
    start: date,
    end: date,
    *,
    platform: str | None = None,
    device_type: str | None = None,
    country_code: str | None = None,
    event_type: str | None = None,
) -> dict[str, Any]:
    start, end = normalize_range(start, end)
    qs = _filtered_queryset(
        start,
        end,
        platform=platform,
        device_type=device_type,
        country_code=country_code,
        event_type=event_type,
    )

    daily = (
        qs.annotate(day=TruncDay('created_at'))
        .values('day')
        .annotate(events=Count('id'))
        .order_by('day')
    )
    series = [
        {'period': row['day'].date().isoformat(), 'events': row['events']}
        for row in daily
    ]

    top_paths = list(
        qs.values('path')
        .annotate(events=Count('id'))
        .order_by('-events', 'path')[:20]
    )

    by_platform = list(
        qs.values('platform')
        .annotate(events=Count('id'))
        .order_by('-events', 'platform')
    )
    by_device = list(
        qs.values('device_type')
        .annotate(events=Count('id'))
        .order_by('-events', 'device_type')
    )
    by_country = list(
        qs.exclude(country_code='')
        .values('country_code')
        .annotate(events=Count('id'))
        .order_by('-events', 'country_code')
    )

    session_qs = qs.exclude(session_key='').values('session_key').distinct()
    unique_sessions = session_qs.count()

    country_map = {row['country_code']: row['events'] for row in by_country}

    return {
        'start': start.isoformat(),
        'end': end.isoformat(),
        'platform': platform or '',
        'device_type': device_type or '',
        'country_code': (country_code or '').upper(),
        'event_type': event_type or '',
        'total_events': qs.count(),
        'unique_sessions': unique_sessions,
        'series': series,
        'top_paths': top_paths,
        'by_platform': by_platform,
        'by_device': by_device,
        'by_country': by_country,
        'country_map': country_map,
    }
