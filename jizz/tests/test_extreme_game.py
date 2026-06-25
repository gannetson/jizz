from unittest.mock import patch

from django.test import TestCase

from jizz.game_question_selection import (
    build_extreme_target_weights,
    candidate_species_ids,
    create_question_for_game,
    pick_species_id_for_game,
)
from jizz.models import (
    Answer,
    Country,
    CountrySpecies,
    Game,
    Player,
    PlayerScore,
    Question,
    QuestionOption,
    Species,
)
from media.models import Media


class ExtremeGameSelectionTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code="EX", name="Extreme land")
        self.player = Player.objects.create(name="Host", language="en")

        self.common_sp = Species.objects.create(name="Common", name_latin="Comm c", code="CM01")
        self.rare_sp = Species.objects.create(name="Rare", name_latin="Rare r", code="RR01")
        self.vagrant_sp = Species.objects.create(name="Vagrant", name_latin="Vagr v", code="VG01")

        CountrySpecies.objects.create(
            country=self.country,
            species=self.common_sp,
            status="native",
            frequency="common",
        )
        CountrySpecies.objects.create(
            country=self.country,
            species=self.rare_sp,
            status="native",
            frequency="rare",
        )
        CountrySpecies.objects.create(
            country=self.country,
            species=self.vagrant_sp,
            status="native",
            frequency="vagrant",
        )

        for sp in (self.common_sp, self.rare_sp, self.vagrant_sp):
            Media.objects.create(
                species=sp,
                type="image",
                url=f"https://example.com/{sp.code}.jpg",
                source="test",
            )

    def _extreme_game(self, **kwargs):
        defaults = {
            "country": self.country,
            "level": "beginner",
            "length": 5,
            "media": "images",
            "host": self.player,
            "rarity": "regular",
            "game_type": Game.GAME_TYPE_EXTREME,
        }
        defaults.update(kwargs)
        return Game.objects.create(**defaults)

    def test_extreme_uses_exceptional_rarity_pool(self):
        game = self._extreme_game()
        ids = set(candidate_species_ids(game))
        self.assertIn(self.vagrant_sp.id, ids)
        self.assertIn(self.rare_sp.id, ids)
        self.assertIn(self.common_sp.id, ids)

    def test_extreme_weights_favor_rare_species(self):
        game = self._extreme_game()
        candidate_ids = [self.common_sp.id, self.vagrant_sp.id]
        weights = build_extreme_target_weights(game, candidate_ids)
        self.assertGreater(weights[self.vagrant_sp.id], weights[self.common_sp.id])

    def test_extreme_weights_boost_user_mistakes(self):
        other_game = Game.objects.create(
            country=self.country,
            level="beginner",
            length=1,
            media="images",
        )
        q = Question.objects.create(
            game=other_game,
            species=self.rare_sp,
            number=0,
            sequence=1,
        )
        QuestionOption.objects.create(question=q, species=self.rare_sp, order=1)
        QuestionOption.objects.create(question=q, species=self.common_sp, order=2)
        ps = PlayerScore.objects.create(player=self.player, game=other_game)
        for _ in range(3):
            Answer.objects.create(
                player_score=ps,
                question=q,
                answer=self.common_sp,
                correct=False,
            )

        game = self._extreme_game()
        baseline = build_extreme_target_weights(game, [self.rare_sp.id])[self.rare_sp.id]
        boosted = build_extreme_target_weights(
            game, [self.common_sp.id, self.rare_sp.id, self.vagrant_sp.id]
        )[self.rare_sp.id]
        self.assertGreater(boosted, baseline)

    def test_extreme_pick_prefers_weighted_species(self):
        game = self._extreme_game()
        candidate_ids = [self.common_sp.id, self.vagrant_sp.id]
        with patch(
            "jizz.game_question_selection.random.choices",
            return_value=[self.vagrant_sp.id],
        ):
            picked = pick_species_id_for_game(game, candidate_ids)
        self.assertEqual(picked, self.vagrant_sp.id)

    def test_extreme_game_questions_use_weighted_targets(self):
        game = self._extreme_game()
        with patch(
            "jizz.game_question_selection.pick_species_id_for_game",
            side_effect=[self.vagrant_sp.id, self.rare_sp.id, self.vagrant_sp.id],
        ):
            for _ in range(3):
                create_question_for_game(game)
        species_ids = list(game.questions.values_list("species_id", flat=True))
        self.assertEqual(species_ids, [self.vagrant_sp.id, self.rare_sp.id, self.vagrant_sp.id])
