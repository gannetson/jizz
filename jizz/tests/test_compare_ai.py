"""Species comparison AI prompt/parse and generate-on-demand."""
from unittest.mock import patch

from django.test import TestCase

from compare.ai_service import AIComparisonService, name_search_terms
from compare.generation import get_or_create_species_comparison
from compare.models import SpeciesComparison, SpeciesTrait
from jizz.models import Species
from jizz.marketing.html import markdown_to_safe_html


class NameSearchTermsTests(TestCase):
    def test_skips_generic_first_word(self):
        terms = name_search_terms('Marsh Warbler', 'Acrocephalus palustris')
        self.assertIn('Marsh Warbler', terms)
        self.assertIn('Acrocephalus palustris', terms)
        self.assertIn('A. palustris', terms)
        self.assertNotIn('Marsh', terms)

    def test_keeps_distinctive_first_word(self):
        terms = name_search_terms("Blyth's Reed Warbler", 'Acrocephalus dumetorum')
        self.assertIn("Blyth's Reed Warbler", terms)
        self.assertTrue(any(term.lower().startswith("blyth") for term in terms))


class ComparisonPromptTests(TestCase):
    def setUp(self):
        self.service = AIComparisonService(api_key='test-key', model='gpt-4o')

    def test_prompt_is_field_guide_json(self):
        prompt = self.service._build_comparison_prompt(
            {'identification': {'content': 'Primary projection long.'}},
            {'identification': {'content': 'Primary projection short.'}},
            'Marsh Warbler',
            "Blyth's Reed Warbler",
            None,
            'Acrocephalus palustris',
            'Acrocephalus dumetorum',
        )
        self.assertIn('Acrocephalus palustris', prompt)
        self.assertIn('Acrocephalus dumetorum', prompt)
        self.assertIn('JSON object', prompt)
        self.assertIn('field mark', prompt)

    def test_generic_marsh_does_not_match_habitat(self):
        mentions = self.service._extract_similar_species_mentions(
            {'habitat': {'content': 'Breeds in marsh vegetation and damp thickets.'}},
            {},
            'Marsh Warbler',
            "Blyth's Reed Warbler",
            'Acrocephalus palustris',
            'Acrocephalus dumetorum',
        )
        self.assertEqual(mentions['species_1_mentions_species_2'], [])

    def test_latin_abbreviation_matches_similar_species(self):
        mentions = self.service._extract_similar_species_mentions(
            {'similar_species': {'content': 'Easily confused with A. dumetorum in worn plumage.'}},
            {},
            'Marsh Warbler',
            "Blyth's Reed Warbler",
            'Acrocephalus palustris',
            'Acrocephalus dumetorum',
        )
        self.assertTrue(mentions['species_1_mentions_species_2'])

    def test_parse_json_and_assemble_detailed(self):
        raw = """
        {
          "summary": "Wing formula is the safest split.",
          "size_comparison": "Nearly identical.",
          "plumage_comparison": "Marsh is warmer.",
          "behavior_comparison": "",
          "habitat_comparison": "Both like damp scrub.",
          "vocalization_comparison": "Marsh mimics.",
          "identification_tips": "1. Check primary projection."
        }
        """
        parsed = self.service._parse_json_response(raw)
        self.assertEqual(parsed['summary'], 'Wing formula is the safest split.')
        self.assertEqual(parsed['behavior_comparison'], '')
        detailed = self.service._assemble_detailed(parsed)
        self.assertIn('## SUMMARY', detailed)
        self.assertIn('### Identification Tips', detailed)
        self.assertNotIn('### Behavior', detailed)


class ComparisonGenerationTests(TestCase):
    def setUp(self):
        self.sp_a = Species.objects.create(name='Alpha', name_latin='Alpha a', code='AA01')
        self.sp_b = Species.objects.create(name='Beta', name_latin='Beta b', code='BB02')
        SpeciesTrait.objects.create(
            species=self.sp_a, category='plumage', title='Colour', content='Warm brown.',
        )
        SpeciesTrait.objects.create(
            species=self.sp_b, category='plumage', title='Colour', content='Grey-brown.',
        )

    def test_returns_existing_without_calling_ai(self):
        existing = SpeciesComparison.objects.create(
            comparison_type='species',
            species_1=self.sp_a,
            species_2=self.sp_b,
            summary='Already done.',
            detailed_comparison='Cached.',
        )
        with patch('compare.generation.AIComparisonService.generate_species_comparison') as mock_gen:
            result = get_or_create_species_comparison(self.sp_b, self.sp_a)
        self.assertEqual(result.id, existing.id)
        mock_gen.assert_not_called()

    @patch('compare.generation.AIComparisonService.generate_species_comparison')
    def test_creates_canonical_pair(self, mock_gen):
        mock_gen.return_value = {
            'summary': 'Alpha is warmer.',
            'detailed_comparison': '## SUMMARY\nAlpha is warmer.',
            'size_comparison': 'Same size.',
            'plumage_comparison': 'Alpha warmer.',
            'behavior_comparison': '',
            'habitat_comparison': '',
            'vocalization_comparison': '',
            'identification_tips': 'Look at tone.',
        }
        low, high = (self.sp_a, self.sp_b) if self.sp_a.id < self.sp_b.id else (self.sp_b, self.sp_a)
        result = get_or_create_species_comparison(high, low, scrape=False)
        self.assertIsNotNone(result)
        self.assertEqual(result.species_1_id, low.id)
        self.assertEqual(result.species_2_id, high.id)
        self.assertEqual(result.summary, 'Alpha is warmer.')
        self.assertEqual(result.ai_prompt_version, 'v2')
        mock_gen.assert_called_once()


class ComparisonMarkdownTests(TestCase):
    def test_markdown_to_safe_html_allows_lists(self):
        html = markdown_to_safe_html('Look at **primary projection**.\n\n- Short\n- Long')
        self.assertIn('<strong>primary projection</strong>', html)
        self.assertIn('<li>', html)
        self.assertNotIn('<script>', html)
