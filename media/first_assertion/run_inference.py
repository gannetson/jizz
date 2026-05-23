"""Run first-assertion inference on a Media queryset (shared by management command and admin)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Optional, Tuple

from django.conf import settings
from django.db.models import QuerySet

from media.first_assertion.features import extract_feature_vector_from_url
from media.first_assertion.predict import load_bundle, predict_for_features
from media.models import MediaPrediction

logger = logging.getLogger(__name__)


def resolve_artifact_path(
    *,
    artifact_path: Optional[str] = None,
    model_version: Optional[str] = None,
) -> Path:
    if artifact_path:
        return Path(artifact_path)
    if not model_version:
        raise ValueError('Provide artifact_path or model_version')
    safe = model_version.replace('/', '_')
    return Path(settings.MEDIA_FIRST_ASSERTION_ARTIFACTS_DIR) / f'model-{safe}.joblib'


def infer_media_queryset(
    qs: QuerySet,
    *,
    artifact_path: Optional[str] = None,
    model_version: Optional[str] = None,
    features_version: Optional[str] = None,
    force_features_version: bool = False,
    dry_run: bool = False,
    confidence_threshold: Optional[float] = None,
    progress_every: int = 0,
    stats: Optional[dict[str, Any]] = None,
) -> Tuple[int, int, str]:
    """
    For each Media row in qs, download URL, extract features, upsert MediaPrediction.

    Returns (n_ok, n_skip, resolved_model_version).
    """
    path = resolve_artifact_path(artifact_path=artifact_path, model_version=model_version)
    if not path.is_file():
        raise FileNotFoundError(str(path))

    bundle = load_bundle(path)
    resolved_version = bundle.get('model_version') or model_version
    if not resolved_version:
        raise ValueError('Bundle missing model_version; pass model_version when loading')

    bundle_features_version = (bundle.get('features_version') or '').strip()
    requested_features_version = (features_version or bundle_features_version or '').strip()
    if bundle_features_version and requested_features_version and bundle_features_version != requested_features_version:
        if not force_features_version:
            raise ValueError(
                f'Features version mismatch: bundle={bundle_features_version} requested={requested_features_version}. '
                'Pass --force-features-version to override.'
            )
    if not requested_features_version:
        requested_features_version = bundle_features_version

    n_ok = 0
    n_skip = 0
    for i, media in enumerate(qs.order_by('id').iterator(chunk_size=50), start=1):
        try:
            vec = extract_feature_vector_from_url(media.url, features_version=requested_features_version)
        except Exception as exc:
            logger.warning('Skip media %s: %s', media.id, exc)
            n_skip += 1
            continue
        pred_type, confidence = predict_for_features(bundle, vec)
        if confidence_threshold is not None and confidence < confidence_threshold and stats is not None:
            stats['below_threshold'] = int(stats.get('below_threshold', 0)) + 1

        if not dry_run:
            MediaPrediction.objects.update_or_create(
                media=media,
                defaults={
                    'predicted_review_type': pred_type,
                    'confidence': confidence,
                    'model_version': resolved_version,
                    'features_version': requested_features_version,
                },
            )
        n_ok += 1

        if progress_every and i % progress_every == 0:
            logger.info('Inference progress: %s processed (ok=%s, skipped=%s)', i, n_ok, n_skip)

    return n_ok, n_skip, resolved_version
