"""
Efficient species / media selection for Game.add_question().

Avoids join+distinct+ORDER BY RANDOM() on large tables; uses ID lists and random.choice.
"""

from __future__ import annotations

import random
from typing import Iterable, Sequence

from django.db.models import Exists, OuterRef, Q

from jizz.models import CountrySpecies, Game, Question, QuestionOption, Species
from media.models import Media, MediaReview

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
SPECIES_PRACTICE_FOCUS_WEIGHT = 3.0
SPECIES_PRACTICE_MIN_POOL = 5


def media_type_for_game(game: Game) -> str:
    return _MEDIA_TYPE.get(game.media, 'image')


def effective_rarity(game: Game) -> str:
    """Extreme games always allow the full exceptional frequency tier set."""
    if game.game_type == Game.GAME_TYPE_EXTREME:
        return Game.RARIT_EXCEPTIONAL
    return game.rarity


def country_statuses_for_game(game: Game) -> list[str]:
    statuses = ['native', 'endemic', 'rare']
    if game.include_escapes:
        statuses.extend(['introduced', 'uncertain', 'unknown'])
    return statuses


def game_has_candidate_species(game: Game) -> bool:
    """True when at least one species can be used as a question target."""
    return bool(question_target_species_ids(game))


def candidate_species_ids(game: Game) -> list[int]:
    """
    Species IDs eligible for answer options: country list + rarity + tax filter + media.
    """
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


def question_target_species_ids(game: Game) -> list[int]:
    """
    Species IDs eligible as question targets (the bird shown to identify).

    When dificult_species is set, limits to top mistake targets that also pass
    the normal country/rarity/tax/media filters. Answer options still use the
    full candidate_species_ids pool.
    """
    ids = candidate_species_ids(game)
    if not game.dificult_species or not game.country_id:
        return ids

    from jizz.quiz_mistake_stats import get_top_mistake_target_species_ids

    top_difficult = set(get_top_mistake_target_species_ids(game.country_id, limit=100))
    if not top_difficult:
        top_difficult = set(
            get_top_mistake_target_species_ids(game.country_id, limit=100, min_wrong=1)
        )
    if top_difficult:
        filtered = [sid for sid in ids if sid in top_difficult]
        if filtered:
            return filtered

    return ids


def count_eligible_media(species_id: int, media_type: str) -> int:
    """Count without loading media rows (species with many assets stay fast)."""
    base = Media.objects.filter(species_id=species_id, type=media_type, hide=False)
    approved = base.filter(reviews__review_type=MediaReview.APPROVED).distinct().count()
    if approved:
        return approved
    return base.exclude(reviews__review_type=MediaReview.REJECTED).distinct().count()


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

    for _ in range(10):
        sid = pick_species_id_for_game(game, candidate_ids, exclude_ids=tried)
        if sid is None:
            break
        tried.add(sid)
        media_count = count_eligible_media(sid, media_type)
        if media_count > 0:
            species = Species.objects.get(pk=sid)
            number = random.randint(0, media_count - 1)
            return species, number

        remaining = [i for i in candidate_ids if i not in tried and i not in used]
        if remaining:
            sid = pick_species_id_for_game(game, remaining)
            if sid is not None:
                tried.add(sid)
                media_count = count_eligible_media(sid, media_type)
                if media_count > 0:
                    species = Species.objects.get(pk=sid)
                    number = random.randint(0, media_count - 1)
                    return species, number

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


def species_practice_pool_ids(game: Game) -> list[int]:
    """
    Focus species plus closely related candidates (genus → family → order → tax neighbors).
    """
    focus_id = game.focus_species_id
    if not focus_id:
        return []

    all_candidates = set(candidate_species_ids(game))
    if focus_id not in all_candidates:
        return []

    species_by_id = _species_map(all_candidates)
    focus = species_by_id.get(focus_id)
    if focus is None:
        return [focus_id]

    pool: set[int] = {focus_id}
    others = all_candidates - pool

    genus_tier = {
        sid for sid in others
        if focus.taxonomic_genus_id
        and species_by_id[sid].taxonomic_genus_id == focus.taxonomic_genus_id
    }
    pool |= genus_tier
    if len(pool) >= SPECIES_PRACTICE_MIN_POOL:
        return sorted(pool)

    family_tier = {
        sid for sid in others - pool
        if focus.taxonomic_family_id
        and species_by_id[sid].taxonomic_family_id == focus.taxonomic_family_id
    }
    pool |= family_tier
    if len(pool) >= SPECIES_PRACTICE_MIN_POOL:
        return sorted(pool)

    order_tier = {
        sid for sid in others - pool
        if focus.taxonomic_order_id
        and species_by_id[sid].taxonomic_order_id == focus.taxonomic_order_id
    }
    pool |= order_tier
    if len(pool) >= SPECIES_PRACTICE_MIN_POOL:
        return sorted(pool)

    remaining = list(others - pool)
    if remaining:
        pool |= set(
            _pick_taxonomic_neighbors(
                focus,
                remaining,
                species_by_id,
                max(SPECIES_PRACTICE_MIN_POOL - len(pool), 4),
            )
        )

    return sorted(pool)


def pick_species_practice_target_with_media(
    game: Game,
    pool_ids: Sequence[int],
    used_species_ids: Iterable[int],
) -> tuple[Species, int]:
    """Pick question target from related pool, weighted toward the focus species."""
    focus_id = game.focus_species_id
    if not focus_id or not pool_ids:
        raise ValueError(f'Species practice game {game.id} is missing focus species or pool')

    media_type = media_type_for_game(game)
    used = set(used_species_ids)
    weights = {
        sid: SPECIES_PRACTICE_FOCUS_WEIGHT if sid == focus_id else 1.0
        for sid in pool_ids
    }
    tried: set[int] = set()

    for _ in range(10):
        sid = pick_weighted_species_id(pool_ids, weights, exclude_ids=tried | used)
        if sid is None:
            sid = pick_weighted_species_id(pool_ids, weights, exclude_ids=tried)
        if sid is None:
            break
        tried.add(sid)
        media_count = count_eligible_media(sid, media_type)
        if media_count > 0:
            species = Species.objects.get(pk=sid)
            number = random.randint(0, media_count - 1)
            return species, number

    raise ValueError(
        f'No species with {game.media} media available for species practice game {game.id}'
    )


def create_species_practice_question(game: Game) -> Question:
    """Advanced MC drill focused on one species and taxonomically related options."""
    pool = species_practice_pool_ids(game)
    if not pool:
        raise ValueError(f'Species practice game {game.id} has no eligible related species')

    used_ids = list(game.questions.values_list('species_id', flat=True))
    species, number = pick_species_practice_target_with_media(game, pool, used_ids)
    sequence = game.questions.count() + 1

    options = advanced_option_species(pool, species)
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
    used_ids = list(game.questions.values_list('species_id', flat=True))
    species, number = pick_species_with_eligible_media(game, pool, used_ids)
    sequence = game.questions.count() + 1

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
    target_ids = question_target_species_ids(game)
    if not option_ids:
        raise ValueError(f"No candidate species for game {game.id} ({game.country_id})")
    if not target_ids:
        raise ValueError(f"No question target species for game {game.id} ({game.country_id})")

    used_ids = list(game.questions.values_list('species_id', flat=True))
    prefer_unused = [i for i in target_ids if i not in used_ids]
    pool = prefer_unused if prefer_unused else list(target_ids)

    species, number = pick_species_with_eligible_media(game, pool, used_ids)
    sequence = game.questions.count() + 1

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
