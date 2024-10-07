"""
URL configuration for jizz project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from rest_framework import routers
from rest_framework_simplejwt import views as jwt_views

from jizz.views import CountryDetailView, CountryViewSet, SpeciesListView, SpeciesDetailView, GameListView, \
    GameDetailView, QuestionDetailView

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet, 'countries')

urlpatterns = [
    path('admin/', admin.site.urls),
    re_path(r"^country/(?P<pk>\w+)/$", CountryDetailView.as_view(), name="country-detail"),
    path('token/', jwt_views.TokenObtainPairView.as_view(), name ='token-obtain-pair'),
    path('token/refresh/', jwt_views.TokenRefreshView.as_view(), name ='token-refresh'),

    path('api/', include(router.urls)),
    re_path(r"^api/species/$", SpeciesListView.as_view(), name="species-list"),
    re_path(r"^api/species/(?P<pk>\w+)/$", SpeciesDetailView.as_view(), name="species-detail"),
    re_path(r"^api/games/$", GameListView.as_view(), name="game-list"),
    re_path(r"^api/games/(?P<token>[\w-]+)/$", GameDetailView.as_view(), name="game-detail"),
    re_path(r"^api/games/(?P<token>[\w-]+)/question$", GameDetailView.as_view(), name="game-detail"),

    re_path(r"^api/questions/(?P<pk>\w+)/$", QuestionDetailView.as_view(), name="question-detail"),

]
