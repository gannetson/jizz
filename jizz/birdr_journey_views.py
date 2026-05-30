"""
API for Birdr Journey — solo level progression per country.
"""

from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from jizz.models import BirdrJourney, BirdrJourneyGame, Country, Game, JourneyLevel, JourneyStep, Player
from jizz.serializers import BirdrJourneyGameSerializer, BirdrJourneySerializer
from jizz.views import GetPlayerMixin


def get_journey_levels_ordered():
    return list(JourneyLevel.objects.prefetch_related('steps').order_by('sequence'))


def get_journey_level(level_index):
    """Return the level at a 0-based index in the ordered level list.

    ``BirdrJourney.current_sequence`` stores this index, not ``JourneyLevel.sequence``.
    Admin may use any sequence numbers (e.g. 1, 2, 3).
    """
    levels = get_journey_levels_ordered()
    if level_index < 0 or level_index >= len(levels):
        return None
    return levels[level_index]


def get_level_steps_ordered(level):
    return list(level.steps.order_by('sequence'))


def get_step_index(level, step):
    for i, s in enumerate(get_level_steps_ordered(level)):
        if s.id == step.id:
            return i
    return None


def get_journey_host(journey):
    if journey.player_id:
        return journey.player
    player = Player.objects.filter(user=journey.user).first()
    if player:
        return player
    name = getattr(journey.user, 'username', None) or getattr(journey.user, 'email', '') or 'Player'
    if len(name) > 255:
        name = name[:255]
    return Player.objects.create(user=journey.user, name=name, language='en')


def get_active_journey_step(journey):
    level = get_journey_level(journey.current_sequence)
    if not level or level.is_champion:
        return None
    steps = get_level_steps_ordered(level)
    if journey.current_step_sequence >= len(steps):
        return None
    return steps[journey.current_step_sequence]


def get_current_journey_game(journey):
    step = get_active_journey_step(journey)
    if not step:
        return None
    return (
        journey.games.filter(journey_step=step)
        .select_related('game', 'journey_step', 'journey_step__journey_level')
        .order_by('-created')
        .first()
    )


def compute_step_statuses(journey):
    level = get_journey_level(journey.current_sequence)
    if not level:
        return {}
    statuses = {}
    for i, step in enumerate(get_level_steps_ordered(level)):
        if i < journey.current_step_sequence:
            statuses[step.id] = 'completed'
        elif i == journey.current_step_sequence:
            statuses[step.id] = 'current'
        else:
            statuses[step.id] = 'locked'
    return statuses


def is_pending_level_celebration(journey):
    level = get_journey_level(journey.current_sequence)
    if not level or level.is_champion:
        return False
    step_count = len(get_level_steps_ordered(level))
    if step_count == 0:
        return False
    return journey.current_step_sequence >= step_count


class BirdrJourneyMixin(GetPlayerMixin):
    permission_classes = (AllowAny,)

    def _resolve_owner(self, request):
        if request.user and request.user.is_authenticated:
            return {'user': request.user, 'player': None}
        try:
            player = self.get_player_from_request(request)
        except AuthenticationFailed:
            raise AuthenticationFailed(
                'Authentication required. Log in or provide a valid player token.'
            )
        return {'user': None, 'player': player}

    def _get_country(self, country_code):
        if not country_code or not str(country_code).strip():
            raise ValidationError({'country_code': 'This field is required.'})
        code = str(country_code).strip().upper()
        try:
            return Country.objects.get(pk=code)
        except Country.DoesNotExist:
            raise ValidationError({'country_code': f'Unknown country: {code}'})

    def _journey_queryset(self, owner):
        qs = (
            BirdrJourney.objects.select_related('country', 'user', 'player')
            .prefetch_related(
                'games__game__scores__answers',
                'games__journey_step__journey_level',
            )
        )
        if owner['user']:
            return qs.filter(user=owner['user'])
        return qs.filter(player=owner['player'])

    def _get_journey(self, owner, country):
        return self._journey_queryset(owner).filter(country=country).first()

    def _get_owned_journey(self, request, journey_id):
        owner = self._resolve_owner(request)
        qs = self._journey_queryset(owner)
        return get_object_or_404(qs, id=journey_id)

    def _serialize_journey(self, journey, request):
        return BirdrJourneySerializer(journey, context={'request': request}).data


class BirdrJourneyView(BirdrJourneyMixin, APIView):
    """GET ?country_code=XX — load journey; POST { country_code } — get or create at first level."""

    def get(self, request):
        owner = self._resolve_owner(request)
        country_code = request.query_params.get('country_code')
        country = self._get_country(country_code)
        journey = self._get_journey(owner, country)
        if not journey:
            raise Http404('No journey found for this country.')
        return Response(self._serialize_journey(journey, request))

    def post(self, request):
        owner = self._resolve_owner(request)
        country_code = request.data.get('country_code')
        country = self._get_country(country_code)
        if owner['user']:
            journey, created = BirdrJourney.objects.get_or_create(
                user=owner['user'],
                country=country,
                defaults={'current_sequence': 0, 'current_step_sequence': 0, 'player': None},
            )
        else:
            journey, created = BirdrJourney.objects.get_or_create(
                player=owner['player'],
                country=country,
                defaults={'current_sequence': 0, 'current_step_sequence': 0, 'user': None},
            )
        return Response(
            self._serialize_journey(journey, request),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class BirdrJourneyStartStepView(BirdrJourneyMixin, APIView):
    """POST — create or return game for the active step."""

    def post(self, request, journey_id):
        journey = self._get_owned_journey(request, journey_id)
        if is_pending_level_celebration(journey):
            raise ValidationError({'error': 'Complete level celebration before starting a new step.'})

        step = get_active_journey_step(journey)
        if not step:
            raise ValidationError({'error': 'No active step available.'})

        existing = (
            journey.games.filter(journey_step=step)
            .select_related('game', 'journey_step')
            .order_by('-created')
            .first()
        )
        if existing:
            if existing.status == 'running':
                return Response({
                    'journey': self._serialize_journey(journey, request),
                    'journey_game': BirdrJourneyGameSerializer(
                        existing, context={'request': request}
                    ).data,
                })
            if existing.status == 'new' and existing.game.questions.count() > 0:
                return Response({
                    'journey': self._serialize_journey(journey, request),
                    'journey_game': BirdrJourneyGameSerializer(
                        existing, context={'request': request}
                    ).data,
                })
            # Failed attempt or empty shell (question never loaded): start fresh.
            existing.game.delete()

        host = get_journey_host(journey)
        language = getattr(host, 'language', 'en') or 'en'
        if journey.user_id:
            try:
                language = journey.user.profile.language or language
            except Exception:
                pass

        game = Game.objects.create(
            country=journey.country,
            level=step.level,
            length=step.length,
            media=step.media,
            rarity=step.rarity,
            include_escapes=step.include_escapes,
            tax_order=step.tax_order,
            host=host,
            language=language,
        )
        journey_game = BirdrJourneyGame.objects.create(
            birdr_journey=journey,
            journey_step=step,
            game=game,
        )
        return Response(
            {
                'journey': self._serialize_journey(journey, request),
                'journey_game': BirdrJourneyGameSerializer(
                    journey_game, context={'request': request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class BirdrJourneyCompleteStepView(BirdrJourneyMixin, APIView):
    """POST — sync step progress after a game ends."""

    def post(self, request, journey_id):
        journey = self._get_owned_journey(request, journey_id)
        game_token = request.data.get('game_token')

        if game_token:
            journey_game = get_object_or_404(
                BirdrJourneyGame.objects.select_related('game', 'journey_step'),
                birdr_journey=journey,
                game__token=game_token,
            )
        else:
            journey_game = get_current_journey_game(journey)
            if not journey_game:
                raise ValidationError({'error': 'No active journey game found.'})

        level_complete = False
        if journey_game.status == 'passed':
            step = journey_game.journey_step
            level = step.journey_level
            step_index = get_step_index(level, step)
            steps = get_level_steps_ordered(level)
            if step_index is not None and step_index == journey.current_step_sequence:
                journey.current_step_sequence += 1
                journey.save(update_fields=['current_step_sequence', 'updated'])
                level_complete = journey.current_step_sequence >= len(steps)

        journey.refresh_from_db()
        return Response({
            'journey': self._serialize_journey(journey, request),
            'level_complete': level_complete,
            'status': journey_game.status,
        })


class BirdrJourneyAdvanceLevelView(BirdrJourneyMixin, APIView):
    """POST — advance to the next level after celebration."""

    def post(self, request, journey_id):
        journey = self._get_owned_journey(request, journey_id)
        if not is_pending_level_celebration(journey):
            raise ValidationError({'error': 'Level celebration is not pending.'})

        next_level = get_journey_level(journey.current_sequence + 1)
        if not next_level:
            raise ValidationError({'error': 'No next level available.'})

        journey.current_sequence += 1
        journey.current_step_sequence = 0
        journey.save(update_fields=['current_sequence', 'current_step_sequence', 'updated'])
        return Response(self._serialize_journey(journey, request))
