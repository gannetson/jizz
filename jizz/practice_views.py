"""Personal practice stats and confusion-pair drill games."""

from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from jizz.game_question_selection import count_eligible_media, media_type_for_game
from jizz.models import Country, Game, Player, PlayerScore, Species
from jizz.quiz_mistake_stats import (
    get_user_confusion_pair_rows,
    get_user_species_mistake_rows,
    normalize_country_filter,
)
from jizz.serializers import GameSerializer
from jizz.services.species_cover import species_cover_url
from jizz.user_names import player_name_for_user


def _get_or_create_player_for_user(user) -> Player:
    player = Player.objects.filter(user=user).first()
    if player:
        return player
    return Player.objects.create(
        user=user,
        name=player_name_for_user(user),
        language=getattr(getattr(user, 'profile', None), 'language', None) or 'en',
    )


def _resolve_country(user, country_code: str | None) -> Country:
    code = normalize_country_filter(country_code)
    if not code:
        try:
            profile_country = user.profile.country_id
        except Exception:
            profile_country = None
        code = normalize_country_filter(profile_country)
    if not code:
        raise ValidationError({'country_code': 'Country is required (set profile country or pass country_code).'})
    return Country.objects.get(pk=code)


def _canonical_pair_ids(low_id: int, high_id: int) -> tuple[int, int]:
    if low_id == high_id:
        raise ValidationError({'error': 'Pair species must be different.'})
    return (low_id, high_id) if low_id < high_id else (high_id, low_id)


def _validate_pair_for_country(country: Country, low_id: int, high_id: int) -> None:
    from jizz.quiz_mistake_stats import _allowed_species_ids_for_country

    allowed = _allowed_species_ids_for_country(country.code)
    if low_id not in allowed or high_id not in allowed:
        raise ValidationError({'error': 'Both species must be on your country checklist.'})

    media_type = media_type_for_game(
        Game(country=country, media='images')
    )
    for sid in (low_id, high_id):
        if count_eligible_media(sid, media_type) <= 0:
            raise ValidationError({'error': 'Both species need eligible images for this country.'})


class TroubleSpotsView(APIView):
    """GET — personal mistake species and confusion pairs for the authenticated user."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        country_code = request.query_params.get('country_code') or request.query_params.get('country')
        cc = normalize_country_filter(country_code)
        if not cc:
            try:
                cc = normalize_country_filter(request.user.profile.country_id)
            except Exception:
                cc = None

        species_rows = get_user_species_mistake_rows(request.user.id, cc)
        species_ids = [row['species_id'] for row in species_rows]
        species_by_id = Species.objects.in_bulk(species_ids)
        for row in species_rows:
            sp = species_by_id.get(row['species_id'])
            row['illustration_url'] = species_cover_url(sp, request) if sp else None

        return Response(
            {
                'country_code': cc,
                'species': species_rows,
                'pairs': get_user_confusion_pair_rows(request.user.id, cc),
            }
        )


def _validate_species_for_country(country: Country, species_id: int) -> None:
    from jizz.quiz_mistake_stats import _allowed_species_ids_for_country

    allowed = _allowed_species_ids_for_country(country.code)
    if species_id not in allowed:
        raise ValidationError({'error': 'Species must be on your country checklist.'})

    media_type = media_type_for_game(
        Game(country=country, media='images')
    )
    if count_eligible_media(species_id, media_type) <= 0:
        raise ValidationError({'error': 'Species needs eligible images for this country.'})


class StartSpeciesPracticeView(APIView):
    """POST — start a 20-question advanced drill focused on one species and kin."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        species_id = request.data.get('species_id')
        if species_id is None:
            raise ValidationError({'error': 'species_id is required.'})

        try:
            species_id = int(species_id)
        except (TypeError, ValueError) as exc:
            raise ValidationError({'error': 'species_id must be an integer.'}) from exc

        if not Species.objects.filter(pk=species_id).exists():
            raise ValidationError({'error': 'Invalid species id.'})

        country = _resolve_country(request.user, request.data.get('country_code'))
        _validate_species_for_country(country, species_id)

        from jizz.game_question_selection import species_practice_pool_ids

        probe = Game(
            country=country,
            level='advanced',
            media='images',
            rarity=Game.RARIT_REGULAR,
            include_escapes=False,
            focus_species_id=species_id,
        )
        if len(species_practice_pool_ids(probe)) < 2:
            raise ValidationError(
                {'error': 'Not enough related species on your checklist to start practice.'}
            )

        host = _get_or_create_player_for_user(request.user)
        language = 'en'
        try:
            language = request.user.profile.language or language
        except Exception:
            pass

        game = Game.objects.create(
            country=country,
            level='advanced',
            length=20,
            media='images',
            rarity=Game.RARIT_REGULAR,
            include_escapes=False,
            multiplayer=False,
            game_type=Game.GAME_TYPE_SPECIES_PRACTICE,
            focus_species_id=species_id,
            host=host,
            language=language,
        )
        PlayerScore.objects.get_or_create(player=host, game=game, defaults={'score': 0})
        game.add_question()

        return Response(
            {
                'game': GameSerializer(game, context={'request': request}).data,
                'player_token': host.token,
            },
            status=status.HTTP_201_CREATED,
        )


class StartConfusionPairPracticeView(APIView):
    """POST — start a 20-question two-option drill for one confusion pair."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        low_id = request.data.get('low_id')
        high_id = request.data.get('high_id')
        if low_id is None or high_id is None:
            raise ValidationError({'error': 'low_id and high_id are required.'})

        try:
            low_id = int(low_id)
            high_id = int(high_id)
        except (TypeError, ValueError) as exc:
            raise ValidationError({'error': 'low_id and high_id must be integers.'}) from exc

        low_id, high_id = _canonical_pair_ids(low_id, high_id)
        if not Species.objects.filter(id__in=[low_id, high_id]).count() == 2:
            raise ValidationError({'error': 'Invalid species ids.'})

        country = _resolve_country(request.user, request.data.get('country_code'))
        _validate_pair_for_country(country, low_id, high_id)

        host = _get_or_create_player_for_user(request.user)
        language = 'en'
        try:
            language = request.user.profile.language or language
        except Exception:
            pass

        game = Game.objects.create(
            country=country,
            level='beginner',
            length=20,
            media='images',
            rarity=Game.RARIT_REGULAR,
            include_escapes=False,
            multiplayer=False,
            game_type=Game.GAME_TYPE_PAIR_PRACTICE,
            pair_species_low_id=low_id,
            pair_species_high_id=high_id,
            host=host,
            language=language,
        )
        PlayerScore.objects.get_or_create(player=host, game=game, defaults={'score': 0})
        game.add_question()

        return Response(
            {
                'game': GameSerializer(game, context={'request': request}).data,
                'player_token': host.token,
            },
            status=status.HTTP_201_CREATED,
        )
