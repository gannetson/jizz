"""Xeno-Canto playback URLs.

Stored rows historically use ``https://xeno-canto.org/{id}/download``, which has
no file extension and is often a large WAV. Quiz clients (especially iOS) need
the transcoded MP3 at ``/sounds/uploaded/{hash}/{stem}.mp3``.
"""

from __future__ import annotations

import re
from urllib.parse import quote
from typing import Any, Mapping

XC_ID_RE = re.compile(r'(?:www\.)?xeno-canto\.org/(\d+)(?:/|$)', re.I)
DOWNLOAD_RE = re.compile(
    r'^https?://(?:www\.)?xeno-canto\.org/(\d+)/download/?$',
    re.I,
)
UPLOADED_MP3_RE = re.compile(
    r'^https?://(?:www\.)?xeno-canto\.org/sounds/uploaded/[^/]+/.+\.mp3(?:\?.*)?$',
    re.I,
)
SONO_HASH_RE = re.compile(r'/sounds/spectrograms/([^/]+)/')


def xeno_canto_recording_id(*urls: str | None) -> str | None:
    for url in urls:
        if not url:
            continue
        match = XC_ID_RE.search(url)
        if match:
            return match.group(1)
    return None


def is_xeno_canto_download_url(url: str | None) -> bool:
    return bool(url and DOWNLOAD_RE.match(url.strip()))


def is_xeno_canto_uploaded_mp3_url(url: str | None) -> bool:
    return bool(url and UPLOADED_MP3_RE.match(url.strip()))


def absolute_xeno_canto_url(url: str | None) -> str:
    file_url = (url or '').strip()
    if not file_url:
        return ''
    if file_url.startswith('//'):
        return 'https:' + file_url
    if file_url.startswith('/'):
        return 'https://xeno-canto.org' + file_url
    return file_url


def _sono_hash(sono: Any) -> str | None:
    if not isinstance(sono, Mapping):
        return None
    for key in ('small', 'med', 'medium', 'large', 'full'):
        match = SONO_HASH_RE.search(str(sono.get(key) or ''))
        if match:
            return match.group(1)
    return None


def xeno_canto_playback_url_from_recording(recording: Mapping[str, Any] | None) -> str | None:
    """Prefer XC's transcoded MP3; fall back to the API ``file`` URL."""
    if not recording:
        return None

    file_url = absolute_xeno_canto_url(recording.get('file'))
    if is_xeno_canto_uploaded_mp3_url(file_url):
        return file_url

    hash_ = _sono_hash(recording.get('sono'))
    file_name = (recording.get('file-name') or recording.get('file_name') or '').strip()
    if hash_ and file_name:
        stem = file_name.rsplit('.', 1)[0] if '.' in file_name else file_name
        if stem:
            encoded = quote(stem, safe='-_.~')
            return f'https://xeno-canto.org/sounds/uploaded/{hash_}/{encoded}.mp3'

    return file_url or None
