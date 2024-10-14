from django.db import transaction
from django.views.generic import DetailView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView, ListCreateAPIView, RetrieveUpdateAPIView, \
    CreateAPIView

from jizz.models import Country, Species, Game, Question, Answer, Player
from jizz.serializers import CountrySerializer, SpeciesListSerializer, SpeciesDetailSerializer, GameSerializer, \
    QuestionSerializer, AnswerSerializer, PlayerSerializer


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
    queryset = Country.objects.exclude(countryspecies__isnull=True).all()


class SpeciesListView(ListAPIView):
    serializer_class = SpeciesListSerializer
    queryset = Species.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['countryspecies__country']


class SpeciesDetailView(RetrieveAPIView):
    serializer_class = SpeciesDetailSerializer
    queryset = Species.objects.all()


class PlayerCreateView(CreateAPIView):
    serializer_class = PlayerSerializer
    queryset = Player.objects.all()

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def perform_create(self, serializer):
        ip = self.get_client_ip(self.request)
        return serializer.save(ip=ip)


class PlayerView(RetrieveAPIView):
    serializer_class = PlayerSerializer
    queryset = Player.objects.all()

    def get_object(self):
        return self.queryset.filter(
            token=self.kwargs['token']
        ).first()


class GameListView(ListCreateAPIView):
    serializer_class = GameSerializer
    queryset = Game.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['country']

    @transaction.atomic
    def perform_create(self, serializer):
        model = serializer.save()
        if not model.multiplayer:
            model.add_question()


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

    def perform_create(self, serializer):
        answer = serializer.save()
        answer.question.done = True
        answer.question.save()
        game = answer.question.game
        game.add_question()

class AnswerDetail(RetrieveAPIView):
    serializer_class = AnswerSerializer
    queryset = Answer.objects.all()

    def get_object(self):
        return self.queryset.filter(
            player__token=self.kwargs['token'],
            question=self.kwargs['question']
        ).first()


class QuestionDetailView(RetrieveUpdateAPIView):
    serializer_class = QuestionSerializer
    queryset = Question.objects.all()
