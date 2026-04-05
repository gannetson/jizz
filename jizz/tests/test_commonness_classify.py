"""Unit tests for GBIF commonness scoring (pure classify module)."""

from django.test import SimpleTestCase

from jizz.services.commonness.classify import (
    ClassificationConfig,
    SpeciesStatRow,
    apply_guard_rules,
    classify_rows,
    cumulative_fractions_from_percent_bands,
    min_max_scale,
)


class CommonnessClassifyTests(SimpleTestCase):
    def test_min_max_scale_constant(self):
        self.assertEqual(min_max_scale([1.0, 1.0, 1.0]), [0.5, 0.5, 0.5])

    def test_cumulative_fractions(self):
        c = cumulative_fractions_from_percent_bands([2, 5, 13, 30, 25, 15, 10])
        self.assertEqual(len(c), 7)
        self.assertAlmostEqual(c[-1], 1.0)

    def test_insufficient_when_coverage_gate_false(self):
        cfg = ClassificationConfig(
            weight_occupied_cells=0.45,
            weight_occupied_cells_recent=0.25,
            weight_years_recent=0.2,
            weight_dedup_events=0.1,
            percentile_thresholds=[2, 5, 13, 30, 25, 15, 10],
            min_species_cells_medium=2,
            min_species_events_high=5,
        )
        rows = [
            SpeciesStatRow(
                country_pk='NL',
                gbif_species_key=1,
                scientific_name='A a',
                raw_record_count=100,
                dedup_event_count=10,
                occupied_cell_count=50,
                occupied_cell_count_recent=10,
                years_present_count=5,
                years_present_recent=3,
                first_year=2010,
                last_year=2024,
            ),
        ]
        out = classify_rows(
            rows,
            passes_coverage_gate=False,
            country_cells_all=0,
            country_events_all=0,
            config=cfg,
        )
        self.assertEqual(out[0].classification, 'insufficient_data')
        self.assertEqual(out[0].confidence, 'low')

    def test_guard_single_cell_single_year(self):
        row = SpeciesStatRow(
            country_pk='NL',
            gbif_species_key=99,
            scientific_name='Rare twitch',
            raw_record_count=500,
            dedup_event_count=1,
            occupied_cell_count=1,
            occupied_cell_count_recent=1,
            years_present_count=1,
            years_present_recent=1,
            first_year=2024,
            last_year=2024,
        )
        self.assertEqual(apply_guard_rules('abundant', row), 'extremely_rare')

    def test_many_raw_same_event_does_not_boost_label_via_guard(self):
        """High raw count but one cell — guard caps rarity."""
        row = SpeciesStatRow(
            country_pk='NL',
            gbif_species_key=100,
            scientific_name='X x',
            raw_record_count=9000,
            dedup_event_count=2,
            occupied_cell_count=2,
            occupied_cell_count_recent=2,
            years_present_count=2,
            years_present_recent=2,
            first_year=2023,
            last_year=2024,
        )
        guarded = apply_guard_rules('abundant', row)
        self.assertIn(guarded, ('rare', 'extremely_rare'))
