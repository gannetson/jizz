from datetime import date, datetime

from django.test import TestCase
from django.utils import timezone

from jizz.games_played_stats import (
    default_date_range,
    games_played_by_country,
    games_played_rows,
    world_map_country_code,
)
from jizz.models import Country, Game, Player, PlayerScore


class GamesPlayedStatsTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code="X9", name="Games Played Land")
        self.players = [
            Player.objects.create(name=f"Player {i}", language="en") for i in range(3)
        ]

    def _game_with_scores(self, when: date, player_indexes=(0,)):
        game = Game.objects.create(
            country=self.country,
            level="beginner",
            length=5,
            media="images",
            host=self.players[player_indexes[0]],
        )
        aware = timezone.make_aware(datetime.combine(when, datetime.min.time()))
        Game.objects.filter(pk=game.pk).update(created=aware)
        for idx in player_indexes:
            PlayerScore.objects.create(player=self.players[idx], game=game, score=1)
        return game

    def test_monthly_counts_distinct_games_and_players(self):
        self._game_with_scores(date(2026, 1, 5), player_indexes=(0, 1))
        self._game_with_scores(date(2026, 1, 20), player_indexes=(1, 2))
        self._game_with_scores(date(2026, 2, 3), player_indexes=(0,))

        rows = games_played_rows(date(2026, 1, 1), date(2026, 2, 28), granularity="month")
        by_period = {row["period"]: row for row in rows}

        self.assertEqual(by_period["2026-01-01"]["games"], 2)
        self.assertEqual(by_period["2026-01-01"]["players"], 3)
        self.assertEqual(by_period["2026-02-01"]["games"], 1)
        self.assertEqual(by_period["2026-02-01"]["players"], 1)

    def test_daily_granularity(self):
        self._game_with_scores(date(2026, 3, 10), player_indexes=(0,))
        self._game_with_scores(date(2026, 3, 10), player_indexes=(1,))
        self._game_with_scores(date(2026, 3, 11), player_indexes=(0, 1))

        rows = games_played_rows(date(2026, 3, 10), date(2026, 3, 11), granularity="day")
        by_period = {row["period"]: row for row in rows}

        self.assertEqual(by_period["2026-03-10"]["games"], 2)
        self.assertEqual(by_period["2026-03-10"]["players"], 2)
        self.assertEqual(by_period["2026-03-11"]["games"], 1)
        self.assertEqual(by_period["2026-03-11"]["players"], 2)

    def test_default_range_is_twelve_months(self):
        start, end = default_date_range()
        self.assertLessEqual(start, end)
        self.assertGreaterEqual((end.year - start.year) * 12 + (end.month - start.month), 11)

    def test_by_country_counts_distinct_games(self):
        nl = Country.objects.create(code="NL", name="Netherlands")
        de = Country.objects.create(code="DE", name="Germany")
        for idx, country in enumerate((nl, de, nl)):
            game = Game.objects.create(
                country=country,
                level="beginner",
                length=5,
                media="images",
                host=self.players[0],
            )
            aware = timezone.make_aware(datetime.combine(date(2026, 4, 1 + idx), datetime.min.time()))
            Game.objects.filter(pk=game.pk).update(created=aware)
            PlayerScore.objects.create(player=self.players[idx % 3], game=game, score=1)

        stats = games_played_by_country(date(2026, 4, 1), date(2026, 4, 30), granularity="month")
        by_code = {row["country_code"]: row for row in stats["by_country"]}

        self.assertEqual(by_code["NL"]["games"], 2)
        self.assertEqual(by_code["DE"]["games"], 1)
        self.assertEqual(stats["country_map"]["NL"], 2)
        self.assertEqual(stats["country_map"]["DE"], 1)

    def test_world_map_rolls_up_us_and_nl_subregions(self):
        us = Country.objects.create(code="US", name="United States")
        us_east = Country.objects.create(code="US-EAST", name="US East")
        us_west = Country.objects.create(code="US-WEST", name="US West")
        us_ak = Country.objects.create(code="US-AK", name="US Alaska")
        us_hi = Country.objects.create(code="US-HI", name="US Hawaii")
        nl = Country.objects.create(code="NL", name="Netherlands")
        nl_nh = Country.objects.create(code="NL-NH", name="Noord-Holland")

        for idx, country in enumerate((us, us_east, us_west, us_ak, us_hi, nl, nl_nh)):
            game = Game.objects.create(
                country=country,
                level="beginner",
                length=5,
                media="images",
                host=self.players[0],
            )
            aware = timezone.make_aware(datetime.combine(date(2026, 5, 1 + idx), datetime.min.time()))
            Game.objects.filter(pk=game.pk).update(created=aware)
            PlayerScore.objects.create(player=self.players[0], game=game, score=1)

        stats = games_played_by_country(date(2026, 5, 1), date(2026, 5, 31), granularity="month")

        self.assertEqual(stats["country_map"]["US"], 5)
        self.assertEqual(stats["country_map"]["NL"], 2)
        self.assertNotIn("US-EAST", stats["country_map"])
        self.assertNotIn("NL-NH", stats["country_map"])

    def test_world_map_country_code(self):
        self.assertEqual(world_map_country_code("US-EAST"), "US")
        self.assertEqual(world_map_country_code("NL-NH"), "NL")
        self.assertEqual(world_map_country_code("DE"), "DE")
        self.assertIsNone(world_map_country_code("US-CA"))
