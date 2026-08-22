"""Django views for the public Birdr marketing site."""

from __future__ import annotations

from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_GET

from compare.models import SpeciesComparison
from jizz.marketing.pages import (
    DEFAULT_DESCRIPTION,
    DEFAULT_TITLE,
    INTENT_PAGES,
    base_context,
    canonical_origin,
    faq_json_ld,
    public_image_queryset,
)
from jizz.marketing.slugs import (
    compare_pair_slug,
    country_is_indexable,
    country_slug,
    parse_compare_pair,
)
from jizz.models import Country, Species
from jizz.services.species_cover import species_cover_url
from media.wikimedia_urls import wikimedia_display_url


def _indexable_countries():
    from django.db.models import Count

    rows = []
    seen_slugs = {}
    qs = (
        Country.objects.annotate(species_n=Count('countryspecies'))
        .filter(species_n__gt=0)
        .order_by('name')
    )
    for country in qs:
        if not country_is_indexable(country):
            continue
        slug = country_slug(country)
        if slug in seen_slugs:
            slug = f'{slug}-{country.code.lower()}'
        seen_slugs[slug] = country.code
        rows.append({
            'name': country.name,
            'code': country.code,
            'slug': slug,
            'count': country.species_n,
            'url': reverse('marketing-country', kwargs={'slug': slug}),
        })
    return rows


def _country_by_slug(slug: str):
    for country in Country.objects.all():
        if not country_is_indexable(country):
            continue
        base = country_slug(country)
        if slug in (base, f'{base}-{country.code.lower()}'):
            return country
    return None


def _photo_urls(request, species, limit=2):
    photos = []
    for media in public_image_queryset(species)[:limit]:
        if not media.url:
            continue
        url = wikimedia_display_url(media.url) or media.url
        photos.append({
            'url': url,
            'alt': f'{species.name} ({species.name_latin})',
        })
    return photos


@require_GET
def landing(request):
    context = base_context(
        request,
        title=DEFAULT_TITLE,
        description=DEFAULT_DESCRIPTION,
        path='/',
        extra_json_ld=[faq_json_ld()],
        heading='Learn to identify birds yourself.',
        supporting=(
            'Free photo quizzes, personalised practice and country challenges '
            'for birders worldwide.'
        ),
        countries=_indexable_countries()[:12],
    )
    return render(request, 'marketing/landing.html', context)


@require_GET
def intent_page(request, slug: str):
    page = INTENT_PAGES.get(slug)
    if page is None:
        raise Http404()
    path = f'/{slug}/'
    extra = {}
    if page.get('show_countries'):
        extra['countries'] = _indexable_countries()
    context = base_context(
        request,
        title=page['title'],
        description=page['description'],
        path=path,
        breadcrumbs=[('Home', '/'), (page['heading'], path)],
        extra_json_ld=[faq_json_ld()] if slug in ('birding-app', 'learn-bird-identification') else None,
        heading=page['heading'],
        lead=page['lead'],
        body_paragraphs=page['body'],
        cta_href=page['cta_href'],
        cta_label=page['cta_label'],
        related_links=page['links'],
        **extra,
    )
    return render(request, 'marketing/intent.html', context)


@require_GET
def country_page(request, slug: str):
    country = _country_by_slug(slug)
    if country is None:
        raise Http404()
    species_count = country.countryspecies.count()
    if species_count < 1:
        raise Http404()
    path = reverse('marketing-country', kwargs={'slug': slug})
    title = f'Bird Quiz: {country.name} – Identify the Birds | Birdr'
    description = (
        f'Learn to identify the birds of {country.name} with free photo quizzes and a '
        f'Country Challenge. {species_count} species on the Birdr list.'
    )
    context = base_context(
        request,
        title=title,
        description=description,
        path=path,
        breadcrumbs=[
            ('Home', '/'),
            ('Quizzes by country', '/bird-quiz-by-country/'),
            (country.name, path),
        ],
        country=country,
        species_count=species_count,
        quiz_href='/start/',
        challenge_href='/journey/intro',
    )
    return render(request, 'marketing/country.html', context)


@require_GET
def bird_page(request, slug: str):
    species = get_object_or_404(Species, slug=slug)
    photos = _photo_urls(request, species, limit=2)
    cover = species_cover_url(species, request)
    if not photos and not cover:
        raise Http404()
    family = species.taxonomic_family
    order = species.taxonomic_order
    path = reverse('marketing-bird', kwargs={'slug': slug})
    title = f'{species.name} ({species.name_latin}) – Bird ID Practice | Birdr'
    description = (
        f'Learn to identify {species.name} ({species.name_latin}) with photo quizzes '
        'and personalised practice on Birdr.'
    )
    context = base_context(
        request,
        title=title,
        description=description,
        path=path,
        breadcrumbs=[('Home', '/'), (species.name, path)],
        species=species,
        photos=photos,
        cover_url=cover,
        family_name=family.name_en if family else '',
        family_latin=family.name_latin if family else '',
        order_name=order.name_en if order else '',
        order_latin=order.name_latin if order else '',
        family_blurb=(family.description_en if family else '') or '',
        order_blurb=(order.description_en if order else '') or '',
        quiz_href='/start/',
        tricky_href='/trouble-spots',
    )
    return render(request, 'marketing/bird.html', context)


@require_GET
def compare_page(request, pair: str):
    parsed = parse_compare_pair(pair)
    if parsed is None:
        raise Http404()
    slug_a, slug_b = parsed
    species_a = Species.objects.filter(slug=slug_a).first()
    species_b = Species.objects.filter(slug=slug_b).first()
    if species_a is None or species_b is None:
        raise Http404()
    low, high = (species_a, species_b) if species_a.id < species_b.id else (species_b, species_a)
    canonical_pair = compare_pair_slug(low.slug, high.slug)
    if pair != canonical_pair:
        return redirect('marketing-compare', pair=canonical_pair, permanent=True)
    comparison = (
        SpeciesComparison.objects.filter(
            comparison_type='species',
            species_1=low,
            species_2=high,
        ).first()
        or SpeciesComparison.objects.filter(
            comparison_type='species',
            species_1=high,
            species_2=low,
        ).first()
    )
    if comparison is None:
        raise Http404()
    path = reverse('marketing-compare', kwargs={'pair': canonical_pair})
    title = f'{low.name} vs {high.name} – How to Tell Them Apart | Birdr'
    description = (
        comparison.summary
        or f'Learn the field marks that separate {low.name} and {high.name}, then practise the pair on Birdr.'
    )
    sections = [
        ('Size', comparison.size_comparison),
        ('Plumage', comparison.plumage_comparison),
        ('Behaviour', comparison.behavior_comparison),
        ('Habitat', comparison.habitat_comparison),
        ('Voice', comparison.vocalization_comparison),
        ('Identification tips', comparison.identification_tips),
    ]
    context = base_context(
        request,
        title=title,
        description=description[:300],
        path=path,
        breadcrumbs=[
            ('Home', '/'),
            (low.name, reverse('marketing-bird', kwargs={'slug': low.slug}) if low.slug else ''),
            (f'{low.name} vs {high.name}', path),
        ],
        left=low,
        right=high,
        left_photos=_photo_urls(request, low, limit=1),
        right_photos=_photo_urls(request, high, limit=1),
        summary=comparison.summary,
        detailed=comparison.detailed_comparison,
        sections=[(label, text) for label, text in sections if text],
        practise_href='/trouble-spots',
    )
    return render(request, 'marketing/compare.html', context)


@require_GET
def robots_txt(request):
    origin = canonical_origin(request)
    body = (
        'User-agent: *\n'
        'Allow: /\n'
        'Disallow: /admin/\n'
        'Disallow: /api/\n'
        'Disallow: /token/\n'
        f'Sitemap: {origin}/sitemap.xml\n'
    )
    return HttpResponse(body, content_type='text/plain; charset=utf-8')


def marketing_404(request, exception=None):
    context = base_context(
        request,
        title='Page not found · Birdr',
        description='This page is not available on Birdr.',
        path=request.path,
        heading='Page not found',
    )
    return render(request, 'marketing/404.html', context, status=404)
