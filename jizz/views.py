from django.db import transaction
from django.views.generic import DetailView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView, ListCreateAPIView, RetrieveUpdateAPIView, \
    CreateAPIView

from jizz.models import Country, Species, Game, Question, Answer
from jizz.serializers import CountrySerializer, SpeciesListSerializer, SpeciesDetailSerializer, GameSerializer, \
    QuestionSerializer, AnswerSerializer


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
    queryset = Country.objects.exclude(species__isnull=True).all()


class SpeciesListView(ListAPIView):
    serializer_class = SpeciesListSerializer
    queryset = Species.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['countries__country']


class SpeciesDetailView(RetrieveAPIView):
    serializer_class = SpeciesDetailSerializer
    queryset = Species.objects.all()


class GameListView(ListCreateAPIView):
    serializer_class = GameSerializer
    queryset = Game.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['country']

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user if not self.request.user.is_anonymous else None
        model = serializer.save(user=user)

        species = model.country.species.all()
        questions = [model.questions.model(species=species_instance.species, game=model) for species_instance in species]

        if questions:
            model.questions.bulk_create(questions)


class GameDetailView(RetrieveAPIView):
    serializer_class = GameSerializer
    queryset = Game.objects.all()
    lookup_field = 'token'


class QuestionView(RetrieveAPIView):
    serializer_class = QuestionSerializer
    queryset = Question.objects.all()

    def get_object(self):
        return self.queryset.filter(
            game__token=self.kwargs['token']
        ).first()

class AnswerView(CreateAPIView):
    serializer_class = AnswerSerializer
    queryset = Answer.objects.all()


class QuestionDetailView(RetrieveUpdateAPIView):
    serializer_class = QuestionSerializer
    queryset = Question.objects.all()
