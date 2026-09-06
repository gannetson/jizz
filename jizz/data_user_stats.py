from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Count, Min, Q
from django.db.models.functions import Coalesce
from django.utils import timezone

from jizz.models import Player, PlayerScore
from jizz.user_names import player_name_for_user, sanitize_player_name
from media.models import MediaReview

User = get_user_model()


def _display_name_for_user(user, player: Player | None) -> str:
    if player and (player.name or '').strip():
        return sanitize_player_name(player.name)
    return player_name_for_user(user)


def _as_local_date(value):
    if value is None:
        return None
    if timezone.is_aware(value):
        return timezone.localdate(value)
    return value.date()


def _first_player_by_user(user_ids) -> dict[int, Player]:
    by_user: dict[int, Player] = {}
    if not user_ids:
        return by_user
    for player in Player.objects.filter(user_id__in=user_ids).order_by('id'):
        by_user.setdefault(player.user_id, player)
    return by_user


def games_per_user_rows() -> list[dict]:
    """Distinct scored games per user (linked players merged) or anonymous player."""
    auth_counts = {
        row['player__user_id']: row
        for row in (
            PlayerScore.objects.filter(game_id__isnull=False, player__user_id__isnull=False)
            .values('player__user_id')
            .annotate(
                games=Count('game_id', distinct=True),
                first_played=Min('game__created'),
            )
        )
    }
    anon_counts = {
        row['player_id']: row
        for row in (
            PlayerScore.objects.filter(game_id__isnull=False, player__user_id__isnull=True)
            .values('player_id')
            .annotate(
                games=Count('game_id', distinct=True),
                first_played=Min('game__created'),
            )
        )
    }

    rows: list[dict] = []
    users = User.objects.in_bulk(auth_counts.keys())
    players_by_user = _first_player_by_user(auth_counts.keys())
    for user_id, stats in auth_counts.items():
        user = users.get(user_id)
        rows.append(
            {
                'name': _display_name_for_user(user, players_by_user.get(user_id)),
                'games': stats['games'],
                'first_played': _as_local_date(stats['first_played']),
            }
        )

    anon_players = Player.objects.in_bulk(anon_counts.keys())
    for player_id, stats in anon_counts.items():
        player = anon_players.get(player_id)
        rows.append(
            {
                'name': sanitize_player_name(player.name if player else ''),
                'games': stats['games'],
                'first_played': _as_local_date(stats['first_played']),
            }
        )

    rows.sort(key=lambda row: (-row['games'], row['name'].lower()))
    return rows


def media_reviews_per_user_rows() -> list[dict]:
    """Media reviews per user (user FK or linked player) or anonymous player."""
    auth_rows = (
        MediaReview.objects.filter(Q(user_id__isnull=False) | Q(player__user_id__isnull=False))
        .annotate(uid=Coalesce('user_id', 'player__user_id'))
        .values('uid')
        .annotate(
            total=Count('id'),
            approved=Count('id', filter=Q(review_type=MediaReview.APPROVED)),
            rejected=Count('id', filter=Q(review_type=MediaReview.REJECTED)),
            not_sure=Count('id', filter=Q(review_type=MediaReview.NOT_SURE)),
        )
    )
    anon_rows = (
        MediaReview.objects.filter(user_id__isnull=True, player__user_id__isnull=True, player_id__isnull=False)
        .values('player_id')
        .annotate(
            total=Count('id'),
            approved=Count('id', filter=Q(review_type=MediaReview.APPROVED)),
            rejected=Count('id', filter=Q(review_type=MediaReview.REJECTED)),
            not_sure=Count('id', filter=Q(review_type=MediaReview.NOT_SURE)),
        )
    )

    rows: list[dict] = []
    auth_list = list(auth_rows)
    user_ids = [row['uid'] for row in auth_list if row['uid']]
    users = User.objects.in_bulk(user_ids)
    players_by_user = _first_player_by_user(user_ids)
    for row in auth_list:
        user = users.get(row['uid'])
        rows.append(
            {
                'name': _display_name_for_user(user, players_by_user.get(row['uid'])),
                'total': row['total'],
                'approved': row['approved'],
                'rejected': row['rejected'],
                'not_sure': row['not_sure'],
            }
        )

    anon_list = list(anon_rows)
    anon_players = Player.objects.in_bulk([row['player_id'] for row in anon_list])
    for row in anon_list:
        player = anon_players.get(row['player_id'])
        rows.append(
            {
                'name': sanitize_player_name(player.name if player else ''),
                'total': row['total'],
                'approved': row['approved'],
                'rejected': row['rejected'],
                'not_sure': row['not_sure'],
            }
        )

    rows.sort(key=lambda row: (-row['total'], row['name'].lower()))
    return rows
