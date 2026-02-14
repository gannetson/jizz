"""
Tests for rematch logic (sync). The WebSocket consumer uses this via database_sync_to_async.
"""
from django.test import TestCase

from jizz.models import Game, Player, Country
from jizz.rematch import create_rematch_game


class RematchTestCase(TestCase):
    """Test create_rematch_game (host creates new game with same specs; non-host raises)."""

    def setUp(self):
        self.country = Country.objects.get_or_create(code="NL", defaults={"name": "Netherlands"})[0]
        self.host = Player.objects.create(name="Host", language="en")
        self.other = Player.objects.create(name="Other", language="en")
        self.game = Game.objects.create(
            country=self.country,
            level="advanced",
            length=10,
            media="images",
            host=self.host,
            multiplayer=True,
            include_rare=True,
            include_escapes=False,
        )

    def test_rematch_as_host_creates_new_game(self):
        new_game, player = create_rematch_game(self.game.token, self.host.token)
        self.assertEqual(player.id, self.host.id)
        self.assertIsNotNone(new_game.token)
        self.assertNotEqual(new_game.token, self.game.token)
        self.assertEqual(new_game.country_id, self.game.country_id)
        self.assertEqual(new_game.level, self.game.level)
        self.assertEqual(new_game.length, self.game.length)
        self.assertEqual(new_game.media, self.game.media)
        self.assertEqual(new_game.host_id, self.host.id)
        self.assertEqual(new_game.multiplayer, self.game.multiplayer)
        self.assertEqual(new_game.include_rare, self.game.include_rare)

    def test_rematch_as_non_host_raises(self):
        with self.assertRaises(ValueError) as ctx:
            create_rematch_game(self.game.token, self.other.token)
        self.assertIn("host", str(ctx.exception).lower())
