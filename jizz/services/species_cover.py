"""
Cover image for species UI: AI illustration when ready, else first eligible photo.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from django.conf import settings

from jizz.models import SpeciesIllustration
from jizz.services.species_illustration import get_illustration_status
from media.models import Media

if TYPE_CHECKING:
    from jizz.models import Species


def absolute_media_url(url: str, request=None) -> str:
    """Turn a FileField .url (often /media/...) into an absolute HTTPS URL for clients."""
    if not url:
        return url
    if url.startswith('http://') or url.startswith('https://'):
        if not getattr(settings, 'DEBUG', True) and url.startswith('http://'):
            return 'https://' + url[7:]
        return url
    if request:
        built = request.build_absolute_uri(url)
        if not getattr(settings, 'DEBUG', True) and built.startswith('http://'):
            return 'https://' + built[7:]
        return built
    site = getattr(settings, 'SITE_URL', 'https://birdr.pro').rstrip('/')
    if url.startswith('/'):
        return site + url
    return url


def _absolute_url(url: str, request) -> str:
    return absolute_media_url(url, request)


def _stored_illustration_url(species: Species, request) -> str | None:
    if get_illustration_status(species) != 'ready':
        return None
    try:
        ill = species.illustration
    except SpeciesIllustration.DoesNotExist:
        return None
    if not ill.image:
        return None
    return _absolute_url(ill.image.url, request)


def _first_eligible_image_url(species: Species, request) -> str | None:
    base = Media.objects.filter(species=species, type='image', hide=False)
    approved = (
        base.filter(reviews__review_type='approved')
        .distinct()
        .order_by('id')
        .first()
    )
    media = approved
    if not media:
        media = base.exclude(reviews__review_type='rejected').order_by('id').first()
    if not media or not media.url:
        return None
    return media.url


def species_cover_url(species: Species, request=None) -> str | None:
    """Illustration URL if ready, otherwise the first eligible species photo."""
    url = _stored_illustration_url(species, request)
    if url:
        return url
    return _first_eligible_image_url(species, request)


def species_cover_urls_bulk(species_ids: list[int], request=None) -> dict[int, str | None]:
    if not species_ids:
        return {}

    urls: dict[int, str | None] = {}
    rows = SpeciesIllustration.objects.filter(
        species_id__in=species_ids,
        status=SpeciesIllustration.STATUS_READY,
    ).exclude(image='')
    for ill in rows:
        if ill.image:
            urls[ill.species_id] = _absolute_url(ill.image.url, request)

    missing = [sid for sid in species_ids if sid not in urls]
    if not missing:
        return urls

    approved = (
        Media.objects.filter(
            species_id__in=missing,
            type='image',
            hide=False,
            reviews__review_type='approved',
        )
        .distinct()
        .order_by('species_id', 'id')
    )
    for media in approved:
        if media.species_id not in urls and media.url:
            urls[media.species_id] = media.url

    still_missing = [sid for sid in missing if sid not in urls]
    if still_missing:
        fallback = (
            Media.objects.filter(species_id__in=still_missing, type='image', hide=False)
            .exclude(reviews__review_type='rejected')
            .order_by('species_id', 'id')
        )
        for media in fallback:
            if media.species_id not in urls and media.url:
                urls[media.species_id] = media.url

    return urls
