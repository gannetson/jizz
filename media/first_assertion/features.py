"""Feature extraction façade used by training/inference.

Important architectural rule:
- This module is the stable boundary for \"URL/bytes -> feature vector\".
- New extractors (e.g. embeddings) should be swappable behind this boundary without
  changing management commands, serializers, UI, or `MediaPrediction`.
"""

from __future__ import annotations

import re
import time
from urllib.parse import urlparse, urlunparse

import requests
from django.conf import settings

from media.first_assertion import DEFAULT_FEATURES_VERSION
from media.first_assertion.feature_extraction.base import ExtractorInput, FeatureExtractor
from media.first_assertion.feature_extraction.handcrafted_v1 import HandcraftedV1Extractor
from media.first_assertion.feature_extraction.handcrafted_v2 import HandcraftedV2Extractor, HandcraftedV2YoloExtractor

MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024
REQUEST_TIMEOUT = 20
_EXTRACTORS: dict[str, FeatureExtractor] = {
    'handcrafted_v1': HandcraftedV1Extractor(),
    'handcrafted_v2': HandcraftedV2Extractor(),
    'handcrafted_v2_yolo': HandcraftedV2YoloExtractor(),
}

_DEFAULT_BROWSER_UA = (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
)

# Wikimedia production $wgThumbnailSteps — other widths return 400/429 guidance.
# https://w.wiki/GHai
WIKIMEDIA_THUMB_STEPS = (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840)


def _wikimedia_snap_step(requested: int) -> int:
    """Smallest standard step >= requested (Wikimedia rejects arbitrary widths)."""
    r = max(1, min(int(requested), WIKIMEDIA_THUMB_STEPS[-1]))
    for s in WIKIMEDIA_THUMB_STEPS:
        if s >= r:
            return s
    return WIKIMEDIA_THUMB_STEPS[-1]


def _wikimedia_candidate_steps(requested: int) -> list[int]:
    """Primary snapped width, then smaller standard steps (for 400/404 fallbacks)."""
    primary = _wikimedia_snap_step(requested)
    idx = WIKIMEDIA_THUMB_STEPS.index(primary)
    return [primary] + list(reversed(WIKIMEDIA_THUMB_STEPS[:idx]))


def _is_wikimedia_upload(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return False
    return 'upload.wikimedia.org' in host or host.endswith('.wikimedia.org')


def _wikimedia_commons_thumb_url(url: str, step_px: int) -> str:
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


def _browser_like_headers(url: str) -> dict:
    """Headers many CDNs (e.g. Wikimedia) expect; avoids 403 on hotlinked image URLs."""
    ua = (getattr(settings, 'MEDIA_HTTP_FETCH_USER_AGENT', None) or '').strip()
    if not ua:
        ua = _DEFAULT_BROWSER_UA
    referer = 'https://commons.wikimedia.org/'
    low = url.lower()
    if 'wikimedia.org' in low or 'wikipedia.org' in low:
        referer = 'https://commons.wikimedia.org/'
    elif url.startswith('http'):
        p = urlparse(url)
        if p.scheme and p.netloc:
            referer = f'{p.scheme}://{p.netloc}/'
    return {
        'User-Agent': ua,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': referer,
    }


def download_image(url: str) -> tuple[bytes, int | None]:
    wikimedia = _is_wikimedia_upload(url)
    if wikimedia:
        delay = float(getattr(settings, 'MEDIA_HTTP_FETCH_DELAY_SECONDS', 0.35) or 0)
        if delay > 0:
            time.sleep(delay)

    user_w = int(getattr(settings, 'MEDIA_WIKIMEDIA_THUMB_WIDTH_PX', 500) or 500)
    user_w = max(WIKIMEDIA_THUMB_STEPS[0], min(user_w, WIKIMEDIA_THUMB_STEPS[-1]))

    candidate_urls: list[str]
    if wikimedia:
        steps = _wikimedia_candidate_steps(user_w)
        seen: set[str] = set()
        candidate_urls = []
        for step in steps:
            u = _wikimedia_commons_thumb_url(url, step)
            if u not in seen:
                seen.add(u)
                candidate_urls.append(u)
    else:
        candidate_urls = [url]

    last_exc: BaseException | None = None
    for try_url in candidate_urls:
        headers = _browser_like_headers(try_url)
        for attempt in range(6):
            r = requests.get(
                try_url,
                timeout=REQUEST_TIMEOUT,
                stream=True,
                headers=headers,
            )
            if r.status_code == 429:
                retry_after = r.headers.get('Retry-After')
                try:
                    wait = float(retry_after) if retry_after is not None else min(120.0, 2.0 ** attempt)
                except (TypeError, ValueError):
                    wait = min(120.0, 2.0 ** attempt)
                time.sleep(wait)
                last_exc = requests.HTTPError('429 Too Many Requests', response=r)
                continue
            try:
                r.raise_for_status()
            except requests.HTTPError as exc:
                last_exc = exc
                if r.status_code in (502, 503, 504) and attempt < 5:
                    time.sleep(min(60.0, 1.5 ** attempt))
                    continue
                if wikimedia and r.status_code in (400, 404):
                    break
                raise
            total = 0
            chunks = []
            for chunk in r.iter_content(chunk_size=65536):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    raise ValueError('Image exceeds size limit')
                chunks.append(chunk)
            data = b''.join(chunks)
            size = None
            cl = r.headers.get('Content-Length')
            if cl is not None:
                try:
                    size = int(cl)
                except (TypeError, ValueError):
                    size = None
            if size is None:
                size = len(data)
            return data, size

    if last_exc:
        raise last_exc
    raise RuntimeError('Failed to download image')


def get_feature_extractor(features_version: str | None = None) -> FeatureExtractor:
    fv = (features_version or DEFAULT_FEATURES_VERSION).strip()
    if fv not in _EXTRACTORS:
        raise ValueError(f'Unsupported features_version: {fv}')
    return _EXTRACTORS[fv]


def ensure_feature_extractor_dependencies(features_version: str | None = None) -> None:
    """
    Fail fast for optional heavy deps that are only needed by certain extractors.

    (Without this, missing deps would manifest as thousands of per-media skips.)
    """
    fv = (features_version or DEFAULT_FEATURES_VERSION).strip()
    if fv in ('handcrafted_v2', 'handcrafted_v2_yolo'):
        try:
            import cv2  # noqa: F401
        except ModuleNotFoundError as exc:
            raise ModuleNotFoundError(
                "handcrafted_v2 requires OpenCV. Install with "
                "`pip install opencv-python-headless` (or `pip install -r requirements.txt`)."
            ) from exc
    if fv == 'handcrafted_v2_yolo':
        from pathlib import Path

        from django.conf import settings

        p = (getattr(settings, 'MEDIA_YOLO_ONNX_PATH', '') or '').strip()
        if not p or not Path(p).is_file():
            raise ModuleNotFoundError(
                "handcrafted_v2_yolo requires an ONNX YOLO model file. Set MEDIA_YOLO_ONNX_PATH "
                "to a local .onnx path (offline)."
            )
        try:
            import onnxruntime  # noqa: F401
        except ModuleNotFoundError as exc:
            raise ModuleNotFoundError(
                "handcrafted_v2_yolo needs `onnxruntime` as a fallback when OpenCV DNN cannot run your ONNX "
                "(common with newer exports). Install with `pip install onnxruntime` "
                "(or `pip install -r requirements.txt`)."
            ) from exc


def feature_names(features_version: str | None = None) -> list[str]:
    return get_feature_extractor(features_version).feature_names()


def feature_dim(features_version: str | None = None) -> int:
    return len(feature_names(features_version))


def extract_feature_vector_from_bytes(
    data: bytes,
    *,
    features_version: str | None = None,
    url: str | None = None,
    file_size_bytes: int | None = None,
) -> np.ndarray:
    extractor = get_feature_extractor(features_version)
    inp = ExtractorInput(image_bytes=data, url=url, file_size_bytes=file_size_bytes)
    return extractor.extract(inp)


def extract_feature_vector_from_url(
    url: str,
    *,
    features_version: str | None = None,
) -> np.ndarray:
    data, size = download_image(url)
    return extract_feature_vector_from_bytes(
        data,
        features_version=features_version,
        url=url,
        file_size_bytes=size,
    )


