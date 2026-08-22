"""Helpers for the public species index page."""

from __future__ import annotations

from django.db.models import Count, Q

from compare.models import SpeciesComparison
from jizz.marketing.pages import public_species_qs
from jizz.marketing.slugs import compare_pair_slug
from jizz.models import TaxonomicFamily

SEARCH_MIN = 2
SEARCH_LIMIT = 40
FAMILY_LIMIT = 80


def search_public_species(query: str, *, family_latin: str = '', limit: int = SEARCH_LIMIT):
    qs = public_species_qs()
    if family_latin:
        qs = qs.filter(taxonomic_family__name_latin=family_latin)
    q = (query or '').strip()
    if q:
        qs = qs.filter(
            Q(name__icontains=q)
            | Q(name_latin__icontains=q)
            | Q(name_nl__icontains=q)
            | Q(code__icontains=q)
        )
    return list(
        qs.order_by('name').only('id', 'name', 'name_latin', 'slug', 'code')[:limit]
    )


def public_families() -> list[dict]:
    return list(
        TaxonomicFamily.objects.filter(species__in=public_species_qs())
        .annotate(species_n=Count('species', distinct=True))
        .filter(species_n__gt=0)
        .order_by('name_en')
        .values('name_en', 'name_latin', 'species_n')
    )


def featured_comparisons(*, limit: int = 6) -> list[dict]:
    rows = []
    qs = (
        SpeciesComparison.objects.filter(comparison_type='species')
        .exclude(summary='')
        .select_related('species_1', 'species_2')
        .order_by('-id')
    )
    for comparison in qs:
        left = comparison.species_1
        right = comparison.species_2
        if not left or not right or not left.slug or not right.slug:
            continue
        rows.append(
            {
                'left_name': left.name,
                'right_name': right.name,
                'summary': comparison.summary,
                'url': f'/site/compare/{compare_pair_slug(left.slug, right.slug)}/',
            }
        )
        if len(rows) >= limit:
            break
    return rows
