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


def media_type_for_game(game: Game) -> str:
    return _MEDIA_TYPE.get(game.media, 'image')


def country_statuses_for_game(game: Game) -> list[str]:
    statuses = ['native', 'endemic', 'rare']
    if game.include_escapes:
        statuses.extend(['introduced', 'uncertain', 'unknown'])
    return statuses


def game_has_candidate_species(game: Game) -> bool:
    """True when at least one species matches this game's country and filters."""
    return bool(candidate_species_ids(game))


def candidate_species_ids(game: Game) -> list[int]:
    """
    Species IDs eligible for this game: country list + rarity + tax filter + has media of game type.
    """
    media_type = media_type_for_game(game)
    statuses = country_statuses_for_game(game)

    country_species = CountrySpecies.objects.filter(
        country_id=game.country_id,
        status__in=statuses,
    ).filter(Game.country_species_rarity_q(game.rarity))

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
        species_qs = species_qs.filter(tax_family=game.tax_family)
    elif game.tax_order:
        species_qs = species_qs.filter(tax_order=game.tax_order)

    return list(species_qs.values_list('id', flat=True))


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
        sid = pick_random_species_id(candidate_ids, exclude_ids=tried)
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
            sid = pick_random_species_id(remaining)
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
    return {s.id: s for s in Species.objects.filter(id__in=ids)}


def advanced_option_species(
    candidate_ids: Sequence[int],
    answer_species: Species,
) -> list[Species]:
    """Match legacy advanced MC: neighbors by species id + answer (caller shuffles)."""
    aid = answer_species.id
    lower_ids = sorted((i for i in candidate_ids if i < aid), reverse=True)
    higher_ids = sorted(i for i in candidate_ids if i > aid)

    options1_ids = lower_ids[:2]
    next_n = 5 - len(options1_ids)
    options2_ids = higher_ids[:next_n]
    if len(options2_ids) < 2:
        prev = 5 - len(options2_ids)
        options1_ids = lower_ids[:prev]

    by_id = _species_map(set(options1_ids) | set(options2_ids) | {aid})
    options = [by_id[i] for i in options1_ids if i in by_id]
    options.extend(by_id[i] for i in options2_ids if i in by_id)
    options.append(answer_species)
    return options


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


def create_question_for_game(game: Game) -> Question:
    """Build next question + options; caller holds game lock."""
    candidate_ids = candidate_species_ids(game)
    if not candidate_ids:
        raise ValueError(f"No candidate species for game {game.id} ({game.country_id})")

    used_ids = list(game.questions.values_list('species_id', flat=True))
    prefer_unused = [i for i in candidate_ids if i not in used_ids]
    pool = prefer_unused if prefer_unused else list(candidate_ids)

    species, number = pick_species_with_eligible_media(game, pool, used_ids)
    sequence = game.questions.count() + 1

    if game.level == 'advanced':
        options = advanced_option_species(candidate_ids, species)
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
        options = beginner_option_species(candidate_ids, species)
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
