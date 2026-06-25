"""Fetch public store release labels (bird codenames) for soft-update prompts."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request

BUNDLE_ID = 'pro.birdr.app'
_CACHE_TTL_SECONDS = 3600
_PLAY_STORE_URL = (
    f'https://play.google.com/store/apps/details?id={BUNDLE_ID}&hl=en'
)
_ITUNES_LOOKUP_URL = f'https://itunes.apple.com/lookup?bundleId={BUNDLE_ID}'
_PLAY_RELEASE_LABEL_RE = re.compile(r'"141":\[\[\["([^"]+)"\]\]')
_cache: dict[str, object] = {'expires': 0.0, 'ios': None, 'android': None}


def _fetch_itunes_release_label() -> str | None:
    try:
        with urllib.request.urlopen(_ITUNES_LOOKUP_URL, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except (OSError, ValueError, json.JSONDecodeError):
        return None
    results = data.get('results') or []
    if not results:
        return None
    version = results[0].get('version')
    if not isinstance(version, str):
        return None
    label = version.strip()
    return label or None


def _fetch_play_release_label() -> str | None:
    req = urllib.request.Request(
        _PLAY_STORE_URL,
        headers={'User-Agent': 'Mozilla/5.0 (compatible; Birdr/1.0)'},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='replace')
    except (OSError, urllib.error.URLError):
        return None
    match = _PLAY_RELEASE_LABEL_RE.search(html)
    if not match:
        return None
    label = match.group(1).strip()
    return label or None


def get_store_release_labels() -> dict[str, str | None]:
    """Return cached iOS/Android store release labels, refreshing at most once per hour."""
    now = time.time()
    expires = float(_cache.get('expires') or 0)
    if now < expires and _cache.get('ios') is not None:
        return {
            'ios': _cache.get('ios'),  # type: ignore[dict-item]
            'android': _cache.get('android'),  # type: ignore[dict-item]
        }

    ios = _fetch_itunes_release_label()
    android = _fetch_play_release_label()
    _cache['expires'] = now + _CACHE_TTL_SECONDS
    _cache['ios'] = ios
    _cache['android'] = android
    return {'ios': ios, 'android': android}


def clear_store_release_label_cache() -> None:
    """Testing helper."""
    _cache['expires'] = 0.0
    _cache['ios'] = None
    _cache['android'] = None
