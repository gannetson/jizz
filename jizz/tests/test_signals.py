"""
Tests for jizz signals (e.g. create_initial_country_game on CountryChallenge save).
"""
from django.test import TestCase

from jizz.models import (
    Country,
    Player,
    CountryChallenge,
    ChallengeLevel,
    Game,
    CountryGame,
)


class CreateInitialCountryGameSignalTestCase(TestCase):
    """Signal create_initial_country_game creates Game and CountryGame when CountryChallenge is created."""

    def setUp(self):
        self.country = Country.objects.create(name='Testland', code='XX')
        self.player = Player.objects.create(name='P', language='en')
        # Signal uses ChallengeLevel.objects.get(sequence=0); ensure exactly one exists.
        ChallengeLevel.objects.filter(sequence=0).delete()
        self.level0 = ChallengeLevel.objects.create(
            sequence=0,
            level='beginner',
            length=10,
            media='images',
            include_rare=False,
            include_escapes=False,
            title='Level 0',
            description='First level',
        )

    def test_creating_country_challenge_creates_game_and_country_game(self):
        self.assertEqual(Game.objects.count(), 0)
        self.assertEqual(CountryGame.objects.count(), 0)

        challenge = CountryChallenge.objects.create(
            country=self.country,
            player=self.player,
        )

        self.assertEqual(Game.objects.count(), 1)
        self.assertEqual(CountryGame.objects.count(), 1)

        game = Game.objects.get()
        self.assertEqual(game.country, self.country)
        self.assertEqual(game.host, self.player)
        self.assertEqual(game.level, 'beginner')
        self.assertEqual(game.length, 10)
        self.assertEqual(game.media, 'images')

        country_game = CountryGame.objects.get()
        self.assertEqual(country_game.country_challenge, challenge)
        self.assertEqual(country_game.game, game)
        self.assertEqual(country_game.challenge_level, self.level0)
