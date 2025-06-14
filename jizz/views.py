from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Case, When, Value
from django.db.models.aggregates import Count, Min
from django.http import Http404
from django.views.generic import DetailView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
)
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
from rest_framework.exceptions import NotFound
from rest_framework import generics
from django.shortcuts import get_object_or_404
from .models import CountryChallenge, CountryGame, ChallengeLevel, Game
from .serializers import (
    GameSerializer,
    CountryGameSerializer,
    FamilyListSerializer,
    OrderListSerializer,
)

from jizz.models import (
    Answer,
    Country,
    CountryChallenge,
    Feedback,
    FlagQuestion,
    Game,
    Player,
    PlayerScore,
    Question,
    Species,
    Update,
    Reaction,
)
from jizz.serializers import (
    AnswerSerializer,
    CountryChallengeSerializer,
    CountrySerializer,
    FeedbackSerializer,
    FlagQuestionSerializer,
    GameSerializer,
    PlayerScoreSerializer,
    PlayerSerializer,
    QuestionSerializer,
    SpeciesDetailSerializer,
    SpeciesListSerializer,
    UpdateSerializer,
    ReactionSerializer,
)

User = get_user_model()


class GetPlayerMixin:

    def get_token_from_header(self, request):
        auth_header = request.headers.get("Authorization", None)

        if not auth_header:
            raise AuthenticationFailed("Authorization header is missing")
        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            raise AuthenticationFailed("Invalid Authorization header format")

        return token

    def get_user_from_token(self, token):
        try:
            return Player.objects.get(token=token)
        except Exception as e:
            raise AuthenticationFailed("Invalid token or user does not exist")

    def get_player_from_token(self, request):
        token = self.get_token_from_header(self.request)
        return self.get_user_from_token(token)

    def get_player_from_request(self, request):
        token = self.get_token_from_header(self.request)
        player = self.get_user_from_token(token)
        return player


class CountryDetailView(DetailView):
    model = Country

    def get_context_data(self, **kwargs):
        context = super(CountryDetailView, self).get_context_data(**kwargs)
        if self.object.species.count() == 0:
            raise NotImplemented("Country is missing species.")
        context["species"] = self.object.species.order_by("?").first().species
        return context


class CountryViewSet(viewsets.ModelViewSet):
    serializer_class = CountrySerializer
    queryset = Country.objects.exclude(countryspecies__isnull=True).all()

    queryset = (
        Country.objects.annotate(
            custom_order=Case(
                When(code="world", then=Value(0)),
                default=Value(1),
            )
        )
        .exclude(countryspecies__isnull=True)
        .order_by("custom_order", "name")
    )


class SpeciesListView(ListAPIView):
    serializer_class = SpeciesListSerializer
    queryset = Species.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["countryspecies__country"]


class SpeciesDetailView(RetrieveAPIView):
    serializer_class = SpeciesDetailSerializer
    queryset = Species.objects.all()


class FamilyListView(ListAPIView):
    serializer_class = FamilyListSerializer

    def get_queryset(self):
        country_id = self.request.query_params.get("country", None)
        queryset = Species.objects.all()

        if country_id:
            queryset = queryset.filter(
                countryspecies__country_id=country_id,
                countryspecies__status__in=["native", "endemic", "rare"]
            )

        queryset = (
            queryset.values("tax_family", "tax_family_en")
            .annotate(count=Count("id"), first=Min("id"))
            .order_by("first")
        )
        return queryset

class OrderListView(ListAPIView):
    serializer_class = OrderListSerializer

    def get_queryset(self):
        country_id = self.request.query_params.get("country", None)
        queryset = Species.objects.all()
        if country_id:
            queryset = queryset.filter(
                countryspecies__country_id=country_id,
                countryspecies__status__in=["native", "endemic", "rare"]
            )
        queryset = (
            queryset.values("tax_order")
            .annotate(count=Count("id"), first=Min("id"))
            .order_by("first")
        )
        return queryset


class PlayerCreateView(CreateAPIView):
    serializer_class = PlayerSerializer
    queryset = Player.objects.all()

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def perform_create(self, serializer):
        ip = self.get_client_ip(self.request)
        return serializer.save(ip=ip)


class PlayerView(RetrieveUpdateAPIView):
    serializer_class = PlayerSerializer
    queryset = Player.objects.all()
    lookup_field = "token"


class PlayerStatsView(RetrieveAPIView):
    serializer_class = PlayerSerializer
    queryset = Player.objects.all()
    lookup_field = "token"


class FlagQuestionView(ListCreateAPIView):
    serializer_class = FlagQuestionSerializer
    queryset = FlagQuestion.objects.all()


class GameListView(ListCreateAPIView, GetPlayerMixin):
    serializer_class = GameSerializer
    queryset = Game.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["country"]

    def perform_create(self, serializer):
        player = self.get_player_from_request(self.request)
        serializer.save(host=player)


class GameDetailView(RetrieveAPIView):
    serializer_class = GameSerializer
    queryset = Game.objects.all()
    lookup_field = "token"


class QuestionView(RetrieveAPIView):
    serializer_class = QuestionSerializer
    queryset = Question.objects.all()

    def get_object(self):
        game = Game.objects.get(token=self.kwargs["token"])
        if game.ended:
            raise NotFound("Game has ended")
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
            player__token=self.kwargs["token"], question=self.kwargs["question"]
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

    filterset_fields = ["game__media", "game__length", "game__level", "game__country"]
    filter_backends = [DjangoFilterBackend, OrderingFilter]

    ordering = ["-score"]


class FeedbackListView(ListCreateAPIView):
    serializer_class = FeedbackSerializer
    queryset = Feedback.objects.all()


class UpdatePagination(PageNumberPagination):
    page_size = 10


class UpdateView(ListAPIView):
    pagination_class = UpdatePagination
    serializer_class = UpdateSerializer
    queryset = Update.objects.all()
    ordering = ["-created"]


class CountryChallengeViewSet(viewsets.ModelViewSet, GetPlayerMixin):
    serializer_class = CountryChallengeSerializer

    def get_queryset(self):
        player = self.get_player_from_request(self.request)

        return CountryChallenge.objects.filter(player=player).prefetch_related(
            "games", "games__challenge_level", "games__game"
        )

    def get_object(self):
        player = self.get_player_from_request(self.request)
        challenge = (
            CountryChallenge.objects.filter(player=player)
            .prefetch_related("games", "games__challenge_level", "games__game")
            .last()
        )
        if not challenge:
            raise Http404("No challenges found for this player.")
        return challenge

    def perform_create(self, serializer):
        player = self.get_player_from_request(self.request)
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

            return Response(
                {
                    "access_token": str(refresh.access_token),
                    "refresh_token": str(refresh),
                    "expires_in": 3600,  # Customize expiry
                }
            )
        return response


class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get("token")

        try:
            strategy = load_strategy(request)
            backend = GoogleOAuth2(strategy=strategy)
            user_data = backend.get_user_details(
                backend.validate_and_return_id_token(token)
            )
            user, created = User.objects.get_or_create(
                email=user_data["email"], defaults={"username": user_data["email"]}
            )

            refresh = RefreshToken.for_user(user)
            return Response(
                {"refresh": str(refresh), "access": str(refresh.access_token)}
            )

        except AuthException:
            return Response({"error": "Invalid token"}, status=400)


class ReactionView(CreateAPIView):
    serializer_class = ReactionSerializer
    queryset = Reaction.objects.all()


class AddChallengeLevelView(generics.CreateAPIView, GetPlayerMixin):
    serializer_class = CountryGameSerializer

    def get_challenge_level(self, country_challenge):
        last_game = country_challenge.games.order_by("-created").first()

        if not last_game or last_game.status == "passed":
            # Get next challenge level
            next_sequence = last_game.challenge_level.sequence + 1 if last_game else 0
            challenge_level = ChallengeLevel.objects.filter(
                sequence=next_sequence
            ).first()

            if not challenge_level:
                return None
        else:
            # Retry the same level
            challenge_level = last_game.challenge_level

        return challenge_level

    def perform_create(self, serializer):
        player = self.get_player_from_request(self.request)
        country_challenge = get_object_or_404(
            CountryChallenge, id=self.kwargs["challenge_id"], player=player
        )

        challenge_level = self.get_challenge_level(country_challenge)
        if not challenge_level:
            raise ValidationError({"error": "No more levels available"})

        # Create new game with the challenge level settings
        game = Game.objects.create(
            country=country_challenge.country,
            level=challenge_level.level,
            length=challenge_level.length,
            media=challenge_level.media,
            include_rare=challenge_level.include_rare,
            include_escapes=challenge_level.include_escapes,
            tax_order=challenge_level.tax_order,
            host=country_challenge.player,
        )

        # Save the country game using the serializer
        serializer.save(
            country_challenge=country_challenge,
            game=game,
            challenge_level=challenge_level,
        )

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # Add game data to response
        response.data["game"] = GameSerializer(response.data["game"]).data
        return response
