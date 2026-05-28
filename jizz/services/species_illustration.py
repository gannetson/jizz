"""
Generate and cache per-species field-guide illustrations via OpenAI Images API.
"""
from __future__ import annotations

import base64
import logging
import urllib.request
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction

from jizz.models import SpeciesIllustration

if TYPE_CHECKING:
    from jizz.models import Species

logger = logging.getLogger(__name__)


def _illustration_enabled() -> bool:
    return bool(getattr(settings, 'SPECIES_ILLUSTRATION_ENABLED', True))


def _openai_api_key() -> str:
    return (getattr(settings, 'OPENAI_API_KEY', None) or '').strip()


def _is_gpt_image_model(model: str) -> bool:
    """OpenAI GPT image models (gpt-image-1, gpt-image-1-mini, etc.)."""
    return 'gpt-image' in (model or '').lower()


def _images_generate_kwargs(model: str, prompt: str) -> dict[str, Any]:
    size = getattr(settings, 'SPECIES_ILLUSTRATION_SIZE', '1024x1024')
    quality = (getattr(settings, 'SPECIES_ILLUSTRATION_QUALITY', None) or '').strip()
    kwargs: dict[str, Any] = {
        'model': model,
        'prompt': prompt,
        'size': size,
        'n': 1,
    }
    # Do not pass response_format: unsupported on gpt-image-*; DALL-E returns a URL by default.
    if _is_gpt_image_model(model):
        kwargs['quality'] = quality or 'medium'
        kwargs['output_format'] = getattr(settings, 'SPECIES_ILLUSTRATION_OUTPUT_FORMAT', 'png')
    else:
        kwargs['quality'] = quality or 'standard'
    return kwargs


def _extract_image_bytes(response) -> bytes:
    if not response.data:
        raise ValueError('OpenAI returned no image data')
    item = response.data[0]
    if item.b64_json:
        return base64.b64decode(item.b64_json)
    if item.url:
        with urllib.request.urlopen(item.url, timeout=120) as resp:
            return resp.read()
    raise ValueError('OpenAI returned no image bytes or URL')


def _build_prompt(species: Species) -> str:
    latin = (species.name_latin or species.name or 'bird').strip()
    common = (species.name or '').strip()
    common_part = f' ({common})' if common and common != latin else ''
    return (
        f'Field guide style scientific illustration of {latin}{common_part}, '
        'single bird, accurate proportions and field marks, pen and ink with subtle '
        'watercolor wash, plain solid white background, no text, no watermark, '
        'no border, centered composition.'
    )


def _generate_image_bytes(prompt: str) -> bytes:
    from openai import OpenAI

    client = OpenAI(api_key=_openai_api_key())
    model = getattr(settings, 'SPECIES_ILLUSTRATION_MODEL', 'dall-e-3')
    response = client.images.generate(**_images_generate_kwargs(model, prompt))
    return _extract_image_bytes(response)


def _save_ready_illustration(ill: SpeciesIllustration, image_bytes: bytes, model_name: str) -> None:
    filename = f'species_{ill.species_id}.png'
    ill.image.save(filename, ContentFile(image_bytes), save=False)
    ill.status = SpeciesIllustration.STATUS_READY
    ill.model_name = model_name
    ill.error_message = ''
    ill.save(update_fields=['image', 'status', 'model_name', 'error_message', 'updated'])


def ensure_species_illustration(species: Species) -> None:
    """
    Ensure ``species.illustration`` exists and is ready when possible.
    Mutates/creates the related SpeciesIllustration row; safe to call from species detail view.
    """
    if not _illustration_enabled():
        return
    if not _openai_api_key():
        logger.debug('Species illustration skipped: OPENAI_API_KEY not set')
        return

    model_name = getattr(settings, 'SPECIES_ILLUSTRATION_MODEL', 'dall-e-3')

    with transaction.atomic():
        ill, created = SpeciesIllustration.objects.select_for_update().get_or_create(
            species=species,
            defaults={'status': SpeciesIllustration.STATUS_PENDING},
        )
        if not created:
            ill.refresh_from_db()

        if ill.status == SpeciesIllustration.STATUS_READY and ill.image:
            if ill.image.storage.exists(ill.image.name):
                return

        if ill.status == SpeciesIllustration.STATUS_PENDING and not created:
            # Another request is generating.
            return

        ill.status = SpeciesIllustration.STATUS_PENDING
        ill.error_message = ''
        ill.save(update_fields=['status', 'error_message', 'updated'])

    try:
        prompt = _build_prompt(species)
        image_bytes = _generate_image_bytes(prompt)
    except Exception as exc:
        logger.warning(
            'Species illustration generation failed for species %s: %s',
            species.pk,
            exc,
        )
        SpeciesIllustration.objects.filter(pk=ill.pk).update(
            status=SpeciesIllustration.STATUS_FAILED,
            error_message=str(exc)[:500],
        )
        return

    with transaction.atomic():
        ill = SpeciesIllustration.objects.select_for_update().get(pk=ill.pk)
        _save_ready_illustration(ill, image_bytes, model_name)


def get_illustration_status(species: Species) -> str:
    """Return illustration_status for API: ready, pending, failed, or missing."""
    try:
        ill = species.illustration
    except SpeciesIllustration.DoesNotExist:
        return 'missing'
    if ill.status == SpeciesIllustration.STATUS_READY and ill.image:
        return 'ready'
    if ill.status == SpeciesIllustration.STATUS_PENDING:
        return 'pending'
    if ill.status == SpeciesIllustration.STATUS_FAILED:
        return 'failed'
    return 'missing'
