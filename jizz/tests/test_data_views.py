from datetime import date, datetime

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from jizz.data_user_stats import games_per_user_rows, media_reviews_per_user_rows
from jizz.models import Country, CountrySpecies, Game, Player, PlayerScore, Species
from jizz.tests.taxonomy_helpers import make_species_with_taxonomy
from media.models import Media, MediaReview

User = get_user_model()


class DataViewsTests(TestCase):
    def setUp(self):
        self.country = Country.objects.get_or_create(code="NL", defaults={"name": "Netherlands"})[0]

        self.sp_passer1 = make_species_with_taxonomy(
            name="House Sparrow",
            name_latin="Passer domesticus",
            code="SP01",
            tax_order="Passeriformes",
            tax_family="Passeridae",
        )
        self.sp_passer2 = make_species_with_taxonomy(
            name="Tree Sparrow",
            name_latin="Passer montanus",
            code="SP02",
            tax_order="Passeriformes",
            tax_family="Passeridae",
        )
        self.sp_anser = make_species_with_taxonomy(
            name="Greylag Goose",
            name_latin="Anser anser",
            code="AN01",
            tax_order="Anseriformes",
            tax_family="Anatidae",
        )
        self.sp_branta = make_species_with_taxonomy(
            name="Canada Goose",
            name_latin="Branta canadensis",
            code="AN02",
            tax_order="Anseriformes",
            tax_family="Anatidae",
        )
        self.sp_endemic = make_species_with_taxonomy(
            name="Endemic duck",
            name_latin="Endemic duckus",
            code="AN03",
            tax_order="Anseriformes",
            tax_family="Anatidae",
        )
        self.sp_introduced = make_species_with_taxonomy(
            name="Introduced goose",
            name_latin="Introduced gooseus",
            code="AN04",
            tax_order="Anseriformes",
            tax_family="Anatidae",
        )

        for sp in (
            self.sp_passer1,
            self.sp_passer2,
            self.sp_anser,
            self.sp_branta,
            self.sp_endemic,
            self.sp_introduced,
        ):
            status = "endemic" if sp is self.sp_endemic else "introduced" if sp is self.sp_introduced else "native"
            CountrySpecies.objects.create(country=self.country, species=sp, status=status)

    def test_data_index_public(self):
        res = Client().get(reverse("data-index"))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Birdr data")
        self.assertContains(res, reverse("data-taxon-orders"))
        self.assertContains(res, reverse("data-most-games"))
        self.assertContains(res, reverse("data-most-reviews"))
        self.assertContains(res, "favicon-32x32.png")
        self.assertContains(res, "/images/birdr-icon.png")
        self.assertContains(res, "padding: 0.85rem 1.5rem 0")

    def test_taxon_orders_global_counts(self):
        res = Client().get(reverse("data-taxon-orders"))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Passeriformes")
        self.assertContains(res, "Anseriformes")

    def test_taxon_orders_country_filter_excludes_introduced(self):
        res = Client().get(reverse("data-taxon-orders"), {"country": "NL"})
        self.assertEqual(res.status_code, 200)
        content = res.content.decode()
        self.assertIn("Native", content)
        self.assertIn("Endemic", content)
        self.assertNotIn("Introduced goose", content)

    def test_taxon_families_country_filter(self):
        res = Client().get(reverse("data-taxon-families"), {"country": "NL"})
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Anatidae")
        self.assertContains(res, "Passeridae")

    def test_taxon_orders_sort_by_species_count_desc(self):
        for i in range(2):
            sp = make_species_with_taxonomy(
                name=f"Extra Sparrow {i}",
                name_latin=f"Passer extra{i}",
                code=f"SPX{i}",
                tax_order="Passeriformes",
                tax_family="Passeridae",
            )
            CountrySpecies.objects.create(country=self.country, species=sp, status="native")
        res = Client().get(
            reverse("data-taxon-orders"),
            {"country": "NL", "sort": "species_count", "dir": "desc"},
        )
        self.assertEqual(res.status_code, 200)
        content = res.content.decode()
        tbody = content.split("<tbody>")[1].split("</tbody>")[0]
        passer_pos = tbody.index("Passeriformes")
        anser_pos = tbody.index("Anseriformes")
        self.assertLess(passer_pos, anser_pos)

    def test_taxon_families_sort_by_order(self):
        res = Client().get(
            reverse("data-taxon-families"),
            {"sort": "order", "dir": "asc"},
        )
        self.assertEqual(res.status_code, 200)
        content = res.content.decode()
        anat_pos = content.index("Anatidae")
        passer_pos = content.index("Passeridae")
        self.assertLess(anat_pos, passer_pos)


class GamesPlayedViewsTests(TestCase):
    def test_games_played_page_public(self):
        res = Client().get(reverse("data-games-played"))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "games-played-chart")
        self.assertContains(res, "games-world-map")
        self.assertNotContains(res, 'id="challenge-leaderboard"')

    def test_games_played_api(self):
        res = Client().get(
            reverse("data-games-played-api"),
            {"start": "2026-01-01", "end": "2026-01-31", "granularity": "month"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["granularity"], "month")
        self.assertIn("series", data)
        self.assertIn("by_country", data)
        self.assertIn("country_map", data)
        self.assertNotIn("leaderboard", data)


class CountryChallengeLeaderboardViewsTests(TestCase):
    def test_leaderboard_page_public(self):
        res = Client().get(reverse("data-country-challenge-leaderboard"))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Country Challenge leaderboard")
        self.assertContains(res, "challenge-leaderboard")

    def test_leaderboard_api(self):
        res = Client().get(reverse("data-country-challenge-leaderboard-api"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("leaderboard", data)
        self.assertIsInstance(data["leaderboard"], list)

    def test_leaderboard_api_endpoint(self):
        res = Client().get(reverse("birdr-journey-leaderboard"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("leaderboard", data)
        self.assertIn("no-store", res["Cache-Control"])


class MostGamesViewsTests(TestCase):
    def setUp(self):
        self.country = Country.objects.get_or_create(code="NL", defaults={"name": "Netherlands"})[0]
        self.user = User.objects.create_user("ada", "ada@example.com", "secret123")
        self.player_a = Player.objects.create(name="Ada One", language="en", user=self.user)
        self.player_b = Player.objects.create(name="Ada Two", language="en", user=self.user)
        self.guest = Player.objects.create(name="Guest Bird", language="en")

    def _play(self, player, n, when=None):
        for _ in range(n):
            game = Game.objects.create(
                country=self.country,
                level="beginner",
                length=5,
                media="images",
                host=player,
            )
            if when is not None:
                aware = timezone.make_aware(datetime.combine(when, datetime.min.time()))
                Game.objects.filter(pk=game.pk).update(created=aware)
            PlayerScore.objects.create(player=player, game=game, score=1)

    def test_most_games_page_public(self):
        self._play(self.player_a, 2)
        self._play(self.player_b, 1)
        self._play(self.guest, 1)
        res = Client().get(reverse("data-most-games"))
        self.assertEqual(res.status_code, 200)
        content = res.content.decode()
        self.assertIn("most-games", content)
        self.assertIn("First game", content)
        self.assertIn("Ada One", content)
        self.assertIn("Guest Bird", content)
        ada_pos = content.index("Ada One")
        guest_pos = content.index("Guest Bird")
        self.assertLess(ada_pos, guest_pos)
        tbody = content.split("<tbody>")[1].split("</tbody>")[0]
        self.assertEqual(tbody.count("<tr>"), 2)

    def test_linked_players_count_as_one_user(self):
        self._play(self.player_a, 2, when=date(2024, 3, 12))
        self._play(self.player_b, 1, when=date(2026, 1, 4))
        rows = games_per_user_rows()
        ada = next(row for row in rows if row["name"] == "Ada One")
        self.assertEqual(ada["games"], 3)
        self.assertEqual(ada["first_played"], date(2024, 3, 12))

    def test_same_player_name_is_grouped(self):
        guest_two = Player.objects.create(name="guest bird", language="en")
        self._play(self.guest, 2, when=date(2025, 6, 1))
        self._play(guest_two, 3, when=date(2024, 1, 9))
        rows = games_per_user_rows()
        grouped = [row for row in rows if row["name"].casefold() == "guest bird"]
        self.assertEqual(len(grouped), 1)
        self.assertEqual(grouped[0]["games"], 5)
        self.assertEqual(grouped[0]["first_played"], date(2024, 1, 9))
        self.assertEqual(grouped[0]["name"], "guest bird")


class MostReviewsViewsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("reviewer", "rev@example.com", "secret123")
        self.player = Player.objects.create(name="Reviewer", language="en", user=self.user)
        self.guest = Player.objects.create(name="Guest Reviewer", language="en")
        self.species = Species.objects.create(name="S", name_latin="S", code="MR01")

    def _media(self, suffix):
        return Media.objects.create(
            species=self.species,
            type="image",
            url=f"https://example.com/{suffix}.jpg",
            source="test",
        )

    def test_most_reviews_page_public(self):
        MediaReview.objects.create(
            media=self._media("a"),
            user=self.user,
            review_type=MediaReview.APPROVED,
        )
        MediaReview.objects.create(
            media=self._media("b"),
            player=self.player,
            review_type=MediaReview.REJECTED,
        )
        MediaReview.objects.create(
            media=self._media("c"),
            player=self.guest,
            review_type=MediaReview.NOT_SURE,
        )
        res = Client().get(reverse("data-most-reviews"))
        self.assertEqual(res.status_code, 200)
        content = res.content.decode()
        self.assertIn("most-reviews", content)
        self.assertIn("Reviewer", content)
        self.assertIn("Guest Reviewer", content)
        self.assertIn("Approved", content)
        self.assertIn("Rejected", content)

    def test_reviews_merge_user_and_player_and_split_types(self):
        MediaReview.objects.create(
            media=self._media("a"),
            user=self.user,
            review_type=MediaReview.APPROVED,
        )
        MediaReview.objects.create(
            media=self._media("b"),
            player=self.player,
            review_type=MediaReview.REJECTED,
        )
        MediaReview.objects.create(
            media=self._media("c"),
            player=self.guest,
            review_type=MediaReview.NOT_SURE,
        )
        rows = media_reviews_per_user_rows()
        by_name = {row["name"]: row for row in rows}
        self.assertEqual(by_name["Reviewer"]["total"], 2)
        self.assertEqual(by_name["Reviewer"]["approved"], 1)
        self.assertEqual(by_name["Reviewer"]["rejected"], 1)
        self.assertEqual(by_name["Reviewer"]["not_sure"], 0)
        self.assertEqual(by_name["Guest Reviewer"]["total"], 1)
        self.assertEqual(by_name["Guest Reviewer"]["not_sure"], 1)
        self.assertLess(rows.index(by_name["Reviewer"]), rows.index(by_name["Guest Reviewer"]))

