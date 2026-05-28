from django.test import TestCase

from jizz.models import (
    Answer,
    Country,
    CountrySpecies,
    Game,
    Player,
    PlayerScore,
    Question,
    Species,
)
from jizz.serializers import AnswerSerializer


class AnswerSpeciesFrequencyTestCase(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code='NL', name='Netherlands')
        self.species = Species.objects.create(
            name='Rarity Bird',
            name_latin='Rarus birdus',
            code='rare01',
        )
        CountrySpecies.objects.create(
            country=self.country,
            species=self.species,
            status='native',
            frequency='vagrant',
        )
        self.player = Player.objects.create(name='Tester')
        self.game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=5,
            media='images',
            host=self.player,
        )
        self.player_score = PlayerScore.objects.create(player=self.player, game=self.game)
        self.question = Question.objects.create(
            game=self.game,
            species=self.species,
            sequence=1,
            number=0,
        )
        self.answer_row = Answer.objects.create(
            player_score=self.player_score,
            question=self.question,
            answer=self.species,
            correct=True,
        )

    def test_answer_serializer_includes_species_frequency(self):
        data = AnswerSerializer(
            self.answer_row,
            context={'game': self.game},
        ).data
        self.assertEqual(data['species_frequency'], 'vagrant')
