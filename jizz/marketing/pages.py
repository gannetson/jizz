"""Shared marketing page metadata and URL helpers."""

from __future__ import annotations

import json
from urllib.parse import quote

from django.conf import settings
from django.db import OperationalError, ProgrammingError
from django.db.models import Q
from django.utils.safestring import mark_safe

from jizz.marketing.slugs import country_is_indexable
from jizz.marketing.testimonials import FAQ, TESTIMONIALS
from jizz.models import Country, MarketingPage, Species

SITE_NAME = 'Birdr'
SITE_HOME = '/site/'
CMS_INDEX = '/site/page/'
DEFAULT_TITLE = 'Birdr – Free Bird Identification Quiz & Training App'
# Species media is treated as reviewed once this many images are accepted.
MEDIA_REVIEWED_APPROVED_COUNT = 10


def site_path(*parts: str) -> str:
    """Public marketing URL under /site/."""
    if not parts:
        return SITE_HOME
    return SITE_HOME + '/'.join(part.strip('/') for part in parts) + '/'


def cms_path(slug: str | None = None) -> str:
    """Staff-editable CMS page under /site/page/."""
    if not slug:
        return CMS_INDEX
    return site_path('page', slug)


DEFAULT_DESCRIPTION = (
    'Learn to identify birds through photo quizzes, country challenges and '
    'personalised training. Birdr is free on iPhone, Android and the web.'
)
OG_IMAGE_PATH = '/images/birdr-start-game.png'

INTENT_PAGES = {
    'how-it-works': {
        'title': 'How Birdr Works – Quizzes, Practice & Country Challenges',
        'description': (
            'See how Birdr teaches bird identification: photo quizzes, My Tricky Birds '
            'and Country Challenges. Free on iPhone, Android and the web.'
        ),
        'heading': 'How Birdr works',
        'lead': (
            'Birdr is a training loop, not a camera that names the bird for you. '
            'You look, you guess, you learn the field marks—then the hard species come back.'
        ),
        'cta_href': '/play',
        'cta_label': 'Try a quiz in the browser',
        'body': [
            (
                'Start with a photo quiz. You choose a country list and a level. Each question '
                'is a real photograph (or video or sound). Pick the species, then see whether '
                'you were right and what to look for next time.'
            ),
            (
                'Misses are not wasted. My Tricky Birds remembers the species and confusing '
                'pairs you mix up, so later sessions spend time where it actually helps.'
            ),
            (
                'When you want a path rather than a one-off game, take a Country Challenge. '
                'Levels move from distinctive beginners to expert lookalikes on that country’s list.'
            ),
            (
                'The iPhone and Android apps are the best place to practise daily. The website '
                'at /play is there if you want to try a quiz first, or play on a laptop.'
            ),
        ],
        'levels': [
            {
                'name': 'Beginner',
                'description': (
                    'Very easy multiple choice. Only familiar, distinctive species, so you can '
                    'learn the obvious birds first.'
                ),
            },
            {
                'name': 'Novice',
                'description': (
                    'Still easy multiple choice, but the pool includes regular species, not only '
                    'the most common ones.'
                ),
            },
            {
                'name': 'Advanced',
                'description': (
                    'Multiple choice with similar-looking birds mixed in. Built around the '
                    'regular species of the country.'
                ),
            },
            {
                'name': 'Pro',
                'description': (
                    'The same lookalike multiple choice, now including rare species.'
                ),
            },
            {
                'name': 'Expert',
                'description': (
                    'Type the name yourself, with autocomplete. Includes rare birds.'
                ),
            },
        ],
        'links': [
            ('/site/bird-identification-quiz/', 'Photo quizzes'),
            ('/site/my-tricky-birds/', 'My Tricky Birds'),
            ('/site/bird-quiz-by-country/', 'Country Challenges'),
            ('/site/birding-app/', 'Get the app'),
        ],
    },
    'bird-identification-quiz': {
        'title': 'Bird Identification Quiz – Free Photo Quizzes | Birdr',
        'description': (
            'Take a free bird identification quiz with real photos. Train on the birds '
            'of any country, from beginner to expert, on iPhone, Android and the web.'
        ),
        'heading': 'Bird identification quiz',
        'lead': (
            'Learn to identify birds yourself with short photo quizzes. Each round shows '
            'a real photograph and asks you to pick the species—then explains what to look for.'
        ),
        'cta_href': '/play',
        'cta_label': 'Start a quiz',
        'body': [
            (
                'Quizzes use photos from the wild, not cartoons. Choose a country list, '
                'a difficulty, and how long you want to play. Beginners get distinctive '
                'species; higher levels mix in lookalikes.'
            ),
            (
                'Play on your own, or start a live quiz and compete in real time against '
                'each other on the same birds. Speed is important: you get more points '
                'when you answer fast.'
            ),
            (
                'When you miss a bird, Birdr can send you back to My Tricky Birds so those '
                'species show up again until they stick. That is training, not a one-off score.'
            ),
        ],
        'links': [
            ('/site/learn-bird-identification/', 'Learn bird identification'),
            ('/site/bird-quiz-by-country/', 'Quizzes by country'),
            ('/site/my-tricky-birds/', 'My Tricky Birds'),
        ],
    },
    'learn-bird-identification': {
        'title': 'Learn Bird Identification – Practice That Sticks | Birdr',
        'description': (
            'Learn bird identification with personalised practice, confusing-pair drills '
            'and country challenges. Free on iPhone, Android and the web.'
        ),
        'heading': 'Learn bird identification yourself',
        'lead': (
            'Automatic photo IDs are useful in the field. Birdr is for the other skill: '
            'recognising birds when you next see them, without handing the photo to an app.'
        ),
        'cta_href': '/play',
        'cta_label': 'Start practising',
        'body': [
            (
                'You learn by doing: photo quizzes, Country Challenges with rising levels, '
                'and extra practice on the species you actually mix up.'
            ),
            (
                'Comparisons for confusing pairs (for example sparrowhawk and goshawk) '
                'explain the field marks, then you can practise that pair until it is automatic.'
            ),
        ],
        'links': [
            ('/site/bird-identification-quiz/', 'Bird identification quiz'),
            ('/site/birding-app/', 'Birding training app'),
            ('/site/my-tricky-birds/', 'Practise difficult birds'),
        ],
    },
    'bird-quiz-by-country': {
        'title': 'Bird Quizzes by Country – Country Challenges | Birdr',
        'description': (
            'Play bird quizzes by country and take Country Challenges from easy to expert. '
            'Study the birds you will meet at home or on your next trip.'
        ),
        'heading': 'Bird quizzes by country',
        'lead': (
            'Every country list is a different classroom. Quiz on the birds of the '
            'Netherlands, Colombia, Japan or wherever you bird—then take a Country Challenge.'
        ),
        'cta_href': '/journey/intro',
        'cta_label': 'Start a Country Challenge',
        'body': [
            (
                'A Country Challenge walks you through levels, from common and distinctive '
                'species to harder lookalikes. It is a structured way to learn a country list, '
                'not a random mix of world birds.'
            ),
            (
                'Use a one-off quiz when you want a short session, or a challenge when you '
                'want to work through a country properly.'
            ),
        ],
        'links': [
            ('/site/bird-identification-quiz/', 'Photo quizzes'),
            ('/site/birding-app/', 'The Birdr app'),
            ('/site/flocks/', 'Flocks for clubs'),
        ],
        'show_countries': True,
    },
    'birding-app': {
        'title': 'Birding Training App – Free on iPhone, Android & Web | Birdr',
        'description': (
            'Birdr is a free birding training app: photo quizzes, country challenges and '
            'personalised practice so you learn to identify birds yourself.'
        ),
        'heading': 'A birding app for learning, not auto-ID',
        'lead': (
            'Birdr is a training app for birders. Free photo quizzes, personalised practice '
            'and country challenges on iPhone, Android and the web.'
        ),
        'cta_href': '/play',
        'cta_label': 'Open Birdr',
        'body': [
            (
                'Use it on a commute, before a trip, or after a confusing day in the field. '
                'The same account works in the apps and in the browser.'
            ),
            (
                'Clubs can play together in Flocks. Friends can run a Daily Challenge. '
                'You can drill My Tricky Birds until the hard species stop being hard.'
            ),
        ],
        'links': [
            ('/site/bird-identification-quiz/', 'Photo quizzes'),
            ('/site/flocks/', 'Flocks'),
            ('/site/learn-bird-identification/', 'How Birdr teaches'),
        ],
    },
    'flocks': {
        'title': 'Bird Club Quiz & Leaderboard – Flocks | Birdr',
        'description': (
            'Create a Flock for your bird club. Each week is a new 25-question quiz '
            'that starts easy and finishes difficult, with a private leaderboard. Free on Birdr.'
        ),
        'heading': 'Flocks: quizzes for bird clubs',
        'lead': (
            'A Flock is your club, WhatsApp group or trip companions on Birdr. Each week '
            'you play the same 25-question quiz, compare scores, and keep a leaderboard.'
        ),
        'cta_href': '/flocks/intro',
        'cta_label': 'Create or join a Flock',
        'body': [
            (
                'Every week is a new game: 25 questions that start easy and finish '
                'difficult, so everyone should get some answers right — beginners included.'
            ),
            (
                'Admins set a country and a challenge. Members play on their phones or on '
                'the web. Results can be shared without opening the whole club to the public.'
            ),
            (
                'It is built for real groups of birders, not a global anonymous ladder. '
                'Start from the app or the web after you sign in.'
            ),
        ],
        'links': [
            ('/site/bird-identification-quiz/', 'Photo quizzes'),
            ('/site/bird-quiz-by-country/', 'Country quizzes'),
            ('/play', 'Open the app'),
        ],
    },
    'my-tricky-birds': {
        'title': 'Practise Difficult Bird Species – My Tricky Birds | Birdr',
        'description': (
            'Practise the bird species you mix up. My Tricky Birds and confusing-pair '
            'drills turn mistakes into focused training.'
        ),
        'heading': 'My Tricky Birds',
        'lead': (
            'Everyone has a handful of species that will not stick. Birdr keeps those '
            'trouble spots and the confusing pairs you mix up, so practice stays focused.'
        ),
        'cta_href': '/trouble-spots',
        'cta_label': 'Open My Tricky Birds',
        'body': [
            (
                'After quizzes, wrong answers feed a personal list. You can practise a '
                'single species or a pair (for example two Accipiters) until the field marks '
                'feel obvious.'
            ),
            (
                'That is the point of Birdr: not a high score on birds you already know, '
                'but time spent on the difficult ones.'
            ),
        ],
        'links': [
            ('/site/learn-bird-identification/', 'Learn bird identification'),
            ('/site/bird-identification-quiz/', 'Photo quizzes'),
            ('/play', 'Start a quiz'),
        ],
    },
}


def canonical_origin(request) -> str:
    site = (getattr(settings, 'SITE_URL', None) or '').rstrip('/')
    if site:
        return site
    return request.build_absolute_uri('/').rstrip('/')


def canonical_url(request, path: str) -> str:
    if not path.startswith('/'):
        path = '/' + path
    return canonical_origin(request) + path


def store_urls() -> tuple[str, str]:
    return (
        getattr(settings, 'APP_STORE_URL', 'https://apps.apple.com/us/app/birdr/id6745144189'),
        getattr(settings, 'PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=pro.birdr.app'),
    )


def public_species_qs():
    """Species with a slug, public photo, and membership on a real country list."""
    indexable_codes = [c.code for c in Country.objects.all() if country_is_indexable(c)]
    return (
        Species.objects.filter(
            media__type='image',
            media__hide=False,
            countryspecies__country_id__in=indexable_codes,
        )
        .exclude(Q(slug='') | Q(slug__isnull=True))
        .distinct()
    )


def public_image_queryset(species):
    approved = species.media.filter(type='image', hide=False, reviews__review_type='approved').distinct()
    if approved.exists():
        return approved.order_by('id')
    return species.media.filter(type='image', hide=False).exclude(reviews__review_type='rejected').order_by('id')


def species_approved_image_count(species) -> int:
    return (
        species.media.filter(type='image', hide=False, reviews__review_type='approved')
        .distinct()
        .count()
    )


def application_json_ld(origin: str, app_store_url: str, play_store_url: str) -> list[dict]:
    offer = {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}
    return [
        {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            'name': SITE_NAME,
            'url': origin + SITE_HOME,
            'applicationCategory': 'EducationalApplication',
            'operatingSystem': 'Web',
            'description': DEFAULT_DESCRIPTION,
            'offers': offer,
        },
        {
            '@context': 'https://schema.org',
            '@type': 'MobileApplication',
            'name': SITE_NAME,
            'operatingSystem': 'iOS',
            'applicationCategory': 'EducationalApplication',
            'description': DEFAULT_DESCRIPTION,
            'offers': offer,
            'installUrl': app_store_url,
        },
        {
            '@context': 'https://schema.org',
            '@type': 'MobileApplication',
            'name': SITE_NAME,
            'operatingSystem': 'Android',
            'applicationCategory': 'EducationalApplication',
            'description': DEFAULT_DESCRIPTION,
            'offers': offer,
            'installUrl': play_store_url,
        },
    ]


def faq_json_ld() -> dict:
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': item['question'],
                'acceptedAnswer': {'@type': 'Answer', 'text': item['answer']},
            }
            for item in FAQ
        ],
    }


def breadcrumb_json_ld(origin: str, crumbs: list[tuple[str, str]]) -> dict:
    elements = []
    for i, (name, path) in enumerate(crumbs, start=1):
        item = {'@type': 'ListItem', 'position': i, 'name': name}
        if path:
            item['item'] = origin + path
        elements.append(item)
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': elements,
    }


def dumps_json_ld(blocks: list[dict]) -> str:
    if len(blocks) == 1:
        payload = blocks[0]
    else:
        graph = []
        for block in blocks:
            item = {k: v for k, v in block.items() if k != '@context'}
            graph.append(item)
        payload = {'@context': 'https://schema.org', '@graph': graph}
    return mark_safe(json.dumps(payload, ensure_ascii=False))


def nav_section_for_path(path: str) -> str:
    """Which primary nav item the current marketing URL belongs to."""
    current = path or ''
    if current.startswith('/site/how-it-works/'):
        return 'how-it-works'
    if current.startswith('/site/bird-identification-quiz/'):
        return 'quizzes'
    if current.startswith('/site/birds/') or current.startswith('/site/compare/'):
        return 'species'
    if current.startswith('/site/bird-quiz-by-country/') or current.startswith('/site/countries/'):
        return 'countries'
    if current.startswith('/site/flocks/'):
        return 'flocks'
    return ''


def _nav_user_name(user) -> str:
    if not user or not getattr(user, 'is_authenticated', False):
        return ''
    from compare.community import display_name_for_user

    return display_name_for_user(user)


def base_context(request, *, title: str, description: str, path: str, breadcrumbs=None, extra_json_ld=None, **extra):
    origin = canonical_origin(request)
    app_store_url, play_store_url = store_urls()
    og_image = canonical_url(request, OG_IMAGE_PATH)
    json_ld = application_json_ld(origin, app_store_url, play_store_url)
    if breadcrumbs:
        json_ld.append(breadcrumb_json_ld(origin, breadcrumbs))
    if extra_json_ld:
        json_ld.extend(extra_json_ld)
    return {
        'site_name': SITE_NAME,
        'page_title': title,
        'meta_description': description,
        'canonical_url': canonical_url(request, path),
        'og_image': og_image,
        'app_store_url': app_store_url,
        'play_store_url': play_store_url,
        'json_ld': dumps_json_ld(json_ld),
        'breadcrumbs': breadcrumbs or [],
        'google_site_verification': getattr(settings, 'GOOGLE_SITE_VERIFICATION', '') or '',
        'bing_site_verification': getattr(settings, 'BING_SITE_VERIFICATION', '') or '',
        'testimonials': TESTIMONIALS,
        'faq': FAQ,
        'home_url': SITE_HOME,
        'cms_index_url': CMS_INDEX,
        'cms_nav_pages': _cms_nav_pages(),
        'nav_section': nav_section_for_path(path),
        'feedback_started': _feedback_started_token(),
        'can_edit': bool(
            getattr(request, 'user', None)
            and request.user.is_authenticated
            and request.user.is_staff
        ),
        'nav_user_name': _nav_user_name(getattr(request, 'user', None)),
        'nav_is_staff': bool(
            getattr(request, 'user', None)
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        ),
        'login_href': f'/login?next={quote(getattr(request, "path", path) or path)}',
        **extra,
    }


def _cms_nav_pages():
    try:
        return list(
            MarketingPage.objects.filter(published=True, show_in_nav=True).order_by(
                'nav_order', 'title'
            )
        )
    except (OperationalError, ProgrammingError):
        return []


def _feedback_started_token():
    from jizz.marketing.feedback import issue_started_token

    return issue_started_token()
