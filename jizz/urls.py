from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import path, re_path, include
from rest_framework import routers
from rest_framework_simplejwt import views as jwt_views
from jizz.jwt_views import EmailOrUsernameTokenObtainPairView

from jizz.views import CountryDetailView, CountryViewSet, SpeciesListView, SpeciesDetailView, SpeciesCoverView, GameListView, \
    GameDetailView, GameDetailWithAnswersByPlayerTokenView, QuestionDetailView, QuestionMediaReadyView, QuestionNextMediaView, PlayerCreateView, PlayerView, PlayerLinkView, AnswerView, AnswerDetail, \
    PlayerScoreListView, \
    PlayerStatsView, FeedbackListView, QuestionView, \
    ReactionView, \
    FamilyListView, OrderListView, LanguageListView, RegisterView, ProfileView, \
    PasswordResetRequestView, PasswordResetConfirmView, OAuthCompleteView, UserGamesView, UserGameDetailView, \
    MediaListView, MediaReviewSpeciesListView, ReviewMediaView, FirstAssertionReviewView, FlagMediaView, SpeciesReviewStatsView, GoogleLoginView, AppleLoginView, \
    PageListView, PageDetailView
from jizz.data_views import (
    data_country_challenge_leaderboard_api_view,
    data_country_challenge_leaderboard_view,
    data_games_played_api_view,
    data_games_played_view,
    data_index_view,
    data_taxon_families_view,
    data_taxon_orders_view,
)
from jizz.update_views import (
    UpdateDetailView,
    UpdateEmailOpenTrackingView,
    UpdateListView,
    UpdateThumbsUpView,
)
from jizz.analytics_views import (
    UsageEventCreateView,
    staff_usage_api_view,
    staff_usage_view,
)
from jizz.quiz_mistake_views import (
    quiz_mistake_pairs_view,
    quiz_mistake_species_view,
    quiz_mistake_stats_legacy_redirect,
    staff_quiz_mistakes_redirect,
)
from jizz.birdr_journey_views import (
    BirdrJourneyView,
    BirdrJourneyDetailView,
    BirdrJourneyStartStepView,
    BirdrJourneyCompleteStepView,
    BirdrJourneyAdvanceLevelView,
    CountryChallengeLeaderboardView,
)
from jizz.checklist_views import ChecklistView
from jizz.app_version_views import AppVersionView
from jizz.daily_challenge_views import (
    FriendsListView,
    FriendRequestsListView,
    FriendRequestView,
    FriendAcceptView,
    FriendDeclineView,
    DailyChallengeCreateView,
    DailyChallengeDetailView,
    DailyChallengeInviteView,
    DailyChallengeAcceptByIdView,
    DailyChallengeDeclineView,
    DailyChallengeStartView,
    DailyChallengeRoundView,
    DailyChallengeAcceptByTokenView,
    DailyChallengeAcceptByTokenPostView,
    DeviceTokenCreateView,
    DeviceTokenDeleteView,
)
from jizz.mobile_push.views import PushRegisterView

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet, 'countries')


def apple_app_site_association(request):
    """iOS Universal Links: so https://birdr.pro/join/* opens in the app.
    Content is read from jizz/well-known/apple-app-site-association so nginx can alias to the same file."""
    import json
    from pathlib import Path
    path = Path(__file__).resolve().parent / "well-known" / "apple-app-site-association"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return JsonResponse(data, content_type="application/json")


def android_asset_links(request):
    """Android App Links: so https://birdr.pro/join/* opens in the app.
    Content is read from jizz/well-known/assetlinks.json so nginx can alias to the same file."""
    import json
    from pathlib import Path
    path = Path(__file__).resolve().parent / "well-known" / "assetlinks.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return JsonResponse(data, safe=False, content_type="application/json")


def join_challenge_redirect(request, token):
    """Try app deep link, then fall back to web app at /join/challenge/<token>/web/."""
    fallback_url = request.build_absolute_uri(f'/join/challenge/{token}/web/')
    return render(request, 'jizz/join_redirect.html', {
        'deep_link': f'birdr://join/challenge/{token}',
        'fallback_url': fallback_url,
    })


def join_game_redirect(request, token):
    """Try app deep link, then fall back to web app at /join/<token>/web/."""
    fallback_url = request.build_absolute_uri(f'/join/{token}/web/')
    return render(request, 'jizz/join_redirect.html', {
        'deep_link': f'birdr://join/{token}',
        'fallback_url': fallback_url,
    })


def open_update_redirect(request, pk):
    """Open update in the app on mobile; go straight to the website on desktop."""
    from jizz.usage_analytics import parse_device_type

    fallback_url = request.build_absolute_uri(f'/updates/{pk}')
    device = parse_device_type(request.META.get('HTTP_USER_AGENT', ''))
    if device == 'desktop':
        return HttpResponseRedirect(fallback_url)
    return render(request, 'jizz/join_redirect.html', {
        'deep_link': f'birdr://updates/{pk}',
        'fallback_url': fallback_url,
    })


def open_app_redirect(request):
    """Open Birdr home (or a mapped path) in the app on mobile; stay on web on desktop."""
    import re

    from jizz.usage_analytics import parse_device_type

    path = (request.GET.get('path') or '/').split('?')[0]
    if not path.startswith('/'):
        path = f'/{path}'

    fallback_url = request.build_absolute_uri(path)
    device = parse_device_type(request.META.get('HTTP_USER_AGENT', ''))
    if device == 'desktop':
        return HttpResponseRedirect(fallback_url)

    update_match = re.match(r'^/updates/(\d+)/?$', path)
    deep_link = f'birdr://updates/{update_match.group(1)}' if update_match else 'birdr://home'
    return render(request, 'jizz/join_redirect.html', {
        'deep_link': deep_link,
        'fallback_url': fallback_url,
    })


urlpatterns = [
    path('.well-known/apple-app-site-association', apple_app_site_association),
    path('.well-known/assetlinks.json', android_asset_links),

    path('join/challenge/<str:token>/', join_challenge_redirect, name='join-challenge'),
    path('join/<str:token>/', join_game_redirect, name='join-game'),
    path('open/update/<int:pk>/', open_update_redirect, name='open-update'),
    path('open/app/', open_app_redirect, name='open-app'),

    path('admin/', admin.site.urls),

    path('data/', data_index_view, name='data-index'),
    path('data/quiz-mistakes/', quiz_mistake_stats_legacy_redirect, name='data-quiz-mistakes'),
    path('data/quiz-mistakes/species/', quiz_mistake_species_view, name='data-quiz-mistake-species'),
    path('data/quiz-mistakes/pairs/', quiz_mistake_pairs_view, name='data-quiz-mistake-pairs'),
    path('data/taxons/orders/', data_taxon_orders_view, name='data-taxon-orders'),
    path('data/taxons/families/', data_taxon_families_view, name='data-taxon-families'),
    path('data/games-played/', data_games_played_view, name='data-games-played'),
    path('data/games-played/api/', data_games_played_api_view, name='data-games-played-api'),
    path(
        'data/country-challenge-leaderboard/',
        data_country_challenge_leaderboard_view,
        name='data-country-challenge-leaderboard',
    ),
    path(
        'data/country-challenge-leaderboard/api/',
        data_country_challenge_leaderboard_api_view,
        name='data-country-challenge-leaderboard-api',
    ),

    path('staff/quiz-mistakes/', staff_quiz_mistakes_redirect, name='quiz-mistake-stats'),
    path('staff/quiz-mistakes/species/', staff_quiz_mistakes_redirect, {'subpath': 'species'}, name='quiz-mistake-species'),
    path('staff/quiz-mistakes/pairs/', staff_quiz_mistakes_redirect, {'subpath': 'pairs'}, name='quiz-mistake-pairs'),
    path('staff/usage/', staff_usage_view, name='staff-usage'),
    path('staff/usage/api/', staff_usage_api_view, name='staff-usage-api'),
    re_path(r"^country/(?P<pk>\w+)/$", CountryDetailView.as_view(), name="country-detail"),
    re_path(r"^country/(?P<pk>\w+)/species$", CountryDetailView.as_view(), name="country-detail"),

    # JWT token routes must come before the social oauth2 include, so POST /token/ (username+password login) is handled by JWT, not OAuth2
    path('token/', EmailOrUsernameTokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('token/refresh/', jwt_views.TokenRefreshView.as_view(), name='token-refresh'),
    path('token/', include('rest_framework_social_oauth2.urls')),
    path('auth/complete/<str:backend>/', OAuthCompleteView.as_view(), name='oauth-complete'),
    path('auth/', include('social_django.urls', namespace='social')),

    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/analytics/event/', UsageEventCreateView.as_view(), name='analytics-event'),
    path('api/checklist/', ChecklistView.as_view(), name='checklist'),
    path('api/my-games/', UserGamesView.as_view(), name='user-games'),
    re_path(r'^api/my-games/(?P<token>[\w-]+)/$', UserGameDetailView.as_view(), name='user-game-detail'),
    path('api/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('api/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('api/google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('api/apple-login/', AppleLoginView.as_view(), name='apple-login'),

    path('api/', include(router.urls)),

    re_path(r"^api/languages/$", LanguageListView.as_view(), name="language-list"),
    re_path(r"^api/player/$", PlayerCreateView.as_view(), name="player-create"),
    re_path(r"^api/player/link/$", PlayerLinkView.as_view(), name="player-link"),
    re_path(r"^api/player/(?P<token>[\w-]+)/$", PlayerView.as_view(), name="player-load"),
    re_path(r"^api/player/(?P<token>[\w-]+)/stats/$", PlayerStatsView.as_view(), name="player-stats"),

    re_path(r"^api/species/$", SpeciesListView.as_view(), name="species-list"),
    re_path(r"^api/species/(?P<pk>\w+)/cover/$", SpeciesCoverView.as_view(), name="species-cover"),
    re_path(r"^api/species/(?P<pk>\w+)/$", SpeciesDetailView.as_view(), name="species-detail"),

    re_path(r"^api/games/$", GameListView.as_view(), name="game-list"),
    re_path(
        r"^api/games/(?P<token>[\w-]+)/with-answers/$",
        GameDetailWithAnswersByPlayerTokenView.as_view(),
        name="game-detail-with-answers",
    ),
    re_path(r"^api/games/(?P<token>[\w-]+)/$", GameDetailView.as_view(), name="game-detail"),
    re_path(r"^api/species/$", SpeciesListView.as_view(), name="species-list"),

    re_path(r"^api/families/$", FamilyListView.as_view(), name="family-list"),
    re_path(r"^api/orders/$", OrderListView.as_view(), name="order-list"),

    re_path(r"^api/games/(?P<token>[\w-]+)/question$", QuestionView.as_view(), name="game-question-detail"),
    re_path(r"^api/answer/$", AnswerView.as_view(), name="answer-create"),
    re_path(r"^api/answer/(?P<question>[\w-]+)/(?P<token>[\w-]+)$", AnswerDetail.as_view(), name="answer-detail"),


    re_path(r"^api/media/$", MediaListView.as_view(), name="media-list"),
    re_path(r"^api/media-review-species/$", MediaReviewSpeciesListView.as_view(), name="media-review-species"),
    path('api/review-media/first-assertion/', FirstAssertionReviewView.as_view(), name='review-media-first-assertion'),
    re_path(r"^api/review-media/$", ReviewMediaView.as_view(), name="review-media-create"),
    re_path(r"^api/flag-media/$", FlagMediaView.as_view(), name="flag-media-create"),
    re_path(r"^api/species-review-stats/$", SpeciesReviewStatsView.as_view(), name="species-review-stats"),
    path('api/pages/', PageListView.as_view(), name='page-list'),
    path('api/pages/<slug:slug>/', PageDetailView.as_view(), name='page-detail'),

    re_path(r"^api/questions/(?P<pk>\d+)/next-media/$", QuestionNextMediaView.as_view(), name="question-next-media"),
    re_path(r"^api/questions/(?P<pk>\d+)/media-ready/$", QuestionMediaReadyView.as_view(), name="question-media-ready"),
    re_path(r"^api/questions/(?P<pk>\w+)/$", QuestionDetailView.as_view(), name="question-detail"),
    re_path(r"^api/scores/$", PlayerScoreListView.as_view(), name="scores"),

    re_path(r"^api/feedback/$", FeedbackListView.as_view(), name="feedback"),
    path('api/app-version/', AppVersionView.as_view(), name='app-version'),
    re_path(r"^api/updates/$", UpdateListView.as_view(), name="updates"),
    re_path(r"^api/updates/(?P<pk>\d+)/$", UpdateDetailView.as_view(), name="update-detail"),
    re_path(r"^api/updates/(?P<pk>\d+)/thumbs-up/$", UpdateThumbsUpView.as_view(), name="update-thumbs-up"),
    path('api/updates/email-open/<uuid:token>/', UpdateEmailOpenTrackingView.as_view(), name='update-email-open'),
    re_path(r"^api/updates/reactions/$", ReactionView.as_view(), name="reactions"),

    path('api/birdr-journey/', BirdrJourneyView.as_view(), name='birdr-journey'),
    path(
        'api/birdr-journey/leaderboard/',
        CountryChallengeLeaderboardView.as_view(),
        name='birdr-journey-leaderboard',
    ),
    path(
        'api/birdr-journey/<int:journey_id>/',
        BirdrJourneyDetailView.as_view(),
        name='birdr-journey-detail',
    ),
    path(
        'api/birdr-journey/<int:journey_id>/start-step/',
        BirdrJourneyStartStepView.as_view(),
        name='birdr-journey-start-step',
    ),
    path(
        'api/birdr-journey/<int:journey_id>/complete-step/',
        BirdrJourneyCompleteStepView.as_view(),
        name='birdr-journey-complete-step',
    ),
    path(
        'api/birdr-journey/<int:journey_id>/advance-level/',
        BirdrJourneyAdvanceLevelView.as_view(),
        name='birdr-journey-advance-level',
    ),

    # Friends
    path('api/friends/', FriendsListView.as_view(), name='friends-list'),
    path('api/friends/requests/', FriendRequestsListView.as_view(), name='friends-requests'),
    path('api/friends/request/', FriendRequestView.as_view(), name='friends-request'),
    path('api/friends/accept/<int:pk>/', FriendAcceptView.as_view(), name='friends-accept'),
    path('api/friends/decline/<int:pk>/', FriendDeclineView.as_view(), name='friends-decline'),

    # Daily challenges
    path('api/daily-challenges/', DailyChallengeCreateView.as_view(), name='daily-challenge-list-create'),
    path('api/daily-challenges/accept-by-token/', DailyChallengeAcceptByTokenPostView.as_view(), name='daily-challenge-accept-by-token'),
    re_path(r'^api/daily-challenges/accept/(?P<token>[\w-]+)/$', DailyChallengeAcceptByTokenView.as_view(), name='daily-challenge-accept-by-token-get'),
    re_path(r'^api/daily-challenges/(?P<pk>\d+)/$', DailyChallengeDetailView.as_view(), name='daily-challenge-detail'),
    path('api/daily-challenges/<int:pk>/invite/', DailyChallengeInviteView.as_view(), name='daily-challenge-invite'),
    path('api/daily-challenges/<int:pk>/accept/', DailyChallengeAcceptByIdView.as_view(), name='daily-challenge-accept'),
    path('api/daily-challenges/<int:pk>/decline/', DailyChallengeDeclineView.as_view(), name='daily-challenge-decline'),
    path('api/daily-challenges/<int:pk>/start/', DailyChallengeStartView.as_view(), name='daily-challenge-start'),
    path('api/daily-challenges/<int:pk>/rounds/<int:day>/', DailyChallengeRoundView.as_view(), name='daily-challenge-round'),

    # Device tokens (push)
    path('api/device-tokens/', DeviceTokenCreateView.as_view(), name='device-token-create'),
    path('api/device-tokens/<int:pk>/', DeviceTokenDeleteView.as_view(), name='device-token-delete'),
    path('api/mobile/push/register/', PushRegisterView.as_view(), name='mobile-push-register'),

    # Compare app URLs
    path('api/compare/', include('compare.urls')),
]

urlpatterns += router.urls

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
