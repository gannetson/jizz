"""Wikimedia Commons thumbnail URL helpers.

Uses Wikimedia production $wgThumbnailSteps — arbitrary widths often 400.
https://www.mediawiki.org/wiki/Common_thumbnail_sizes
"""

from __future__ import annotations

import re
from urllib.parse import urlparse, urlunparse

from django.conf import settings

# https://w.wiki/GHai
WIKIMEDIA_THUMB_STEPS = (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840)


def is_wikimedia_upload(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return False
    return 'upload.wikimedia.org' in host or host.endswith('.wikimedia.org')


def wikimedia_snap_step(requested: int) -> int:
    """Smallest standard step >= requested (Wikimedia rejects arbitrary widths)."""
    r = max(1, min(int(requested), WIKIMEDIA_THUMB_STEPS[-1]))
    for s in WIKIMEDIA_THUMB_STEPS:
        if s >= r:
            return s
    return WIKIMEDIA_THUMB_STEPS[-1]


def wikimedia_candidate_steps(requested: int) -> list[int]:
    """Primary snapped width, then smaller standard steps (for 400/404 fallbacks)."""
    primary = wikimedia_snap_step(requested)
    idx = WIKIMEDIA_THUMB_STEPS.index(primary)
    return [primary] + list(reversed(WIKIMEDIA_THUMB_STEPS[:idx]))


def wikimedia_commons_thumb_url(url: str, step_px: int) -> str:
    """
    Build a Commons thumbnail URL using a Wikimedia $wgThumbnailSteps width only.

    Accepts direct file URLs or existing /thumb/.../OLDpx-... URLs (rewrites width).
    """
    parsed = urlparse(url)
    path = parsed.path or ''
    step_px = int(step_px)

    # Existing thumb: .../thumb/X/XY/Orig.ext/Wpx-Orig.ext
    m_thumb = re.match(
        r'^(/wikipedia/commons/thumb/[0-9a-f]/[0-9a-f]{2}/)([^/]+)/(\d+)px-(.+)$',
        path,
        re.IGNORECASE,
    )
    if m_thumb:
        base, orig, _old_w, _suffix = m_thumb.groups()
        thumb_path = f'{base}{orig}/{step_px}px-{orig}'
        return urlunparse((parsed.scheme, parsed.netloc, thumb_path, '', '', ''))

    # Direct file: /wikipedia/commons/{1hex}/{2hex}/filename.ext
    m = re.match(
        r'^(/wikipedia/commons/)([0-9a-f])(/[0-9a-f]{2}/)([^/]+\.(?:jpe?g|png|webp|gif))$',
        path,
        re.IGNORECASE,
    )
    if not m:
        return url
    prefix, c1, mid, filename = m.groups()
    thumb_path = f'{prefix}thumb/{c1}{mid}{filename}/{step_px}px-{filename}'
    return urlunparse((parsed.scheme, parsed.netloc, thumb_path, '', '', ''))


def wikimedia_display_url(url: str | None, width_px: int | None = None) -> str | None:
    """
    Rewrite Wikimedia image URLs to a standard display thumbnail (default 960px).

    Non-Wikimedia URLs and unrecognized paths are returned unchanged.
    """
    if not url:
        return url
    if not is_wikimedia_upload(url):
        return url
    if width_px is None:
        width_px = int(getattr(settings, 'MEDIA_WIKIMEDIA_DISPLAY_WIDTH_PX', 960) or 960)
    step = wikimedia_snap_step(width_px)
    return wikimedia_commons_thumb_url(url, step)
