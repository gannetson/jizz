from django.test import TestCase

from jizz.models import Country, CountrySpecies, CountrySpeciesFrequency, Species
from jizz.services.ebird_frequency.classify import classify_frequency, detect_vagrant_like
from jizz.services.ebird_frequency.persist import upsert_country_species_frequency
from jizz.services.ebird_frequency.types import MonthlyFrequencyRow


class ClassifyFrequencyTests(TestCase):
    def test_no_frequency_pct_returns_none(self):
        tier, conf = classify_frequency(None, checklist_count=1000)
        self.assertIsNone(tier)
        self.assertEqual(conf, 'low')

    def test_normal_tier_high_confidence_with_checklists(self):
        tier, conf = classify_frequency(45.0, checklist_count=100)
        self.assertEqual(tier, 'very_common')
        self.assertEqual(conf, 'high')

    def test_vagrant_like_caps_tier(self):
        tier, conf = classify_frequency(50.0, checklist_count=100, is_vagrant_like=True)
        self.assertEqual(tier, 'rare')
        self.assertEqual(conf, 'low')

    def test_detect_vagrant_high_obs_low_freq(self):
        self.assertTrue(
            detect_vagrant_like(
                frequency_pct=2.0,
                checklist_count=50,
                observation_count=500,
                occupied_subregions=None,
            )
        )

    def test_detect_vagrant_tiny_spread_high_freq(self):
        self.assertTrue(
            detect_vagrant_like(
                frequency_pct=30.0,
                checklist_count=200,
                observation_count=None,
                occupied_subregions=1,
            )
        )


class PersistFrequencyTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code='EF', name='Ebird Freq Land')
        self.sp = Species.objects.create(name='Test Warbler', name_latin='Test t', code='teswar')
        self.cs = CountrySpecies.objects.create(
            country=self.country,
            species=self.sp,
            status='native',
        )

    def test_upsert_creates_row(self):
        row = MonthlyFrequencyRow(
            country_species_id=self.cs.id,
            month=6,
            reference_year=2024,
            frequency_pct=15.0,
            checklist_count=200,
            source='test',
        )
        n_ok, n_skip = upsert_country_species_frequency([row], dry_run=False, force=True)
        self.assertEqual(n_ok, 1)
        self.assertEqual(n_skip, 0)
        fr = CountrySpeciesFrequency.objects.get(
            country_species=self.cs, month=6, reference_year=2024
        )
        self.assertEqual(fr.frequency_pct, 15.0)
        self.assertEqual(fr.checklist_count, 200)
        self.assertIsNotNone(fr.frequency)
        self.assertEqual(fr.source, 'test')

    def test_skip_without_force_when_exists(self):
        CountrySpeciesFrequency.objects.create(
            country_species=self.cs,
            month=3,
            reference_year=2024,
            frequency_pct=1.0,
            frequency='rare',
        )
        row = MonthlyFrequencyRow(
            country_species_id=self.cs.id,
            month=3,
            reference_year=2024,
            frequency_pct=50.0,
            checklist_count=500,
            source='test',
        )
        n_ok, n_skip = upsert_country_species_frequency([row], force=False)
        self.assertEqual(n_ok, 0)
        self.assertEqual(n_skip, 1)
        fr = CountrySpeciesFrequency.objects.get(
            country_species=self.cs, month=3, reference_year=2024
        )
        self.assertEqual(fr.frequency_pct, 1.0)
