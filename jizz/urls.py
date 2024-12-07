from django.contrib import admin
from django.urls import path, re_path, include
from rest_framework import routers
from rest_framework_simplejwt import views as jwt_views

from jizz.views import CountryDetailView, CountryViewSet, SpeciesListView, SpeciesDetailView, GameListView, \
    GameDetailView, QuestionDetailView, PlayerCreateView, PlayerView, AnswerView, AnswerDetail, PlayerScoreListView, \
    FlagQuestionView, PlayerStatsView, FeedbackListView, UpdateView

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet, 'countries')

urlpatterns = [
    path('admin/', admin.site.urls),
    re_path(r"^country/(?P<pk>\w+)/$", CountryDetailView.as_view(), name="country-detail"),
    re_path(r"^country/(?P<pk>\w+)/species$", CountryDetailView.as_view(), name="country-detail"),

    path('token/', jwt_views.TokenObtainPairView.as_view(), name ='token-obtain-pair'),
    path('token/refresh/', jwt_views.TokenRefreshView.as_view(), name ='token-refresh'),

    path('api/', include(router.urls)),

    re_path(r"^api/player/$", PlayerCreateView.as_view(), name="player-create"),
    re_path(r"^api/player/(?P<token>[\w-]+)/$", PlayerView.as_view(), name="player-load"),
    re_path(r"^api/player/(?P<token>[\w-]+)/stats/$", PlayerStatsView.as_view(), name="player-stats"),

    re_path(r"^api/species/$", SpeciesListView.as_view(), name="species-list"),
    re_path(r"^api/species/(?P<pk>\w+)/$", SpeciesDetailView.as_view(), name="species-detail"),

    re_path(r"^api/games/$", GameListView.as_view(), name="game-list"),
    re_path(r"^api/games/(?P<token>[\w-]+)/$", GameDetailView.as_view(), name="game-detail"),
    re_path(r"^api/games/(?P<token>[\w-]+)/question$", GameDetailView.as_view(), name="game-detail"),

    re_path(r"^api/answer/$", AnswerView.as_view(), name="answer-create"),
    re_path(r"^api/answer/(?P<question>[\w-]+)/(?P<token>[\w-]+)$", AnswerDetail.as_view(), name="answer-detail"),

    re_path(r"^api/flag/$", FlagQuestionView.as_view(), name="flag-question-create"),

    re_path(r"^api/questions/(?P<pk>\w+)/$", QuestionDetailView.as_view(), name="question-detail"),
    re_path(r"^api/scores/$", PlayerScoreListView.as_view(), name="scores"),

    re_path(r"^api/feedback/$", FeedbackListView.as_view(), name="feedback"),
    re_path(r"^api/updates/$", UpdateView.as_view(), name="updates"),

]
