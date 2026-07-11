"""
Efficient species / media selection for Game.add_question().

Avoids join+distinct+ORDER BY RANDOM() on large tables; uses ID lists and random.choice.
"""

from __future__ import annotations

import random
from typing import Iterable, Sequence

from django.core.cache import cache
from django.db.models import Count, Exists, Max, OuterRef, Q

from jizz.models import CountrySpecies, Game, Question, QuestionOption, Species
from media.models import Media, MediaReview

_GAME_OPTION_SPECIES_CACHE_TTL = 60 * 60 * 24
_GAME_TARGET_SPECIES_CACHE_TTL = 60 * 60 * 24

_MEDIA_TYPE = {
    'images': 'image',
    'video': 'video',
    'audio': 'audio',
}

# Higher weight => more likely question target in extreme games.
EXTREME_FREQUENCY_WEIGHTS: dict[str | None, float] = {
    'abundant': 1.0,
    'very_common': 1.0,
    'common': 1.0,
    'fairly_common': 2.0,
    'uncommon': 4.0,
    'rare': 10.0,
    'very_rare': 20.0,
    'vagrant': 25.0,
    '': 2.0,
    None: 2.0,
}
EXTREME_USER_MISTAKE_MULTIPLIER = 4.0
SPECIES_PRACTICE_FOCUS_TARGET_FRACTION = 1 / 3
SPECIES_PRACTICE_TAX_NEIGHBOR_COUNT = 10
SPECIES_PRACTICE_WRONG_PICK_MULTIPLIER = 2.0
SPECIES_PRACTICE_FAMILY_MULTIPLIER = 2.0
SPECIES_PRACTICE_CONFUSION_MULTIPLIER = 1.5


def media_type_for_game(game: Game) -> str:
    return _MEDIA_TYPE.get(game.media, 'image')


def effective_rarity(game: Game) -> str:
    """Extreme games always allow the full exceptional frequency tier set."""
    if game.game_type == Game.GAME_TYPE_EXTREME:
        return Game.RARIT_EXCEPTIONAL
    return game.rarity


def country_statuses_for_game(game: Game) -> list[str]:
    if game.include_escapes:
        return ['native', 'endemic', 'rare', 'introduced', 'uncertain', 'unknown']
    if game.game_type in (
        Game.GAME_TYPE_SPECIES_PRACTICE,
        Game.GAME_TYPE_PAIR_PRACTICE,
    ):
        # Match trouble-spots checklist (_allowed_species_ids_for_country).
        return ['native', 'endemic', 'rare', 'extirpated']
    return ['native', 'endemic', 'rare']


def game_has_candidate_species(game: Game) -> bool:
    """True when at least one species can be used as a question target."""
    return bool(question_target_species_ids(game))


def _option_species_cache_key(game_id: int) -> str:
    return f'jizz:game_option_species:{game_id}'


def _target_species_cache_key(game_id: int) -> str:
    return f'jizz:game_target_species:{game_id}'


def _query_option_species_ids(game: Game) -> list[int]:
    """Uncached species IDs eligible for answer options."""
    media_type = media_type_for_game(game)
    statuses = country_statuses_for_game(game)

    country_species = CountrySpecies.objects.filter(
        country_id=game.country_id,
        status__in=statuses,
    ).filter(Game.country_species_rarity_q(effective_rarity(game)))

    species_qs = Species.objects.filter(
        id__in=country_species.values('species_id'),
    ).filter(
        Exists(
            Media.objects.filter(
                species_id=OuterRef('pk'),
                type=media_type,
                hide=False,
            )
        )
    )
    if game.tax_family:
        species_qs = species_qs.filter(taxonomic_family__name_latin=game.tax_family)
    elif game.tax_order:
        species_qs = species_qs.filter(taxonomic_order__name_latin=game.tax_order)

    return list(species_qs.values_list('id', flat=True))


def candidate_species_ids(game: Game) -> list[int]:
    """
    Species IDs eligible for answer options: country list + rarity + tax filter + media.

    Cached per game — filters are fixed for the lifetime of a session.
    """
    if not game.pk:
        return _query_option_species_ids(game)
    cache_key = _option_species_cache_key(game.pk)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    ids = _query_option_species_ids(game)
    cache.set(cache_key, ids, _GAME_OPTION_SPECIES_CACHE_TTL)
    return ids


def question_target_species_ids(
    game: Game,
    option_ids: Sequence[int] | None = None,
) -> list[int]:
    """
    Species IDs eligible as question targets (the bird shown to identify).

    When dificult_species is set, limits to top mistake targets that also pass
    the normal country/rarity/tax/media filters. Answer options still use the
    full candidate_species_ids pool.
    """
    if game.pk:
        cache_key = _target_species_cache_key(game.pk)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    ids = list(option_ids) if option_ids is not None else candidate_species_ids(game)
    if not game.dificult_species or not game.country_id:
        target_ids = ids
    else:
        from jizz.quiz_mistake_stats import get_top_mistake_target_species_ids

        top_difficult = set(get_top_mistake_target_species_ids(game.country_id, limit=100))
        if not top_difficult:
            top_difficult = set(
                get_top_mistake_target_species_ids(game.country_id, limit=100, min_wrong=1)
            )
        if top_difficult:
            filtered = [sid for sid in ids if sid in top_difficult]
            target_ids = filtered if filtered else ids
        else:
            target_ids = ids

    if game.pk:
        cache.set(_target_species_cache_key(game.pk), target_ids, _GAME_TARGET_SPECIES_CACHE_TTL)
    return target_ids


def _next_sequence_and_question_count(game: Game) -> tuple[int, int]:
    """Next sequence number and how many questions exist (one aggregate query)."""
    agg = game.questions.aggregate(
        max_seq=Max('sequence'),
        question_count=Count('id'),
    )
    sequence = (agg['max_seq'] or 0) + 1
    return sequence, agg['question_count'] or 0


def _pick_target_pool(
    game: Game,
    target_ids: Sequence[int],
    question_count: int,
) -> tuple[list[int], set[int]]:
    """
    Choose target species pool; skip loading all past species once every target was used.
    """
    target_list = list(target_ids)
    if question_count >= len(target_list):
        return target_list, set()

    used = set(game.questions.values_list('species_id', flat=True).distinct())
    prefer_unused = [sid for sid in target_list if sid not in used]
    pool = prefer_unused if prefer_unused else target_list
    return pool, used


def count_eligible_media(species_id: int, media_type: str) -> int:
    """Count without loading media rows (species with many assets stay fast)."""
    base = Media.objects.filter(species_id=species_id, type=media_type, hide=False)
    approved = base.filter(reviews__review_type=MediaReview.APPROVED).distinct().count()
    if approved:
        return approved
    return base.exclude(reviews__review_type=MediaReview.REJECTED).distinct().count()


def _media_count(
    species_id: int,
    media_type: str,
    cache: dict[int, int],
) -> int:
    if species_id not in cache:
        cache[species_id] = count_eligible_media(species_id, media_type)
    return cache[species_id]


def pick_random_species_id(
    candidate_ids: Sequence[int],
    exclude_ids: Iterable[int] = (),
) -> int | None:
    exclude = set(exclude_ids)
    pool = [sid for sid in candidate_ids if sid not in exclude]
    if not pool:
        pool = list(candidate_ids)
    if not pool:
        return None
    return random.choice(pool)


def _species_frequency_map(country_id: str | None, species_ids: Sequence[int]) -> dict[int, str | None]:
    if not country_id or not species_ids:
        return {}
    rows = CountrySpecies.objects.filter(
        country_id=country_id,
        species_id__in=species_ids,
    ).values_list('species_id', 'frequency')
    return {species_id: frequency or None for species_id, frequency in rows}


def build_extreme_target_weights(
    game: Game,
    candidate_ids: Sequence[int],
) -> dict[int, float]:
    freq_map = _species_frequency_map(game.country_id, candidate_ids)
    weights = {
        sid: EXTREME_FREQUENCY_WEIGHTS.get(freq_map.get(sid), EXTREME_FREQUENCY_WEIGHTS[None])
        for sid in candidate_ids
    }

    from jizz.quiz_mistake_stats import get_user_mistake_target_weights

    host = game.host
    mistake_weights = get_user_mistake_target_weights(
        game.country_id,
        player_id=host.id if host else None,
        user_id=host.user_id if host else None,
    )
    for sid, wrong_count in mistake_weights.items():
        if sid in weights and wrong_count > 0:
            weights[sid] *= 1 + wrong_count * EXTREME_USER_MISTAKE_MULTIPLIER
    return weights


def pick_weighted_species_id(
    candidate_ids: Sequence[int],
    weights: dict[int, float],
    exclude_ids: Iterable[int] = (),
) -> int | None:
    exclude = set(exclude_ids)
    pool = [sid for sid in candidate_ids if sid not in exclude]
    if not pool:
        pool = list(candidate_ids)
    if not pool:
        return None

    weighted_ids: list[int] = []
    weighted_values: list[float] = []
    for sid in pool:
        weight = weights.get(sid, 1.0)
        if weight > 0:
            weighted_ids.append(sid)
            weighted_values.append(weight)
    if not weighted_ids:
        return pick_random_species_id(candidate_ids, exclude_ids)
    return random.choices(weighted_ids, weights=weighted_values, k=1)[0]


def pick_species_id_for_game(
    game: Game,
    candidate_ids: Sequence[int],
    exclude_ids: Iterable[int] = (),
) -> int | None:
    if game.game_type == Game.GAME_TYPE_EXTREME:
        weights = build_extreme_target_weights(game, candidate_ids)
        return pick_weighted_species_id(candidate_ids, weights, exclude_ids)
    return pick_random_species_id(candidate_ids, exclude_ids)


def pick_species_with_eligible_media(
    game: Game,
    candidate_ids: Sequence[int],
    used_species_ids: Iterable[int],
) -> tuple[Species, int]:
    """
    Pick species and 0-based media index (question.number).
    Raises ValueError if no species with eligible media.
    """
    media_type = media_type_for_game(game)
    used = set(used_species_ids)
    tried: set[int] = set()
    media_counts: dict[int, int] = {}
    species_cache: dict[int, Species] = {}

    def species_for(sid: int) -> Species:
        if sid not in species_cache:
            species_cache.update(_species_map([sid]))
        species = species_cache.get(sid)
        if species is None:
            raise ValueError(f'Species {sid} not found')
        return species

    for _ in range(10):
        sid = pick_species_id_for_game(game, candidate_ids, exclude_ids=tried)
        if sid is None:
            break
        tried.add(sid)
        media_count = _media_count(sid, media_type, media_counts)
        if media_count > 0:
            number = random.randint(0, media_count - 1)
            return species_for(sid), number

        remaining = [i for i in candidate_ids if i not in tried and i not in used]
        if remaining:
            sid = pick_species_id_for_game(game, remaining)
            if sid is not None:
                tried.add(sid)
                media_count = _media_count(sid, media_type, media_counts)
                if media_count > 0:
                    number = random.randint(0, media_count - 1)
                    return species_for(sid), number

    raise ValueError(
        f"No species with {game.media} media available for game {game.id}"
    )


def _species_map(ids: Iterable[int]) -> dict[int, Species]:
    if not ids:
        return {}
    return {
        s.id: s
        for s in Species.objects.filter(id__in=ids).select_related(
            'taxonomic_genus',
            'taxonomic_family',
            'taxonomic_order',
        )
    }


def _sort_key_for_taxonomic_neighbor(species: Species) -> tuple:
    if species.tax_ordering is not None:
        return (0, species.tax_ordering, species.id)
    return (1, species.id)


ADVANCED_DISTRACTOR_COUNT = 5


def _pick_taxonomic_neighbors(
    answer_species: Species,
    pool_ids: Sequence[int],
    species_by_id: dict[int, Species],
    count: int,
) -> list[int]:
    """Pick up to count species nearest to answer by tax_ordering (or id when null)."""
    if count <= 0 or not pool_ids:
        return []

    answer_key = _sort_key_for_taxonomic_neighbor(answer_species)
    sorted_ids = sorted(pool_ids, key=lambda sid: _sort_key_for_taxonomic_neighbor(species_by_id[sid]))

    lower_ids: list[int] = []
    higher_ids: list[int] = []
    for sid in sorted_ids:
        key = _sort_key_for_taxonomic_neighbor(species_by_id[sid])
        if key < answer_key:
            lower_ids.append(sid)
        elif key > answer_key:
            higher_ids.append(sid)

    picked: list[int] = []

    def add_unique(sid: int) -> None:
        if sid not in picked and len(picked) < count:
            picked.append(sid)

    for sid in lower_ids[-2:]:
        add_unique(sid)
    for sid in higher_ids:
        if len(picked) >= count:
            break
        add_unique(sid)
    if len(picked) < count:
        for sid in reversed(lower_ids):
            if len(picked) >= count:
                break
            add_unique(sid)
    return picked[:count]


def advanced_option_species(
    candidate_ids: Sequence[int],
    answer_species: Species,
) -> list[Species]:
    """Advanced MC: distractors prefer same genus, then family, then order, then global tax order."""
    answer_id = answer_species.id
    all_ids = set(candidate_ids) | {answer_id}
    species_by_id = _species_map(all_ids)
    answer = species_by_id.get(answer_id, answer_species)

    candidate_set = {sid for sid in candidate_ids if sid != answer_id}
    genus_tier: set[int] = set()
    if answer.taxonomic_genus_id:
        genus_tier = {
            sid for sid in candidate_set
            if species_by_id[sid].taxonomic_genus_id == answer.taxonomic_genus_id
        }

    family_tier = {
        sid for sid in candidate_set
        if sid not in genus_tier
        and answer.taxonomic_family_id
        and species_by_id[sid].taxonomic_family_id == answer.taxonomic_family_id
    }
    order_tier = {
        sid for sid in candidate_set
        if sid not in genus_tier
        and sid not in family_tier
        and answer.taxonomic_order_id
        and species_by_id[sid].taxonomic_order_id == answer.taxonomic_order_id
    }

    distractor_ids: list[int] = []
    for tier in (genus_tier, family_tier, order_tier, candidate_set):
        if len(distractor_ids) >= ADVANCED_DISTRACTOR_COUNT:
            break
        remaining = [sid for sid in tier if sid not in distractor_ids]
        need = ADVANCED_DISTRACTOR_COUNT - len(distractor_ids)
        for sid in _pick_taxonomic_neighbors(answer, remaining, species_by_id, need):
            if sid not in distractor_ids:
                distractor_ids.append(sid)
            if len(distractor_ids) >= ADVANCED_DISTRACTOR_COUNT:
                break

    options = [species_by_id[sid] for sid in distractor_ids if sid in species_by_id]
    options.append(answer)
    return options


def species_practice_target_pool_ids(game: Game) -> list[int]:
    """
    Species eligible as question targets (the bird photo shown).

    Focus species, same-family checklist species (or closest taxonomic neighbors),
    globally common wrong picks, and confusion-pair partners.
    """
    focus_id = game.focus_species_id
    if not focus_id:
        return []

    all_candidates = set(candidate_species_ids(game))
    media_type = media_type_for_game(game)
    if focus_id not in all_candidates:
        if count_eligible_media(focus_id, media_type) <= 0:
            return []
        pool: set[int] = {focus_id}
        if not all_candidates:
            return sorted(pool)
    else:
        pool = {focus_id}

    species_by_id = _species_map(all_candidates | pool)
    focus = species_by_id.get(focus_id)
    if focus is None:
        return sorted(pool)

    others = all_candidates - pool
    family_mates: set[int] = set()
    if focus.taxonomic_family_id:
        family_mates = {
            sid for sid in others
            if species_by_id[sid].taxonomic_family_id == focus.taxonomic_family_id
        }
        pool |= family_mates

    if not family_mates:
        remaining = list(all_candidates - pool)
        if remaining:
            pool |= set(
                _pick_taxonomic_neighbors(
                    focus,
                    remaining,
                    species_by_id,
                    SPECIES_PRACTICE_TAX_NEIGHBOR_COUNT,
                )
            )

    from jizz.quiz_mistake_stats import (
        get_confusion_partner_species_ids,
        get_user_wrong_pick_weights_for_target,
        get_wrong_pick_weights_for_target,
    )

    for sid in get_wrong_pick_weights_for_target(
        focus_id,
        country_code=game.country_id,
    ):
        if sid in all_candidates:
            pool.add(sid)

    host = game.host if game.host_id else None
    if host is not None and (host.user_id or host.pk):
        for sid in get_user_wrong_pick_weights_for_target(
            focus_id,
            country_code=game.country_id,
            player_id=host.pk,
            user_id=host.user_id,
        ):
            if sid in all_candidates:
                pool.add(sid)

    user_id = host.user_id if host is not None else None
    for sid in get_confusion_partner_species_ids(
        focus_id,
        country_code=game.country_id,
        user_id=user_id,
    ):
        if sid in all_candidates:
            pool.add(sid)

    return sorted(pool)


def species_practice_pool_ids(game: Game) -> list[int]:
    """Alias for the question-target pool (focus + kin + common confusions)."""
    return species_practice_target_pool_ids(game)


def _apply_species_practice_related_weights(
    weights: dict[int, float],
    focus: Species,
    species_by_id: dict[int, Species],
) -> None:
    """Boost same-family species and confusion partners in the practice pool."""
    focus_id = focus.id
    for sid in weights:
        if sid == focus_id:
            continue
        sp = species_by_id.get(sid)
        if sp is None:
            continue
        if focus.taxonomic_family_id and sp.taxonomic_family_id == focus.taxonomic_family_id:
            weights[sid] *= SPECIES_PRACTICE_FAMILY_MULTIPLIER


def build_species_practice_target_weights(
    game: Game,
    pool_ids: Sequence[int],
) -> dict[int, float]:
    """Weight non-focus pool species; focus is chosen separately ~33% of the time."""
    focus_id = game.focus_species_id
    weights = {sid: 1.0 for sid in pool_ids if sid != focus_id}

    if not focus_id or not weights:
        return weights

    species_by_id = _species_map(pool_ids)
    focus = species_by_id.get(focus_id)
    if focus is not None:
        _apply_species_practice_related_weights(weights, focus, species_by_id)

    from jizz.quiz_mistake_stats import (
        get_confusion_partner_species_ids,
        get_user_wrong_pick_weights_for_target,
        get_wrong_pick_weights_for_target,
    )

    wrong_picks = dict(
        get_wrong_pick_weights_for_target(
            focus_id,
            country_code=game.country_id,
        )
    )
    host = game.host if game.host_id else None
    if host is not None and (host.user_id or host.pk):
        for sid, count in get_user_wrong_pick_weights_for_target(
            focus_id,
            country_code=game.country_id,
            player_id=host.pk,
            user_id=host.user_id,
        ).items():
            wrong_picks[sid] = wrong_picks.get(sid, 0) + count

    for sid, count in wrong_picks.items():
        if sid in weights and count > 0:
            weights[sid] *= 1 + count * SPECIES_PRACTICE_WRONG_PICK_MULTIPLIER

    user_id = host.user_id if host is not None else None
    for sid in get_confusion_partner_species_ids(
        focus_id,
        country_code=game.country_id,
        user_id=user_id,
    ):
        if sid in weights:
            weights[sid] *= SPECIES_PRACTICE_CONFUSION_MULTIPLIER

    return weights


def pick_species_practice_target_with_media(
    game: Game,
    pool_ids: Sequence[int],
) -> tuple[Species, int]:
    """Pick question target; focus species is shown about one third of the time."""
    focus_id = game.focus_species_id
    if not focus_id or not pool_ids:
        raise ValueError(f'Species practice game {game.id} is missing focus species or pool')

    media_type = media_type_for_game(game)
    media_counts: dict[int, int] = {}
    species_cache: dict[int, Species] = {}

    def pick_with_media(sid: int) -> tuple[Species, int] | None:
        media_count = _media_count(sid, media_type, media_counts)
        if media_count <= 0:
            return None
        if sid not in species_cache:
            species_cache.update(_species_map([sid]))
        species = species_cache[sid]
        number = random.randint(0, media_count - 1)
        return species, number

    if focus_id in pool_ids and random.random() < SPECIES_PRACTICE_FOCUS_TARGET_FRACTION:
        result = pick_with_media(focus_id)
        if result is not None:
            return result

    other_ids = [sid for sid in pool_ids if sid != focus_id]
    pick_pool = other_ids if other_ids else list(pool_ids)
    weights = build_species_practice_target_weights(game, pick_pool)
    tried: set[int] = set()

    for _ in range(10):
        sid = pick_weighted_species_id(pick_pool, weights, exclude_ids=tried)
        if sid is None:
            break
        tried.add(sid)
        result = pick_with_media(sid)
        if result is not None:
            return result

    if focus_id in pool_ids:
        result = pick_with_media(focus_id)
        if result is not None:
            return result

    raise ValueError(
        f'No species with {game.media} media available for species practice game {game.id}'
    )


def create_species_practice_question(game: Game) -> Question:
    """Advanced MC drill focused on one species and taxonomically related options."""
    target_pool = species_practice_target_pool_ids(game)
    option_pool = candidate_species_ids(game)
    if not target_pool:
        raise ValueError(f'Species practice game {game.id} has no eligible practice species')

    species, number = pick_species_practice_target_with_media(game, target_pool)
    sequence, _ = _next_sequence_and_question_count(game)

    options = advanced_option_species(option_pool, species)
    random.shuffle(options)
    question = game.questions.create(
        species=species, number=number, sequence=sequence
    )
    QuestionOption.objects.bulk_create(
        [
            QuestionOption(question=question, species=opt, order=index)
            for index, opt in enumerate(options)
        ]
    )
    return question


def beginner_option_species(
    candidate_ids: Sequence[int],
    answer_species: Species,
) -> list[Species]:
    """Three distractors (ID at least 20 away when possible) plus answer."""
    aid = answer_species.id
    far_ids = [i for i in candidate_ids if i != aid and abs(i - aid) >= 20]
    other_ids = [i for i in candidate_ids if i != aid and i not in far_ids]

    distractor_ids: list[int] = []
    if len(far_ids) >= 3:
        distractor_ids = random.sample(far_ids, 3)
    else:
        distractor_ids = list(far_ids)
        need = 3 - len(distractor_ids)
        if need > 0 and other_ids:
            distractor_ids.extend(random.sample(other_ids, min(need, len(other_ids))))

    by_id = _species_map(distractor_ids)
    options = [by_id[i] for i in distractor_ids if i in by_id]
    options.append(answer_species)
    return options


def create_pair_practice_question(game: Game) -> Question:
    """Two-option drill between a fixed species pair."""
    low_id = game.pair_species_low_id
    high_id = game.pair_species_high_id
    if not low_id or not high_id:
        raise ValueError(f'Pair practice game {game.id} is missing pair species')

    pool = [low_id, high_id]
    sequence, question_count = _next_sequence_and_question_count(game)
    pick_pool, used_ids = _pick_target_pool(game, pool, question_count)
    species, number = pick_species_with_eligible_media(game, pick_pool, used_ids)

    species_map = _species_map(pool)
    options = [species_map[low_id], species_map[high_id]]
    random.shuffle(options)

    question = game.questions.create(
        species=species, number=number, sequence=sequence
    )
    QuestionOption.objects.bulk_create(
        [
            QuestionOption(question=question, species=opt, order=index)
            for index, opt in enumerate(options)
        ]
    )
    return question


def create_question_for_game(game: Game) -> Question:
    """Build next question + options; caller holds game lock."""
    if game.game_type == Game.GAME_TYPE_PAIR_PRACTICE:
        return create_pair_practice_question(game)
    if game.game_type == Game.GAME_TYPE_SPECIES_PRACTICE:
        return create_species_practice_question(game)

    option_ids = candidate_species_ids(game)
    target_ids = question_target_species_ids(game, option_ids)
    if not option_ids:
        raise ValueError(f"No candidate species for game {game.id} ({game.country_id})")
    if not target_ids:
        raise ValueError(f"No question target species for game {game.id} ({game.country_id})")

    sequence, question_count = _next_sequence_and_question_count(game)
    pool, used_ids = _pick_target_pool(game, target_ids, question_count)
    species, number = pick_species_with_eligible_media(game, pool, used_ids)

    if game.level == 'advanced':
        options = advanced_option_species(option_ids, species)
        random.shuffle(options)
        question = game.questions.create(
            species=species, number=number, sequence=sequence
        )
        QuestionOption.objects.bulk_create(
            [
                QuestionOption(question=question, species=opt, order=index)
                for index, opt in enumerate(options)
            ]
        )
        return question

    if game.level == 'beginner':
        options = beginner_option_species(option_ids, species)
        random.shuffle(options)
        question = game.questions.create(
            species=species, number=number, sequence=sequence
        )
        QuestionOption.objects.bulk_create(
            [
                QuestionOption(question=question, species=opt, order=index)
                for index, opt in enumerate(options)
            ]
        )
        return question

    return game.questions.create(
        species=species, number=number, sequence=sequence
    )
