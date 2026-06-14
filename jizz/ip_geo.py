from __future__ import annotations

import ipaddress
import logging
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
    if _geo_reader_failed:
        return None
    if _geo_reader is not None:
        return _geo_reader

    db_path = getattr(settings, 'GEOIP_COUNTRY_DB', None) or ''
    if not db_path:
        _geo_reader_failed = True
        return None

    try:
        import geoip2.database

        _geo_reader = geoip2.database.Reader(str(db_path))
        return _geo_reader
    except Exception as exc:
        logger.warning('GeoIP country database unavailable at %s: %s', db_path, exc)
        _geo_reader_failed = True
        return None


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


@lru_cache(maxsize=4096)
def lookup_ip_country_mmdb(ip: str) -> dict[str, str]:
    """Resolve country from the local MaxMind DB only (safe for bulk map aggregation)."""
    ip = (ip or '').strip()
    if not ip or not _is_public_ip(ip):
        return {}
    return _lookup_via_mmdb(ip)


@lru_cache(maxsize=512)
def lookup_ip_location(ip: str) -> dict[str, str]:
    """Resolve a public IP to country (and city when available). Results are cached."""
    ip = (ip or '').strip()
    if not ip:
        return {}

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
    enriched = []
    for row in rows:
        ip = str(row.get('ip_address') or '')
        location = lookup_ip_location(ip)
        enriched.append({
            **row,
            'geo_country_code': location.get('country_code', ''),
            'geo_country_name': location.get('country_name', ''),
            'geo_city': location.get('city', ''),
            'geo_label': format_ip_location(location),
        })
    return enriched
