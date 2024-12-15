from django.db import transaction
from django.db.models import Case, When, Value
from django.views.generic import DetailView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.generics import ListAPIView, RetrieveAPIView, ListCreateAPIView, RetrieveUpdateAPIView, \
    CreateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from jizz.models import Country, Species, Game, Question, Answer, Player, PlayerScore, FlagQuestion, Feedback, Update, \
    Reaction
from jizz.serializers import CountrySerializer, SpeciesListSerializer, SpeciesDetailSerializer, GameSerializer, \
    QuestionSerializer, AnswerSerializer, PlayerSerializer, PlayerScoreSerializer, FlagQuestionSerializer, \
    FeedbackSerializer, UpdateSerializer, ReactionSerializer


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

    queryset = Country.objects.annotate(
        custom_order=Case(
            When(code="world", then=Value(0)),
            default=Value(1),
        )
    ).exclude(countryspecies__isnull=True).order_by("custom_order", "name")


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


class PlayerView(RetrieveUpdateAPIView):
    serializer_class = PlayerSerializer
    queryset = Player.objects.all()
    lookup_field = 'token'


class PlayerStatsView(RetrieveAPIView):
    serializer_class = PlayerSerializer
    queryset = Player.objects.all()
    lookup_field = 'token'


class FlagQuestionView(ListCreateAPIView):
    serializer_class = FlagQuestionSerializer
    queryset = FlagQuestion.objects.all()


class GameListView(ListCreateAPIView):
    serializer_class = GameSerializer
    queryset = Game.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['country']

    def get_token_from_header(self, request):
        auth_header = request.headers.get('Authorization', None)

        if not auth_header:
            raise AuthenticationFailed('Authorization header is missing')
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            raise AuthenticationFailed('Invalid Authorization header format')

        return token

    def get_user_from_token(self, token):
        try:
            return Player.objects.get(token=token)
        except Exception as e:
            raise AuthenticationFailed('Invalid token or user does not exist')

    def perform_create(self, serializer):
        token = self.get_token_from_header(self.request)
        player = self.get_user_from_token(token)
        serializer.save(host=player)


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



class PlayerScorePagination(PageNumberPagination):
    page_size = 50


class PlayerScoreListView(ListAPIView):
    serializer_class = PlayerScoreSerializer
    queryset = PlayerScore.objects.all()
    pagination_class = PlayerScorePagination

    filterset_fields = ['game__media', 'game__length', 'game__level', 'game__country']
    filter_backends = [DjangoFilterBackend, OrderingFilter]

    ordering = ['-score']


class FeedbackListView(ListCreateAPIView):
    serializer_class = FeedbackSerializer
    queryset = Feedback.objects.all()


class UpdatePagination(PageNumberPagination):
    page_size = 10


class UpdateView(ListAPIView):
    pagination_class = UpdatePagination
    serializer_class = UpdateSerializer
    queryset = Update.objects.all()
    ordering = ['-created']


class ReactionView(CreateAPIView):
    serializer_class = ReactionSerializer
    queryset = Reaction.objects.all()
