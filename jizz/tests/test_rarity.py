"""Tests for Game.rarity frequency filtering on species selection."""

from django.test import TestCase

from jizz.models import Country, CountrySpecies, Game, Species


class GameRarityFrequencyFilterTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code="NL", name="Netherlands")
        self.sp_abundant = Species.objects.create(
            name="Abundant Bird", name_latin="Abun b", code="abunbr"
        )
        self.sp_rare = Species.objects.create(
            name="Rare Bird", name_latin="Rare b", code="rarebr"
        )
        self.sp_vagrant = Species.objects.create(
            name="Vagrant Bird", name_latin="Vagr b", code="vagrbr"
        )
        self.sp_unclassified = Species.objects.create(
            name="No Freq Bird", name_latin="Nofq b", code="nofqbr"
        )
        CountrySpecies.objects.create(
            country=self.country,
            species=self.sp_abundant,
            status="native",
            frequency="abundant",
        )
        CountrySpecies.objects.create(
            country=self.country,
            species=self.sp_rare,
            status="native",
            frequency="rare",
        )
        CountrySpecies.objects.create(
            country=self.country,
            species=self.sp_vagrant,
            status="native",
            frequency="vagrant",
        )
        CountrySpecies.objects.create(
            country=self.country,
            species=self.sp_unclassified,
            status="native",
            frequency=None,
        )

    def _species_ids_for_rarity(self, rarity: str) -> set[int]:
        q = Game.frequency_filter_q(rarity)
        return set(
            Species.objects.filter(
                countryspecies__country=self.country,
            )
            .filter(q)
            .values_list("id", flat=True)
            .distinct()
        )

    def test_familiar_excludes_rare_and_vagrant(self):
        ids = self._species_ids_for_rarity(Game.RARIT_FAMILIAR)
        self.assertIn(self.sp_abundant.id, ids)
        self.assertNotIn(self.sp_rare.id, ids)
        self.assertNotIn(self.sp_vagrant.id, ids)
        self.assertNotIn(self.sp_unclassified.id, ids)

    def test_regular_includes_rare_and_unclassified(self):
        ids = self._species_ids_for_rarity(Game.RARIT_REGULAR)
        self.assertIn(self.sp_abundant.id, ids)
        self.assertIn(self.sp_rare.id, ids)
        self.assertIn(self.sp_unclassified.id, ids)
        self.assertNotIn(self.sp_vagrant.id, ids)

    def test_exceptional_includes_vagrant(self):
        ids = self._species_ids_for_rarity(Game.RARIT_EXCEPTIONAL)
        self.assertIn(self.sp_vagrant.id, ids)
        self.assertIn(self.sp_rare.id, ids)
