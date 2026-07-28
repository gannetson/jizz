"""Fill a Game with pre-created questions (species, options, locked media).

Used by flock challenges now; other modes can reuse the same path later.
Advancing during play only returns the next undone Question by sequence.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from django.db import transaction

from jizz.models import Game, Question, QuestionOption


@dataclass(frozen=True)
class PregeneratedItem:
    sequence: int
    species_id: int
    media_id: int
    option_species_ids: Sequence[int]


@transaction.atomic
def fill_pregenerated_game(game: Game, items: Sequence[PregeneratedItem]) -> list[Question]:
    """
    Create all Question + QuestionOption rows in the given order (no shuffle).

    Sets ``game.questions_pregenerated=True`` and locks each question's media.
    Caller must create the Game first; existing questions on the game are rejected.
    """
    if game.questions.exists():
        raise ValueError(f'Game {game.pk} already has questions; refuse to refill.')

    ordered = sorted(items, key=lambda item: item.sequence)
    questions: list[Question] = []
    option_rows: list[QuestionOption] = []

    for item in ordered:
        question = Question(
            game=game,
            species_id=item.species_id,
            media_id=item.media_id,
            number=0,
            sequence=item.sequence,
            done=False,
        )
        questions.append(question)

    Question.objects.bulk_create(questions)
    # Reload with PKs in sequence order
    created = list(game.questions.order_by('sequence'))
    by_sequence = {q.sequence: q for q in created}

    for item in ordered:
        question = by_sequence[item.sequence]
        for order, sid in enumerate(item.option_species_ids, start=1):
            option_rows.append(
                QuestionOption(question=question, species_id=sid, order=order)
            )

    QuestionOption.objects.bulk_create(option_rows)
    if not game.questions_pregenerated:
        game.questions_pregenerated = True
        game.save(update_fields=['questions_pregenerated'])

    return created
