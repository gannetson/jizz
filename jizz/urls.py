from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
from rest_framework_simplejwt import views as jwt_views
from rest_framework.routers import DefaultRouter

from jizz.views import CountryDetailView, CountryViewSet, SpeciesListView, SpeciesDetailView, GameListView, \
    GameDetailView, QuestionDetailView, PlayerCreateView, PlayerView, AnswerView, AnswerDetail, PlayerScoreListView, \
    FlagQuestionView, PlayerStatsView, FeedbackListView, UpdateView, CountryChallengeViewSet, QuestionView, \
    ReactionView, \
    AddChallengeLevelView, FamilyListView, OrderListView, LanguageListView, RegisterView, ProfileView, \
    PasswordResetRequestView, PasswordResetConfirmView, OAuthCompleteView, UserGamesView, UserGameDetailView, \
    MediaListView, ReviewMediaView, FlagMediaView, SpeciesReviewStatsView, GoogleLoginView, AppleLoginView, PageListView, PageDetailView

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet, 'countries')
router.register(r'country-challenges', CountryChallengeViewSet, basename='country-challenge')

urlpatterns = [
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


    re_path(r"^api/flag/$", FlagQuestionView.as_view(), name="flag-question-create"),
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
    
    # Compare app URLs
    path('api/compare/', include('compare.urls')),
]

urlpatterns += router.urls

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
