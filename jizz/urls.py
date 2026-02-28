from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse, HttpResponseRedirect
from django.urls import path, re_path, include
from rest_framework import routers
from rest_framework_simplejwt import views as jwt_views

from jizz.views import CountryDetailView, CountryViewSet, SpeciesListView, SpeciesDetailView, GameListView, \
    GameDetailView, QuestionDetailView, PlayerCreateView, PlayerView, PlayerLinkView, AnswerView, AnswerDetail, \
    PlayerScoreListView, \
    PlayerStatsView, FeedbackListView, UpdateView, CountryChallengeViewSet, QuestionView, \
    ReactionView, \
    AddChallengeLevelView, FamilyListView, OrderListView, LanguageListView, RegisterView, ProfileView, \
    PasswordResetRequestView, PasswordResetConfirmView, OAuthCompleteView, UserGamesView, UserGameDetailView, \
    MediaListView, ReviewMediaView, FlagMediaView, SpeciesReviewStatsView, GoogleLoginView, AppleLoginView, \
    PageListView, PageDetailView
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

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet, 'countries')
router.register(r'country-challenges', CountryChallengeViewSet, basename='country-challenge')

def apple_app_site_association(request):
    """iOS Universal Links configuration."""
    return JsonResponse({
        "applinks": {
            "apps": [],
            "details": [
                {
                    "appID": "TEAM_ID.pro.birdr.mobile",
                    "paths": ["/join/*"]
                }
            ]
        }
    }, content_type="application/json")


def android_asset_links(request):
    """Android App Links verification."""
    return JsonResponse([
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": "pro.birdr.mobile",
                "sha256_cert_fingerprints": [
                    "SHA256_FINGERPRINT_PLACEHOLDER"
                ]
            }
        }
    ], safe=False, content_type="application/json")


def join_challenge_redirect(request, token):
    """Redirect /join/challenge/<token> to app deep link (for desktop fallback)."""
    return HttpResponseRedirect(f'birdr://join/challenge/{token}')


urlpatterns = [
    path('.well-known/apple-app-site-association', apple_app_site_association),
    path('.well-known/assetlinks.json', android_asset_links),

    path('join/challenge/<str:token>/', join_challenge_redirect, name='join-challenge'),

    path('admin/', admin.site.urls),
    re_path(r"^country/(?P<pk>\w+)/$", CountryDetailView.as_view(), name="country-detail"),
    re_path(r"^country/(?P<pk>\w+)/species$", CountryDetailView.as_view(), name="country-detail"),

    path('token/', include('rest_framework_social_oauth2.urls')),
    path('auth/complete/<str:backend>/', OAuthCompleteView.as_view(), name='oauth-complete'),
    path('auth/', include('social_django.urls', namespace='social')),

    path('token/', jwt_views.TokenObtainPairView.as_view(), name ='token-obtain-pair'),
    path('token/refresh/', jwt_views.TokenRefreshView.as_view(), name ='token-refresh'),

    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
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
    re_path(r"^api/species/(?P<pk>\w+)/$", SpeciesDetailView.as_view(), name="species-detail"),

    re_path(r"^api/games/$", GameListView.as_view(), name="game-list"),
    re_path(r"^api/games/(?P<token>[\w-]+)/$", GameDetailView.as_view(), name="game-detail"),
    re_path(r"^api/species/$", SpeciesListView.as_view(), name="species-list"),

    re_path(r"^api/families/$", FamilyListView.as_view(), name="family-list"),
    re_path(r"^api/orders/$", OrderListView.as_view(), name="order-list"),

    re_path(r"^api/games/(?P<token>[\w-]+)/question$", QuestionView.as_view(), name="game-question-detail"),
    re_path(r"^api/answer/$", AnswerView.as_view(), name="answer-create"),
    re_path(r"^api/answer/(?P<question>[\w-]+)/(?P<token>[\w-]+)$", AnswerDetail.as_view(), name="answer-detail"),


    re_path(r"^api/media/$", MediaListView.as_view(), name="media-list"),
    re_path(r"^api/review-media/$", ReviewMediaView.as_view(), name="review-media-create"),
    re_path(r"^api/flag-media/$", FlagMediaView.as_view(), name="flag-media-create"),
    re_path(r"^api/species-review-stats/$", SpeciesReviewStatsView.as_view(), name="species-review-stats"),
    path('api/pages/', PageListView.as_view(), name='page-list'),
    path('api/pages/<slug:slug>/', PageDetailView.as_view(), name='page-detail'),

    re_path(r"^api/questions/(?P<pk>\w+)/$", QuestionDetailView.as_view(), name="question-detail"),
    re_path(r"^api/scores/$", PlayerScoreListView.as_view(), name="scores"),

    re_path(r"^api/feedback/$", FeedbackListView.as_view(), name="feedback"),
    re_path(r"^api/updates/$", UpdateView.as_view(), name="updates"),
    re_path(r"^api/updates/reactions/$", ReactionView.as_view(), name="reactions"),

    path(
        'api/challenge/<int:challenge_id>/next-level',
        AddChallengeLevelView.as_view(),
        name='add_challenge_level'
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

    # Compare app URLs
    path('api/compare/', include('compare.urls')),
]

urlpatterns += router.urls

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
