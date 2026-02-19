from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Case, When, Value, Prefetch, F, Q
from django.db.models.aggregates import Count, Min
from django.db.models.functions import RowNumber
from django.db.models.expressions import Window
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
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_social_oauth2.views import ConvertTokenView
from social_core.backends.google import GoogleOAuth2
from social_core.exceptions import AuthException
from social_django.utils import load_strategy
from django.shortcuts import redirect
from django.contrib.auth import login
from social_django.views import complete as social_complete
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework import generics
from django.shortcuts import get_object_or_404
from .models import CountryChallenge, CountryGame, ChallengeLevel, Game, Language, Page
from .serializers import (
    GameSerializer,
    CountryGameSerializer,
    FamilyListSerializer,
    OrderListSerializer,
    LanguageSerializer,
    PageSerializer,
    PageListSerializer,
)

from jizz.models import (
    Answer,
    Country,
    CountryChallenge,
    CountrySpecies,
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
from media.models import Media, MediaReview, FlagMedia
from jizz.serializers import (
    AnswerSerializer,
    CountryChallengeSerializer,
    CountrySerializer,
    FeedbackSerializer,
    MediaSerializer,
    ReviewMediaSerializer,
    FlagMediaSerializer,
    FlagQuestionSerializer,
    GameSerializer,
    PlayerScoreListSerializer,
    PlayerScoreSerializer,
    SpeciesReviewStatsSerializer,
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
    pagination_class = None
    permission_classes = [AllowAny]
    authentication_classes = []

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
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required for public species data
    pagination_class = None  # Disable pagination - we need all species for the combobox


class SpeciesDetailView(RetrieveAPIView):
    serializer_class = SpeciesDetailSerializer
    queryset = Species.objects.all()
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required for public species data


class LanguageListView(ListAPIView):
    serializer_class = LanguageSerializer
    queryset = Language.objects.all()
    pagination_class = None


class PageListView(ListAPIView):
    """List help pages (show=True only)."""
    serializer_class = PageListSerializer
    queryset = Page.objects.filter(show=True).order_by('title')
    pagination_class = None
    permission_classes = [AllowAny]
    authentication_classes = []


class PageDetailView(RetrieveAPIView):
    """Retrieve a help page by slug."""
    serializer_class = PageSerializer
    queryset = Page.objects.filter(show=True)
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'
    permission_classes = [AllowAny]
    authentication_classes = []


class FamilyListView(ListAPIView):
    serializer_class = FamilyListSerializer
    pagination_class = None

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
    pagination_class = None

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
    permission_classes = [AllowAny]  # Allow anonymous users to create players

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def perform_create(self, serializer):
        ip = self.get_client_ip(self.request)
        # Connect player to authenticated user if available
        user = None
        if self.request.user and self.request.user.is_authenticated:
            user = self.request.user
        return serializer.save(ip=ip, user=user)


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


class MediaPagination(PageNumberPagination):
    """Custom pagination for media list with 50 items per page."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class MediaListView(ListAPIView):
    """List media for review. level=fast|full|thorough. fast: species not fully reviewed and <10 approved; full: species not fully reviewed; thorough: all media with review_status."""
    serializer_class = MediaSerializer
    pagination_class = MediaPagination

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['level'] = self.request.query_params.get('level', 'fast')
        return context

    def get_queryset(self):
        from jizz.models import CountrySpecies

        level = self.request.query_params.get('level', 'fast')
        media_type = self.request.query_params.get('type', 'image')
        country_code = self.request.query_params.get('country')
        species_id_param = self.request.query_params.get('species')

        # Base filters (type, country, species)
        queryset = Media.objects.filter(hide=False, type=media_type)
        if country_code:
            country_species_ids = CountrySpecies.objects.exclude(
                status__in=['introduced', 'extirpated', 'uncertain', 'unknown']
            ).filter(country__code=country_code).values_list('species_id', flat=True)
            queryset = queryset.filter(species_id__in=country_species_ids)
        if species_id_param:
            try:
                queryset = queryset.filter(species_id=int(species_id_param))
            except (ValueError, TypeError):
                pass

        if level == 'thorough':
            # All media (including reviewed) with review counts annotated
            queryset = queryset.annotate(
                _approved_count=Count('reviews', filter=Q(reviews__review_type='approved')),
                _rejected_count=Count('reviews', filter=Q(reviews__review_type='rejected')),
                _not_sure_count=Count('reviews', filter=Q(reviews__review_type='not_sure')),
            )
            return queryset.order_by('species__id', '-created')
        else:
            # fast or full: only unreviewed media
            reviewed_media_ids = MediaReview.objects.values_list('media_id', flat=True).distinct()
            queryset = queryset.exclude(id__in=reviewed_media_ids)

            if level == 'fast':
                # Restrict to species that have < 10 approved media (and at least one unreviewed)
                unreviewed_species_ids = list(
                    queryset.values_list('species_id', flat=True).distinct()
                )
                if not unreviewed_species_ids:
                    return Media.objects.none().order_by('species__id', '-created')
                species_under_10 = list(
                    Species.objects.filter(id__in=unreviewed_species_ids)
                    .filter(media__type=media_type)
                    .annotate(
                        approved_count=Count(
                            'media',
                            filter=Q(media__type=media_type, media__reviews__review_type='approved'),
                            distinct=True,
                        ),
                    )
                    .filter(approved_count__lt=10)
                    .values_list('id', flat=True)
                )
                queryset = queryset.filter(species_id__in=species_under_10)
            # full: no extra filter

        return queryset.order_by('species__id', '-created')


class ReviewMediaView(ListCreateAPIView):
    """View for reviewing media items (positive or negative). Accepts player_token in body or authenticated user."""
    permission_classes = [AllowAny]
    serializer_class = ReviewMediaSerializer
    queryset = MediaReview.objects.all()


class FlagMediaView(ListCreateAPIView):
    """View for flagging media items."""
    serializer_class = FlagMediaSerializer
    queryset = FlagMedia.objects.all()


class SpeciesReviewStatsView(APIView):
    """List species with media review counts; optional country filter. Returns summary counts (fully/partly/not reviewed)."""
    permission_classes = [AllowAny]

    def get(self, request):
        country_code = request.query_params.get('country')
        media_type = request.query_params.get('type', 'image')

        qs = (
            Species.objects
            .filter(media__type=media_type)
            .distinct()
            .annotate(
                total_media=Count('media', filter=Q(media__type=media_type), distinct=True),
                media_with_review=Count(
                    'media',
                    filter=Q(media__type=media_type, media__reviews__id__isnull=False),
                    distinct=True,
                ),
                approved_media=Count(
                    'media',
                    filter=Q(media__type=media_type, media__reviews__review_type='approved'),
                    distinct=True,
                ),
                rejected_media=Count(
                    'media',
                    filter=Q(media__type=media_type, media__reviews__review_type='rejected'),
                    distinct=True,
                ),
                not_sure_media=Count(
                    'media',
                    filter=Q(media__type=media_type, media__reviews__review_type='not_sure'),
                    distinct=True,
                ),
            )
            .filter(total_media__gt=0)
            .order_by('id')
        )
        if country_code:
            qs = qs.filter(
                countryspecies__country__code=country_code.upper(),
                countryspecies__status__in=['native', 'endemic', 'rare'],
            ).distinct()

        species_list = list(qs)
        fully_reviewed = sum(1 for s in species_list if s.media_with_review >= s.total_media)
        not_reviewed = sum(1 for s in species_list if s.media_with_review == 0)
        # Reviewed = 10+ approved but not fully reviewed (excluded from partly_reviewed)
        reviewed = sum(
            1 for s in species_list
            if s.media_with_review < s.total_media and s.approved_media >= 10
        )
        partly_reviewed = (
            len(species_list) - fully_reviewed - not_reviewed - reviewed
        )

        serializer = SpeciesReviewStatsSerializer(
            species_list,
            many=True,
            context={'request': request},
        )
        return Response({
            'summary': {
                'fully_reviewed': fully_reviewed,
                'reviewed': reviewed,
                'partly_reviewed': partly_reviewed,
                'not_reviewed': not_reviewed,
            },
            'species': serializer.data,
        })


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
            player_score__player__token=self.kwargs["token"], question=self.kwargs["question"]
        ).first()


class QuestionDetailView(RetrieveUpdateAPIView):
    serializer_class = QuestionSerializer
    queryset = Question.objects.all()


class PlayerScorePagination(PageNumberPagination):
    page_size = 100


class PlayerScoreListView(ListAPIView):
    serializer_class = PlayerScoreListSerializer
    pagination_class = PlayerScorePagination

    filterset_fields = ["game__media", "game__length", "game__level", "game__country"]
    filter_backends = [DjangoFilterBackend, OrderingFilter]

    ordering = ["-score"]

    def get_queryset(self):
        return (
            PlayerScore.objects
            .select_related("player", "game", "game__country")
            .annotate(
                score_rank=Window(
                    expression=RowNumber(),
                    order_by=F("score").desc(),
                )
            )
        )


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


class OAuthCompleteView(APIView):
    """
    Custom OAuth completion view that generates JWT tokens and redirects to frontend
    This intercepts the OAuth callback and adds JWT tokens to the redirect URL
    """
    def get(self, request, backend):
        from django.conf import settings
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
        
        # Get the redirect URI from session (stored during OAuth initiation) or request or use default
        redirect_uri = request.session.get('social_auth_redirect_uri') or request.GET.get('redirect_uri') or settings.SOCIAL_AUTH_LOGIN_REDIRECT_URL
        
        # Call the social_django complete view to finish OAuth
        # This will authenticate the user and create/update the social auth association
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"OAuthCompleteView called for backend: {backend}")
            logger.info(f"Before social_complete: user authenticated={request.user.is_authenticated}")
            
            response = social_complete(request, backend)
            
            user_after = request.user if request.user.is_authenticated else None
            logger.info(f"After social_complete: user authenticated={request.user.is_authenticated}, user_id={user_after.id if user_after else None}")
            
        except Exception as e:
            logger.error(f"OAuth completion failed: {e}", exc_info=True)
            # If OAuth completion failed, redirect with error
            parsed = urlparse(redirect_uri)
            query_params = parse_qs(parsed.query)
            query_params['error'] = ['authentication_failed']
            new_query = urlencode(query_params, doseq=True)
            new_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
            return redirect(new_url)
        
        # If OAuth was successful, the user should now be authenticated
        if request.user.is_authenticated:
            logger.info(f"OAuth successful for user: {request.user.username} (ID: {request.user.id}, email: {getattr(request.user, 'email', 'N/A')})")
            
            # Get or create user profile
            from .models import UserProfile
            profile, profile_created = UserProfile.objects.get_or_create(user=request.user)
            logger.info(f"UserProfile {'created' if profile_created else 'retrieved'} for user {request.user.id}")
            
            # Get social auth data - try multiple sources
            extra_data = None
            social_user = None
            
            # First, try to get from session (social_django stores it there during OAuth)
            if 'social_auth' in request.session:
                social_auth_data = request.session.get('social_auth', {})
                if isinstance(social_auth_data, dict):
                    extra_data = social_auth_data.get('user_details', {})
                    logger.info(f"Found user data in session: {list(extra_data.keys()) if extra_data else 'None'}")
            
            # Also try to get from UserSocialAuth model (might be saved by now)
            try:
                from social_django.models import UserSocialAuth
                # Refresh from database - might have been created by social_complete
                social_user = UserSocialAuth.objects.filter(user=request.user, provider=backend).first()
                if social_user and social_user.extra_data:
                    extra_data = social_user.extra_data
                    logger.info(f"Found user data in UserSocialAuth: {list(extra_data.keys()) if extra_data else 'None'}")
            except Exception as e:
                logger.warning(f"Error accessing UserSocialAuth: {e}")
            
            # If we have an access token but no user details, fetch them from Google API
            if social_user and social_user.extra_data and 'access_token' in social_user.extra_data:
                access_token = social_user.extra_data.get('access_token')
                if access_token and not extra_data.get('name') and not extra_data.get('picture'):
                    try:
                        import requests
                        google_user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
                        headers = {'Authorization': f'Bearer {access_token}'}
                        response = requests.get(google_user_info_url, headers=headers, timeout=10)
                        if response.status_code == 200:
                            google_data = response.json()
                            # Merge Google data into extra_data
                            extra_data.update(google_data)
                            # Also update the UserSocialAuth model
                            social_user.extra_data.update(google_data)
                            social_user.save()
                    except Exception as e:
                        logger.warning(f"Error fetching user details from Google API: {e}")
            
            # Update user profile with Google data if available
            if extra_data:
                logger.info(f"Updating user profile with Google data: {list(extra_data.keys())}")
                
                # Update first_name and last_name first
                updated = False
                if 'given_name' in extra_data and extra_data.get('given_name'):
                    request.user.first_name = extra_data.get('given_name', '')
                    updated = True
                if 'family_name' in extra_data and extra_data.get('family_name'):
                    request.user.last_name = extra_data.get('family_name', '')
                    updated = True
                if 'name' in extra_data and extra_data.get('name') and not request.user.first_name:
                    # If we have full name but no first_name, try to split it
                    full_name = extra_data.get('name', '').split(' ', 1)
                    if len(full_name) > 0:
                        request.user.first_name = full_name[0]
                        updated = True
                    if len(full_name) > 1:
                        request.user.last_name = full_name[1]
                        updated = True
                
                # Set username to full name (first_name + last_name) with spaces allowed
                # Build full name from first_name and last_name
                full_name_parts = []
                if request.user.first_name:
                    full_name_parts.append(request.user.first_name.strip())
                if request.user.last_name:
                    full_name_parts.append(request.user.last_name.strip())
                
                # Fallback: if we don't have first_name/last_name but have the full name, use it
                if not full_name_parts and 'name' in extra_data and extra_data.get('name'):
                    full_name = extra_data.get('name', '').strip()
                    if full_name:
                        full_name_parts = [full_name]
                
                if full_name_parts:
                    # Build the expected full name username
                    expected_username = ' '.join(full_name_parts)
                    
                    # Update username if it doesn't match the full name
                    # Check if username is email, email prefix, or doesn't match full name
                    current_username = request.user.username
                    should_update = (
                        current_username == request.user.email or 
                        '@' in current_username or
                        current_username != expected_username
                    )
                    
                    if should_update:
                        # Use full name with spaces as username
                        username = expected_username
                        # Ensure it's within Django's max length (150 chars)
                        if len(username) > 150:
                            username = username[:150]
                        
                        # Ensure username is unique
                        base_username = username
                        counter = 1
                        while User.objects.filter(username=username).exclude(pk=request.user.pk).exists():
                            # If we need to add a counter, truncate base to leave room
                            counter_str = f" {counter}"
                            max_base_length = 150 - len(counter_str)
                            if max_base_length < 1:
                                max_base_length = 1
                            username = f"{base_username[:max_base_length]}{counter_str}"
                            counter += 1
                        
                        request.user.username = username
                        updated = True
                        logger.info(f"Updated username from '{current_username}' to '{username}' (from full name: {expected_username})")
                
                if updated:
                    request.user.save()
                    logger.info(f"Updated user name: {request.user.first_name} {request.user.last_name}, username: {request.user.username}")
                
                # Download and save avatar if available
                if 'picture' in extra_data and extra_data['picture']:
                    try:
                        import requests
                        from django.core.files.base import ContentFile
                        from django.core.files.storage import default_storage
                        import os
                        from urllib.parse import urlparse
                        
                        avatar_url = extra_data['picture']
                        response = requests.get(avatar_url, timeout=10)
                        if response.status_code == 200:
                            # Get file extension from URL or default to jpg
                            parsed_url = urlparse(avatar_url)
                            ext = os.path.splitext(parsed_url.path)[1] or '.jpg'
                            filename = f"avatar_{request.user.id}{ext}"
                            
                            # Save the image
                            profile.avatar.save(
                                filename,
                                ContentFile(response.content),
                                save=True
                            )
                    except Exception as e:
                        # If avatar download fails, just log it and continue
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Failed to download avatar for user {request.user.id}: {e}")
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(request.user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Clear the redirect URI from session
            if 'social_auth_redirect_uri' in request.session:
                del request.session['social_auth_redirect_uri']
            
            # Redirect to frontend with tokens in URL
            parsed = urlparse(redirect_uri)
            query_params = parse_qs(parsed.query)
            query_params['access_token'] = [access_token]
            query_params['refresh_token'] = [refresh_token]
            new_query = urlencode(query_params, doseq=True)
            new_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
            
            return redirect(new_url)
        
        # If authentication failed, redirect with error
        parsed = urlparse(redirect_uri)
        query_params = parse_qs(parsed.query)
        query_params['error'] = ['authentication_failed']
        new_query = urlencode(query_params, doseq=True)
        new_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
        
        return redirect(new_url)


class ReactionView(CreateAPIView):
    serializer_class = ReactionSerializer
    queryset = Reaction.objects.all()


class RegisterView(APIView):
    """
    User registration endpoint
    Creates a new user and returns JWT tokens
    """
    def post(self, request):
        from .serializers import UserRegistrationSerializer
        from .models import UserProfile
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.conf import settings
        import html2text
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                # Create user profile
                UserProfile.objects.get_or_create(user=user)
                
                # Send welcome email
                try:
                    frontend_url = request.data.get('frontend_url', request.build_absolute_uri('/').rstrip('/'))
                    if 'localhost' in frontend_url or '127.0.0.1' in frontend_url:
                        frontend_url = 'http://localhost:3000'
                    
                    subject = 'Welcome to Birdr!'
                    
                    # Render HTML template
                    html_content = render_to_string('emails/welcome.html', {
                        'username': user.username,
                        'user_email': user.email,
                        'site_url': frontend_url,
                    })
                    
                    # Convert HTML to plain text automatically
                    h = html2text.HTML2Text()
                    h.ignore_links = False
                    h.body_width = 0  # Don't wrap lines
                    text_content = h.handle(html_content)
                    
                    # Create email message
                    email_message = EmailMultiAlternatives(
                        subject=subject,
                        body=text_content,
                        from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'info@birdr.pro',
                        to=[user.email],
                    )
                    email_message.attach_alternative(html_content, "text/html")
                    email_message.send()
                except Exception as e:
                    # Don't fail registration if email sending fails
                    pass
                
                refresh = RefreshToken.for_user(user)
                return Response({
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                # Handle duplicate username/email errors
                if 'username' in str(e).lower() or 'unique' in str(e).lower():
                    return Response(
                        {"error": "Username already exists. Please choose a different username."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif 'email' in str(e).lower():
                    return Response(
                        {"error": "Email already exists. Please use a different email or login."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                return Response(
                    {"error": "Registration failed. Please try again."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Format validation errors for frontend
        error_messages = []
        for field, errors in serializer.errors.items():
            if isinstance(errors, list):
                error_messages.extend([f"{field}: {error}" for error in errors])
            else:
                error_messages.append(f"{field}: {errors}")
        
        return Response(
            {"error": "; ".join(error_messages) if error_messages else "Invalid registration data"},
            status=status.HTTP_400_BAD_REQUEST
        )


class UserGamesView(ListAPIView):
    """
    Get paginated list of games played by the authenticated user
    """
    from rest_framework.permissions import IsAuthenticated
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from .serializers import UserGameSerializer
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = UserGameSerializer
    pagination_class = PageNumberPagination
    
    def get_queryset(self):
        user_players = Player.objects.filter(user=self.request.user)
        user_player_scores = PlayerScore.objects.filter(player__in=user_players)
        games = Game.objects.filter(
            questions__answers__player_score__in=user_player_scores
        ).distinct().select_related(
            'country'
        ).prefetch_related(
            'questions'
        ).order_by('-created')
        
        return games
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class UserGameDetailView(RetrieveAPIView):
    """
    Get game details with all questions and user's answers
    """
    from rest_framework.permissions import IsAuthenticated
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from .serializers import GameDetailWithAnswersSerializer
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = GameDetailWithAnswersSerializer
    lookup_field = "token"
    
    def get_queryset(self):
        user_players = Player.objects.filter(user=self.request.user)
        user_player_scores = PlayerScore.objects.filter(player__in=user_players)
        game =  Game.objects.filter(
            questions__answers__player_score__in=user_player_scores
        ).distinct().prefetch_related(
            Prefetch(
                'questions',
                queryset=Question.objects.order_by('sequence').select_related('species').prefetch_related(
                    'species__media',
                    Prefetch(
                        'answers',
                        queryset=Answer.objects.filter(
                            player_score__in=user_player_scores
                        ).select_related('answer', 'player_score', 'player_score__player', 'player_score__player__user').prefetch_related(
                            'answer__media'
                        )
                    )
                )
            )
        )
        return game
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class ProfileView(APIView):
    """
    Get and update user profile
    """
    from rest_framework.permissions import IsAuthenticated
    from rest_framework_simplejwt.authentication import JWTAuthentication
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .serializers import UserProfileSerializer
        from .models import UserProfile
        
        # The IsAuthenticated permission will handle authentication
        # If we reach here, the user is authenticated
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    def put(self, request):
        from .serializers import UserProfileUpdateSerializer
        from .models import UserProfile
        
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # Handle avatar removal (empty string means remove)
        data = request.data.copy()
        if 'avatar' in data and data['avatar'] == '':
            data['avatar'] = None
        
        serializer = UserProfileUpdateSerializer(profile, data=data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            # Refresh profile from database
            profile.refresh_from_db()
            # Return updated profile
            from .serializers import UserProfileSerializer
            profile_serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(profile_serializer.data)
        
        # Format validation errors
        error_messages = []
        for field, errors in serializer.errors.items():
            if isinstance(errors, list):
                error_messages.extend([f"{field}: {error}" for error in errors])
            else:
                error_messages.append(f"{field}: {errors}")
        
        return Response(
            {"error": "; ".join(error_messages) if error_messages else "Invalid profile data"},
            status=status.HTTP_400_BAD_REQUEST
        )


class PasswordResetRequestView(APIView):
    """
    Request password reset - sends email with reset link
    """
    def post(self, request):
        from .serializers import PasswordResetRequestSerializer
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.conf import settings
        import html2text
        
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                # Generate token
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Create reset URL
                frontend_url = request.data.get('frontend_url', 'http://localhost:3000')
                reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"
                
                # Send HTML email
                try:
                    subject = 'Reset Your Birdr Password'
                    
                    # Render HTML template
                    html_content = render_to_string('emails/password_reset.html', {
                        'reset_url': reset_url,
                        'user_email': email,
                        'username': user.username,
                    })
                    
                    # Convert HTML to plain text automatically
                    h = html2text.HTML2Text()
                    h.ignore_links = False
                    h.body_width = 0  # Don't wrap lines
                    text_content = h.handle(html_content)
                    
                    # Create email message
                    email_message = EmailMultiAlternatives(
                        subject=subject,
                        body=text_content,
                        from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'info@birdr.pro',
                        to=[email],
                    )
                    email_message.attach_alternative(html_content, "text/html")
                    email_message.send()
                except Exception as e:
                    # If email sending fails, still return success for security (don't reveal if email exists)
                    pass
                
                # Always return success to prevent email enumeration
                return Response({
                    "message": "If an account with this email exists, a password reset link has been sent."
                }, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                # Don't reveal if user exists
                return Response({
                    "message": "If an account with this email exists, a password reset link has been sent."
                }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token and set new password
    """
    def post(self, request):
        from .serializers import PasswordResetConfirmSerializer
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            uid = serializer.validated_data['uid']
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']
            
            try:
                # Decode user ID
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
                
                # Verify token
                if default_token_generator.check_token(user, token):
                    # Set new password
                    user.set_password(new_password)
                    user.save()
                    return Response({
                        "message": "Password has been reset successfully."
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "error": "Invalid or expired reset token."
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                return Response({
                    "error": "Invalid reset link."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
