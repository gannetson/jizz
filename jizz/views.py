from django.contrib.auth import get_user_model
from django.views.generic import DetailView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.generics import (CreateAPIView, ListAPIView,
                                     ListCreateAPIView, RetrieveAPIView,
                                     RetrieveUpdateAPIView)
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_social_oauth2.views import ConvertTokenView
from social_core.backends.google import GoogleOAuth2
from social_core.exceptions import AuthException
from social_django.utils import load_strategy
from rest_framework import status

from jizz.models import (Answer, Country, CountryChallenge, Feedback,
                         FlagQuestion, Game, Player, PlayerScore, Question,
                         Species, Update)
from jizz.serializers import (AnswerSerializer, CountryChallengeSerializer,
                              CountrySerializer, FeedbackSerializer,
                              FlagQuestionSerializer, GameSerializer,
                              PlayerScoreSerializer, PlayerSerializer,
                              QuestionSerializer, SpeciesDetailSerializer,
                              SpeciesListSerializer, UpdateSerializer)

User = get_user_model()


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
        game = Game.objects.get(token=self.kwargs['token'])
        if game.ended:
            return None
        if not game.question:
            game.add_question()
        return game.question


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


class CountryChallengeViewSet(viewsets.ModelViewSet):
    serializer_class = CountryChallengeSerializer

    def get_queryset(self):
        return CountryChallenge.objects.filter(
            player=self.request.user
        ).prefetch_related(
            'games',
            'games__challenge_level',
            'games__game'
        )

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

    def get_player_from_token(self, request):
        token = self.get_token_from_header(self.request)
        return self.get_user_from_token(token)

    def perform_create(self, serializer):
        token = self.get_token_from_header(self.request)
        player = self.get_user_from_token(token)
        serializer.save(player=player)


class CustomConvertTokenView(ConvertTokenView):

    def post(self, request, *args, **kwargs):
        # Call the original ConvertTokenView to get the OAuth2 token
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Get the user from the OAuth2 access token
            user = request.user

            # Generate a JWT token
            refresh = RefreshToken.for_user(user)

            return Response({
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'expires_in': 3600,  # Customize expiry
            })
        return response


class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get("token")

        try:
            strategy = load_strategy(request)
            backend = GoogleOAuth2(strategy=strategy)
            user_data = backend.get_user_details(backend.validate_and_return_id_token(token))
            user, created = User.objects.get_or_create(email=user_data["email"],
                                                       defaults={"username": user_data["email"]})

            refresh = RefreshToken.for_user(user)
            return Response({"refresh": str(refresh), "access": str(refresh.access_token)})

        except AuthException:
            return Response({"error": "Invalid token"}, status=400)
