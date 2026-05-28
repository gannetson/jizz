"""
Query-count guards for add_question and play serialization.
"""

import time

from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection

from jizz.game_question_selection import candidate_species_ids, create_question_for_game
from jizz.models import Country, CountrySpecies, Game, Player, Species
from jizz.question_play import load_question_for_play, serialize_question_for_play
from media.models import Media


class QuestionPerformanceTestCase(TestCase):
    def setUp(self):
        self.country = Country.objects.get_or_create(
            code='NL', defaults={'name': 'Netherlands'}
        )[0]
        self.player = Player.objects.create(name='Perf', language='en')
        for i in range(12):
            sp = Species.objects.create(
                name=f'Perf Bird {i}',
                name_latin=f'Perf latin {i}',
                code=f'PB{i:03d}',
            )
            CountrySpecies.objects.create(
                country=self.country,
                species=sp,
                status='native',
                frequency='abundant',
            )
            Media.objects.create(
                species=sp,
                type='image',
                url=f'https://example.com/pb{i}.jpg',
                source='test',
            )

    def test_candidate_species_ids_bounded_queries(self):
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=10,
            media='images',
            host=self.player,
            rarity='regular',
        )
        with CaptureQueriesContext(connection) as ctx:
            ids = candidate_species_ids(game)
        self.assertGreaterEqual(len(ids), 5)
        self.assertLessEqual(len(ctx), 3)

    def test_add_question_bounded_queries(self):
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=10,
            media='images',
            host=self.player,
            rarity='regular',
        )
        with CaptureQueriesContext(connection) as ctx:
            q = create_question_for_game(game)
        self.assertIsNotNone(q)
        # candidate pool + species/media pick + create (+ options for beginner)
        self.assertLessEqual(len(ctx), 25)

    def test_serialize_play_bounded_queries(self):
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=10,
            media='images',
            host=self.player,
            rarity='regular',
        )
        question = create_question_for_game(game)
        loaded = load_question_for_play(question.id)
        with CaptureQueriesContext(connection) as ctx:
            data = serialize_question_for_play(loaded)
        self.assertEqual(len(data['images']), 1)
        self.assertLessEqual(len(ctx), 8)

    def test_add_question_timing_smoke(self):
        """Regression guard: small fixture should stay well under multi-second stalls."""
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=20,
            media='images',
            host=self.player,
            rarity='regular',
        )
        t0 = time.perf_counter()
        for _ in range(5):
            game.add_question()
        elapsed = time.perf_counter() - t0
        self.assertLess(elapsed, 2.0, f'5 questions took {elapsed:.2f}s')
