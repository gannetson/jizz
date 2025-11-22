from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SpeciesTraitViewSet, SpeciesComparisonViewSet,
    ComparisonRequestView, ScrapeSpeciesView
)

router = DefaultRouter()
router.register(r'traits', SpeciesTraitViewSet, basename='trait')
router.register(r'comparisons', SpeciesComparisonViewSet, basename='comparison')

urlpatterns = [
    path('', include(router.urls)),
    path('request/', ComparisonRequestView.as_view(), name='comparison-request'),
    path('scrape/', ScrapeSpeciesView.as_view(), name='scrape-species'),
]

