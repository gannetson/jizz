from django.test import Client, TestCase
from django.urls import reverse

from jizz.models import Country, CountrySpecies
from jizz.tests.taxonomy_helpers import make_species_with_taxonomy


class DataViewsTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code="NL", name="Netherlands")

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
        res = Client().get(
            reverse("data-taxon-orders"),
            {"sort": "species_count", "dir": "desc"},
        )
        self.assertEqual(res.status_code, 200)
        content = res.content.decode()
        passer_pos = content.index("Passeriformes")
        anser_pos = content.index("Anseriformes")
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
        self.assertNotContains(res, "challenge-leaderboard")

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
