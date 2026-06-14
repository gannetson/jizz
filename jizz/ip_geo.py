from __future__ import annotations

import ipaddress
import logging
import os
from collections.abc import Iterable
from functools import lru_cache
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

_geo_reader = None
_geo_reader_failed = False


def _is_public_ip(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_global
    except ValueError:
        return False


def _get_geo_reader():
    global _geo_reader, _geo_reader_failed
    if _geo_reader is not None:
        return _geo_reader

    db_path = getattr(settings, 'GEOIP_COUNTRY_DB', None) or ''
    if not db_path:
        return None

    if _geo_reader_failed:
        if not (os.path.isfile(db_path) and os.access(db_path, os.R_OK)):
            return None
        _geo_reader_failed = False

    try:
        import geoip2.database

        _geo_reader = geoip2.database.Reader(str(db_path))
        lookup_ip_country_mmdb.cache_clear()
        logger.info('GeoIP country database loaded from %s', db_path)
        return _geo_reader
    except Exception as exc:
        logger.warning('GeoIP country database unavailable at %s: %s', db_path, exc)
        _geo_reader_failed = True
        return None


def mmdb_available() -> bool:
    """True when the local MaxMind country database is loaded."""
    return _get_geo_reader() is not None


def _lookup_via_mmdb(ip: str) -> dict[str, str]:
    reader = _get_geo_reader()
    if not reader:
        return {}
    try:
        response = reader.country(ip)
        return {
            'country_code': response.country.iso_code or '',
            'country_name': response.country.name or '',
            'city': '',
        }
    except Exception:
        return {}


def _lookup_via_ip_api(ip: str) -> dict[str, str]:
    import requests

    try:
        response = requests.get(
            f'http://ip-api.com/json/{ip}',
            params={'fields': 'status,country,countryCode,city'},
            timeout=1,
        )
        response.raise_for_status()
        data = response.json()
        if data.get('status') != 'success':
            return {}
        return {
            'country_code': data.get('countryCode') or '',
            'country_name': data.get('country') or '',
            'city': data.get('city') or '',
        }
    except Exception:
        return {}


def _resolve_ip_location_live(ip: str) -> dict[str, str]:
    """Resolve an IP via MaxMind and ip-api (no DB cache)."""
    if not _is_public_ip(ip):
        return {
            'country_code': '',
            'country_name': 'Private/local',
            'city': '',
        }

    location = _lookup_via_mmdb(ip)
    if not location.get('country_code') and not location.get('country_name'):
        location = _lookup_via_ip_api(ip)
    return location


def _save_ip_geo_cache(ip: str, location: dict[str, str]) -> None:
    from jizz.models import IpGeoCache

    is_private = location.get('country_name') == 'Private/local'
    IpGeoCache.objects.update_or_create(
        ip_address=ip,
        defaults={
            'country_code': (location.get('country_code') or '')[:2],
            'country_name': (location.get('country_name') or '')[:100],
            'city': (location.get('city') or '')[:100],
            'is_private': is_private,
        },
    )


def lookup_ip_locations(
    ips: Iterable[str],
    *,
    max_live_lookups: int | None = None,
) -> dict[str, dict[str, str]]:
    """Resolve many IPs, using the DB cache and only hitting GeoIP services on cache miss."""
    from jizz.models import IpGeoCache

    unique_ips = list(dict.fromkeys(ip.strip() for ip in ips if ip and ip.strip()))
    if not unique_ips:
        return {}

    cached_rows = IpGeoCache.objects.filter(ip_address__in=unique_ips)
    locations = {str(row.ip_address): row.to_location_dict() for row in cached_rows}

    live_lookups = 0
    for ip in unique_ips:
        if ip in locations:
            continue
        if max_live_lookups is not None and live_lookups >= max_live_lookups:
            locations[ip] = {}
            continue
        location = _resolve_ip_location_live(ip)
        _save_ip_geo_cache(ip, location)
        locations[ip] = location
        live_lookups += 1

    return locations


def lookup_ip_location(ip: str) -> dict[str, str]:
    """Resolve a single IP to country (and city when available)."""
    ip = (ip or '').strip()
    if not ip:
        return {}
    return lookup_ip_locations([ip]).get(ip, {})


@lru_cache(maxsize=4096)
def lookup_ip_country_mmdb(ip: str) -> dict[str, str]:
    """Resolve country from the local MaxMind DB only (safe for bulk map aggregation)."""
    ip = (ip or '').strip()
    if not ip or not _is_public_ip(ip):
        return {}
    return _lookup_via_mmdb(ip)


def format_ip_location(location: dict[str, str] | None) -> str:
    if not location:
        return '—'
    city = (location.get('city') or '').strip()
    country_name = (location.get('country_name') or '').strip()
    country_code = (location.get('country_code') or '').strip()
    country = country_name or country_code
    if city and country:
        return f'{city}, {country}'
    if country:
        return country
    return '—'


def enrich_ip_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ips = [str(row.get('ip_address') or '') for row in rows]
    locations = lookup_ip_locations(ips)
    enriched = []
    for row in rows:
        ip = str(row.get('ip_address') or '')
        location = locations.get(ip.strip(), {})
        enriched.append({
            **row,
            'geo_country_code': location.get('country_code', ''),
            'geo_country_name': location.get('country_name', ''),
            'geo_city': location.get('city', ''),
            'geo_label': format_ip_location(location),
        })
    return enriched
