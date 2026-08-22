"""Sitemap index and section XML for public marketing URLs."""

from __future__ import annotations

from django.http import HttpResponse
from django.urls import reverse

from compare.models import SpeciesComparison
from jizz.marketing.pages import INTENT_PAGES, canonical_origin, public_species_qs
from jizz.marketing.slugs import compare_pair_slug
from jizz.marketing.views import _indexable_countries


def _urlset(urls: list[str]) -> str:
    items = '\n'.join(f'  <url><loc>{u}</loc></url>' for u in urls)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'{items}\n'
        '</urlset>\n'
    )


def _index(locs: list[str]) -> str:
    items = '\n'.join(f'  <sitemap><loc>{u}</loc></sitemap>' for u in locs)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'{items}\n'
        '</sitemapindex>\n'
    )


def _xml(body: str) -> HttpResponse:
    return HttpResponse(body, content_type='application/xml; charset=utf-8')


def sitemap_index(request):
    origin = canonical_origin(request)
    locs = [
        origin + reverse('marketing-sitemap-pages'),
        origin + reverse('marketing-sitemap-countries'),
        origin + reverse('marketing-sitemap-birds'),
        origin + reverse('marketing-sitemap-compare'),
    ]
    return _xml(_index(locs))


def sitemap_pages(request):
    origin = canonical_origin(request)
    urls = [origin + '/']
    for slug in INTENT_PAGES:
        urls.append(f'{origin}/{slug}/')
    return _xml(_urlset(urls))


def sitemap_countries(request):
    origin = canonical_origin(request)
    urls = [origin + row['url'] for row in _indexable_countries()]
    return _xml(_urlset(urls))


def sitemap_birds(request):
    origin = canonical_origin(request)
    urls = [
        origin + reverse('marketing-bird', kwargs={'slug': slug})
        for slug in public_species_qs().exclude(slug='').values_list('slug', flat=True)
    ]
    return _xml(_urlset(urls))


def sitemap_compare(request):
    origin = canonical_origin(request)
    urls = []
    seen = set()
    comparisons = SpeciesComparison.objects.filter(
        comparison_type='species',
        species_1__isnull=False,
        species_2__isnull=False,
    ).select_related('species_1', 'species_2')
    for row in comparisons:
        a, b = row.species_1, row.species_2
        if not a.slug or not b.slug:
            continue
        low, high = (a, b) if a.id < b.id else (b, a)
        pair = compare_pair_slug(low.slug, high.slug)
        if pair in seen:
            continue
        seen.add(pair)
        urls.append(origin + reverse('marketing-compare', kwargs={'pair': pair}))
    return _xml(_urlset(urls))
