"""Public media-review statistics for the data site."""

from __future__ import annotations

from datetime import datetime, timedelta

from django.db.models import Count, Exists, F, OuterRef, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone

from jizz.data_user_stats import media_reviews_per_user_rows
from jizz.games_played_stats import default_date_range, iter_periods
from jizz.marketing.pages import MEDIA_REVIEWED_APPROVED_COUNT
from jizz.models import CountrySpecies, Species
from jizz.services.checklist import CHECKLIST_COUNTRY_SPECIES_STATUSES
from media.models import IMAGE_SOURCES, MEDIA_TYPES, Media, MediaReview

_ISO2_COUNTRY = r'^[A-Za-z]{2}$'


def _pct(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round(100.0 * part / whole, 1)


def _label_from_choices(choices, value: str, empty: str = 'Unknown') -> str:
    raw = (value or '').strip()
    if not raw:
        return empty
    return dict(choices).get(raw, raw)


def review_overview() -> dict:
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    image_qs = Media.objects.filter(hide=False, type='image')
    has_review = MediaReview.objects.filter(media_id=OuterRef('pk'))
    photos = image_qs.count()
    photos_reviewed = image_qs.filter(Exists(has_review)).count()
    type_counts = {
        row['review_type']: row['n']
        for row in MediaReview.objects.values('review_type').annotate(n=Count('id'))
    }
    approved = type_counts.get(MediaReview.APPROVED, 0)
    rejected = type_counts.get(MediaReview.REJECTED, 0)
    not_sure = type_counts.get(MediaReview.NOT_SURE, 0)
    total = approved + rejected + not_sure
    decided = approved + rejected
    visible_images = Q(media__hide=False, media__type='image')
    species_with_photos_qs = (
        Species.objects.filter(visible_images)
        .annotate(
            total_photos=Count('media', filter=visible_images, distinct=True),
            photos_with_review=Count(
                'media',
                filter=visible_images & Q(media__reviews__id__isnull=False),
                distinct=True,
            ),
            approved_photos=Count(
                'media',
                filter=visible_images & Q(media__reviews__review_type=MediaReview.APPROVED),
                distinct=True,
            ),
        )
        .filter(total_photos__gt=0)
    )
    species_with_photos = species_with_photos_qs.count()
    species_ready = species_with_photos_qs.filter(
        Q(approved_photos__gte=MEDIA_REVIEWED_APPROVED_COUNT)
        | Q(photos_with_review__gte=F('total_photos'))
    ).count()
    return {
        'total_reviews': total,
        'approved': approved,
        'rejected': rejected,
        'not_sure': not_sure,
        'decided': decided,
        'approval_rate': _pct(approved, decided),
        'photos': photos,
        'photos_reviewed': photos_reviewed,
        'photos_reviewed_pct': _pct(photos_reviewed, photos),
        'species_with_photos': species_with_photos,
        'species_ready': species_ready,
        'species_ready_pct': _pct(species_ready, species_with_photos),
        'reviews_last_30_days': MediaReview.objects.filter(created__gte=month_ago).count(),
    }


def country_review_coverage_rows() -> list[dict]:
    """Visible images of checklist species, and how many have at least one review."""
    checklist = CountrySpecies.objects.filter(
        status__in=CHECKLIST_COUNTRY_SPECIES_STATUSES,
        country__code__regex=_ISO2_COUNTRY,
    )
    photo_rows = (
        checklist.filter(species__media__hide=False, species__media__type='image')
        .values('country_id', 'country__name')
        .annotate(
            photos=Count('species__media__id', distinct=True),
            reviewed=Count(
                'species__media__id',
                filter=Q(species__media__reviews__id__isnull=False),
                distinct=True,
            ),
        )
    )
    visible_images = Media.objects.filter(hide=False, type='image')
    species_with_photos = dict(
        checklist.filter(Exists(visible_images.filter(species_id=OuterRef('species_id'))))
        .values('country_id')
        .annotate(n=Count('species_id', distinct=True))
        .values_list('country_id', 'n')
    )
    species_with_review = dict(
        checklist.filter(
            Exists(
                MediaReview.objects.filter(
                    media__species_id=OuterRef('species_id'),
                    media__hide=False,
                    media__type='image',
                )
            )
        )
        .values('country_id')
        .annotate(n=Count('species_id', distinct=True))
        .values_list('country_id', 'n')
    )

    out: list[dict] = []
    for row in photo_rows:
        code = row['country_id']
        photos = row['photos'] or 0
        reviewed = row['reviewed'] or 0
        species_photos = species_with_photos.get(code) or 0
        species_reviewed = species_with_review.get(code) or 0
        out.append(
            {
                'code': code,
                'name': row['country__name'] or code,
                'photos': photos,
                'reviewed': reviewed,
                'pct': _pct(reviewed, photos),
                'species_with_photos': species_photos,
                'species_with_review': species_reviewed,
                'species_pct': _pct(species_reviewed, species_photos),
            }
        )
    out.sort(
        key=lambda item: (-item['species_pct'], -item['species_with_photos'], item['name'].lower())
    )
    return out


def reviews_by_source_rows() -> list[dict]:
    has_review = Q(reviews__id__isnull=False)
    rows = (
        Media.objects.filter(hide=False, type='image')
        .values('source')
        .annotate(
            photos=Count('id', distinct=True),
            reviewed=Count('id', filter=has_review, distinct=True),
        )
    )
    out = []
    for row in rows:
        photos = row['photos'] or 0
        reviewed = row['reviewed'] or 0
        out.append(
            {
                'source': _label_from_choices(IMAGE_SOURCES, row['source']),
                'photos': photos,
                'reviewed': reviewed,
                'pct': _pct(reviewed, photos),
            }
        )
    out.sort(key=lambda item: (-item['photos'], item['source'].lower()))
    return out


def reviews_by_media_type_rows() -> list[dict]:
    has_review = Q(reviews__id__isnull=False)
    rows = (
        Media.objects.filter(hide=False)
        .values('type')
        .annotate(
            items=Count('id', distinct=True),
            reviewed=Count('id', filter=has_review, distinct=True),
        )
    )
    out = []
    for row in rows:
        items = row['items'] or 0
        reviewed = row['reviewed'] or 0
        out.append(
            {
                'type': _label_from_choices(MEDIA_TYPES, row['type'] or 'image'),
                'items': items,
                'reviewed': reviewed,
                'pct': _pct(reviewed, items),
            }
        )
    out.sort(key=lambda item: (-item['items'], item['type'].lower()))
    return out


def reviews_by_month_rows() -> list[dict]:
    """Reviews per calendar month for the last 12 months, including months with none."""
    start, end = default_date_range()
    start_dt = timezone.make_aware(datetime.combine(start, datetime.min.time()))
    end_dt = timezone.make_aware(datetime.combine(end, datetime.max.time()))
    aggregated: dict = {}
    for row in (
        MediaReview.objects.filter(created__gte=start_dt, created__lte=end_dt)
        .annotate(month=TruncMonth('created'))
        .values('month')
        .annotate(total=Count('id'))
    ):
        month = row['month']
        if month is None:
            continue
        key = month.date().replace(day=1) if hasattr(month, 'date') else month.replace(day=1)
        aggregated[key] = row['total']
    return [
        {
            'month': period.isoformat(),
            'total': aggregated.get(period, 0),
        }
        for period in iter_periods(start, end, 'month')
    ]


def media_review_stats_payload() -> dict:
    reviewers = media_reviews_per_user_rows()
    overview = review_overview()
    overview['reviewers'] = len(reviewers)
    return {
        'overview': overview,
        'reviewers': reviewers,
        'countries': country_review_coverage_rows(),
        'sources': reviews_by_source_rows(),
        'media_types': reviews_by_media_type_rows(),
        'by_month': reviews_by_month_rows(),
    }
