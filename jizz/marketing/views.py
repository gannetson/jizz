"""Django views for the public Birdr marketing site."""

from __future__ import annotations

import logging

from django.core.cache import cache
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_GET, require_POST

from compare.generation import get_or_create_species_comparison
from compare.models import SpeciesComparison
from jizz.marketing.pages import (
    CMS_INDEX,
    DEFAULT_DESCRIPTION,
    DEFAULT_TITLE,
    INTENT_PAGES,
    MEDIA_REVIEWED_APPROVED_COUNT,
    SITE_HOME,
    base_context,
    canonical_origin,
    faq_json_ld,
    public_image_queryset,
    public_species_qs,
    site_path,
    species_approved_image_count,
)
from jizz.marketing.slugs import (
    compare_pair_slug,
    country_is_indexable,
    country_slug,
    parse_compare_pair,
)
from jizz.marketing.country_stats import confusion_pairs, country_page_stats, missed_birds
from jizz.marketing.html import markdown_to_safe_html, sanitize_html
from jizz.marketing.species_index import (
    FAMILY_LIMIT,
    SEARCH_LIMIT,
    SEARCH_MIN,
    featured_comparisons,
    public_families,
    search_public_species,
)
from jizz.models import Country, Feedback, MarketingPage, Species
from jizz.quiz_mistake_stats import get_confused_partners_for_species
from jizz.services.species_cover import species_cover_url
from media.wikimedia_urls import wikimedia_display_url

logger = logging.getLogger(__name__)


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


def _species_code(species) -> str:
    return (getattr(species, 'code', None) or '').strip()


def _ebird_url(species) -> str:
    code = _species_code(species)
    return f'https://ebird.org/species/{code}' if code else ''


def _botw_url(species) -> str:
    code = _species_code(species)
    return (
        f'https://birdsoftheworld.org/bow/species/{code}/cur/introduction'
        if code else ''
    )


_CONFUSED_SPECIES_CACHE_TTL = 6 * 60 * 60


def _confused_species_rows(species, *, limit: int = 5) -> list[dict]:
    """Top lookalikes from quiz mix-ups, with bird and compare page URLs."""
    cache_key = f'marketing-confused-species:{species.id}:{limit}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    self_slug = species.slug or ''
    rows = []
    for row in get_confused_partners_for_species(species.id, limit=limit):
        other_slug = row['slug']
        bird_url = f'/site/birds/{other_slug}/' if other_slug else ''
        compare_url = ''
        if self_slug and other_slug:
            low_slug, high_slug = (
                (self_slug, other_slug)
                if species.id < row['species_id']
                else (other_slug, self_slug)
            )
            compare_url = f'/site/compare/{compare_pair_slug(low_slug, high_slug)}/'
        rows.append({
            **row,
            'url': bird_url,
            'compare_url': compare_url,
        })
    cache.set(cache_key, rows, _CONFUSED_SPECIES_CACHE_TTL)
    return rows


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
        path=SITE_HOME,
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
def cms_index(request):
    staff = request.user.is_authenticated and request.user.is_staff
    pages = MarketingPage.objects.all() if staff else MarketingPage.objects.filter(published=True)
    context = base_context(
        request,
        title='Pages – Birdr',
        description='Guides and information about Birdr, the bird identification training app.',
        path=CMS_INDEX,
        breadcrumbs=[('Home', SITE_HOME), ('Pages', '')],
        cms_pages=pages,
        can_edit=staff,
    )
    return render(request, 'marketing/cms_index.html', context)


@require_GET
def cms_page(request, slug: str):
    page = get_object_or_404(MarketingPage, slug=slug)
    staff = request.user.is_authenticated and request.user.is_staff
    if not page.published and not staff:
        raise Http404()
    context = base_context(
        request,
        title=f'{page.title} – Birdr',
        description=page.meta_description or DEFAULT_DESCRIPTION,
        path=page.get_absolute_url(),
        breadcrumbs=[('Home', SITE_HOME), ('Pages', CMS_INDEX), (page.title, '')],
        cms_page=page,
        cms_body=sanitize_html(page.body),
        can_edit=staff,
    )
    return render(request, 'marketing/cms_page.html', context)


@require_GET
def intent_page(request, slug: str):
    page = INTENT_PAGES.get(slug)
    if page is None:
        raise Http404()
    path = site_path(slug)
    extra = {}
    if page.get('show_countries'):
        extra['countries'] = _indexable_countries()
    if slug == 'my-tricky-birds':
        missed = missed_birds(limit=8)
        pairs = confusion_pairs(limit=8)
        extra.update(
            missed_birds=missed,
            show_missed=bool(missed),
            missed_href='/data/quiz-mistakes/species/',
            confusion_pairs=pairs,
            show_pairs=bool(pairs),
            pairs_href='/data/quiz-mistakes/pairs/',
        )
    context = base_context(
        request,
        title=page['title'],
        description=page['description'],
        path=path,
        breadcrumbs=[('Home', SITE_HOME), (page['heading'], path)],
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
            ('Home', SITE_HOME),
            ('Quizzes by country', site_path('bird-quiz-by-country')),
            (country.name, path),
        ],
        country=country,
        species_count=species_count,
        quiz_href='/start/',
        challenge_href='/journey/intro',
        **country_page_stats(country, request=request),
    )
    return render(request, 'marketing/country.html', context)


@require_GET
def birds_index(request):
    path = reverse('marketing-birds')
    query = (request.GET.get('q') or '').strip()
    family_latin = (request.GET.get('family') or '').strip()
    families = public_families()
    family_names = {row['name_latin']: row for row in families}
    if family_latin not in family_names:
        family_latin = ''
    family_row = family_names.get(family_latin)
    query_too_short = bool(query) and len(query) < SEARCH_MIN
    search_query = '' if query_too_short else query
    show_results = bool(family_latin) or len(search_query) >= SEARCH_MIN
    result_limit = FAMILY_LIMIT if family_latin and not search_query else SEARCH_LIMIT
    results = (
        search_public_species(search_query, family_latin=family_latin, limit=result_limit)
        if show_results
        else []
    )
    missed = missed_birds(limit=10)
    pairs = confusion_pairs(limit=8)
    context = base_context(
        request,
        title='Bird Species – Search, Lookalikes & ID Practice | Birdr',
        description=(
            'Search Birdr’s species pages, see the birds people miss most in quizzes, '
            'and open comparisons for confusing lookalikes.'
        ),
        path=path,
        breadcrumbs=[('Home', SITE_HOME), ('Species', path)],
        query=query,
        query_too_short=query_too_short,
        family_latin=family_latin,
        family_name=family_row['name_en'] if family_row else '',
        families=families,
        show_results=show_results,
        results=results,
        result_limit=result_limit,
        species_count=public_species_qs().count(),
        missed_birds=missed,
        show_missed=bool(missed),
        missed_href='/data/quiz-mistakes/species/',
        confusion_pairs=pairs,
        show_pairs=bool(pairs),
        pairs_href='/data/quiz-mistakes/pairs/',
        featured_comparisons=featured_comparisons(),
        countries=_indexable_countries()[:16],
        quiz_href='/play',
        tricky_href='/trouble-spots',
    )
    return render(request, 'marketing/birds.html', context)


@require_GET
def bird_page(request, slug: str):
    species = get_object_or_404(Species, slug=slug)
    photos = _photo_urls(request, species, limit=2)
    cover = species_cover_url(species, request)
    if not photos and not cover:
        raise Http404()
    family = species.taxonomic_family
    order = species.taxonomic_order
    approved_image_count = species_approved_image_count(species)
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
        breadcrumbs=[
            ('Home', SITE_HOME),
            ('Species', reverse('marketing-birds')),
            (species.name, path),
        ],
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
        confused_species=_confused_species_rows(species),
        ebird_url=_ebird_url(species),
        botw_url=_botw_url(species),
        approved_image_count=approved_image_count,
        media_reviewed=approved_image_count >= MEDIA_REVIEWED_APPROVED_COUNT,
        media_review_href=f'/media-review/?species={species.id}',
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
        try:
            comparison = get_or_create_species_comparison(low, high)
        except Exception:
            logger.exception('Failed to generate comparison for %s vs %s', low.name, high.name)
            comparison = None
    path = reverse('marketing-compare', kwargs={'pair': canonical_pair})
    title = f'{low.name} vs {high.name} – How to Tell Them Apart | Birdr'
    description = (
        (comparison.summary if comparison else '')
        or f'Learn the field marks that separate {low.name} and {high.name}, then practise the pair on Birdr.'
    )
    description = ' '.join(description.replace('*', '').replace('_', '').split())
    sections = []
    detailed_html = ''
    summary_html = ''
    if comparison:
        summary_html = markdown_to_safe_html(comparison.summary)
        detailed_html = markdown_to_safe_html(comparison.detailed_comparison)
        sections = [
            ('Identification tips', markdown_to_safe_html(comparison.identification_tips)),
            ('Size', markdown_to_safe_html(comparison.size_comparison)),
            ('Plumage', markdown_to_safe_html(comparison.plumage_comparison)),
            ('Behaviour', markdown_to_safe_html(comparison.behavior_comparison)),
            ('Habitat', markdown_to_safe_html(comparison.habitat_comparison)),
            ('Voice', markdown_to_safe_html(comparison.vocalization_comparison)),
        ]
        sections = [(label, html) for label, html in sections if html]
    context = base_context(
        request,
        title=title,
        description=description[:300],
        path=path,
        breadcrumbs=[
            ('Home', SITE_HOME),
            (low.name, reverse('marketing-bird', kwargs={'slug': low.slug}) if low.slug else ''),
            (f'{low.name} vs {high.name}', path),
        ],
        left=low,
        right=high,
        left_photos=_photo_urls(request, low, limit=1),
        right_photos=_photo_urls(request, high, limit=1),
        summary_html=summary_html,
        detailed_html=detailed_html,
        sections=sections,
        practise_href='/trouble-spots',
    )
    return render(request, 'marketing/compare.html', context)


@require_POST
def site_feedback(request):
    from django.core.exceptions import ValidationError
    from jizz.feedback_email import send_feedback_notification
    from jizz.marketing.feedback import clean_email, looks_like_spam, safe_next_path

    next_path = safe_next_path(request.POST.get('next'), SITE_HOME)

    def done(flag='1'):
        return redirect(f'{next_path}?sent={flag}#help')

    comment = (request.POST.get('comment') or '').strip()
    name = (request.POST.get('name') or '').strip()[:120]
    website = request.POST.get('website') or ''
    token = request.POST.get('started') or ''

    if looks_like_spam(website=website, token=token, request=request):
        return done()
    if not comment:
        return done('missing')
    try:
        email = clean_email(request.POST.get('email') or '')
    except ValidationError:
        return done('email')

    feedback = Feedback.objects.create(
        comment=comment[:5000],
        contact_name=name,
        contact_email=email,
    )
    try:
        send_feedback_notification(feedback)
    except Exception:
        logger.exception('Marketing feedback email failed for id=%s', feedback.id)
    return done()


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
