from django.views.generic import DetailView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from jizz.models import Country, Species
from jizz.serializers import CountrySerializer, SpeciesSerializer


class CountryDetailView(DetailView):
    model = Country

    def get_context_data(self, **kwargs):
        context = super(CountryDetailView, self).get_context_data(**kwargs)
        if self.object.species.count() == 0:
            raise NotImplemented("Country is missing species.")
        context['species'] = self.object.species.order_by('?').first().species
        return context


class CountryViewSet(viewsets.ModelViewSet):
    serializer_class = CountrySerializer
    queryset = Country.objects.all()


class SpeciesViewSet(viewsets.ModelViewSet):
    serializer_class = SpeciesSerializer
    queryset = Species.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['countries__country']