"""
Tests for compare app views: traits, comparisons, comparison request, scrape.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from jizz.models import Species
from compare.models import SpeciesTrait, SpeciesComparison, ComparisonRequest


class CompareTraitsViewSetTestCase(TestCase):
    """GET /api/compare/traits/ (list, retrieve, filter by species_id, category)."""

    def setUp(self):
        self.client = APIClient()
        self.species1 = Species.objects.create(
            name='Robin', name_latin='Erithacus', code='ROB01'
        )
        self.species2 = Species.objects.create(
            name='Sparrow', name_latin='Passer', code='SPA01'
        )
        self.trait1 = SpeciesTrait.objects.create(
            species=self.species1,
            category='size',
            title='Length',
            content='About 14 cm.',
        )
        self.trait2 = SpeciesTrait.objects.create(
            species=self.species1,
            category='plumage',
            title='Colour',
            content='Brown and red.',
        )
        self.trait3 = SpeciesTrait.objects.create(
            species=self.species2,
            category='size',
            title='Length',
            content='About 16 cm.',
        )

    def test_traits_list_returns_200(self):
        response = self.client.get('/api/compare/traits/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 3)

    def test_traits_retrieve_returns_200(self):
        response = self.client.get(f'/api/compare/traits/{self.trait1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.trait1.id)
        self.assertEqual(response.data['category'], 'size')
        self.assertEqual(response.data['species_name'], 'Robin')

    def test_traits_filter_by_species_id(self):
        response = self.client.get(
            '/api/compare/traits/',
            {'species_id': self.species1.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
        self.assertTrue(all(r['species'] == self.species1.id for r in results))

    def test_traits_filter_by_category(self):
        response = self.client.get(
            '/api/compare/traits/',
            {'category': 'size'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
        self.assertTrue(all(r['category'] == 'size' for r in results))


class CompareComparisonsViewSetTestCase(TestCase):
    """GET /api/compare/comparisons/ (list, retrieve, filter by species_1_id, species_2_id, comparison_type)."""

    def setUp(self):
        self.client = APIClient()
        self.species1 = Species.objects.create(
            name='Robin', name_latin='Erithacus', code='ROB01'
        )
        self.species2 = Species.objects.create(
            name='Sparrow', name_latin='Passer', code='SPA01'
        )
        self.comparison = SpeciesComparison.objects.create(
            comparison_type='species',
            species_1=self.species1,
            species_2=self.species2,
            summary='Different birds.',
            detailed_comparison='Robin is red-breasted.',
        )
        self.family_comparison = SpeciesComparison.objects.create(
            comparison_type='family',
            family_1='Turdidae',
            family_2='Passeridae',
            summary='Different families.',
            detailed_comparison='Key differences.',
        )

    def test_comparisons_list_returns_200(self):
        response = self.client.get('/api/compare/comparisons/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 2)

    def test_comparisons_retrieve_returns_200(self):
        response = self.client.get(f'/api/compare/comparisons/{self.comparison.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.comparison.id)
        self.assertEqual(response.data['comparison_type'], 'species')
        self.assertEqual(response.data['species_1_name'], 'Robin')
        self.assertEqual(response.data['species_2_name'], 'Sparrow')

    def test_comparisons_filter_by_species_1_id(self):
        response = self.client.get(
            '/api/compare/comparisons/',
            {'species_1_id': self.species1.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)
        self.assertTrue(any(r['species_1'] == self.species1.id for r in results))

    def test_comparisons_filter_by_species_2_id(self):
        response = self.client.get(
            '/api/compare/comparisons/',
            {'species_2_id': self.species2.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)

    def test_comparisons_filter_by_comparison_type(self):
        response = self.client.get(
            '/api/compare/comparisons/',
            {'comparison_type': 'family'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['comparison_type'], 'family')
        self.assertEqual(results[0]['family_1'], 'Turdidae')


class ComparisonRequestViewTestCase(TestCase):
    """POST /api/compare/request/, GET /api/compare/request/."""

    def setUp(self):
        self.client = APIClient()
        self.species1 = Species.objects.create(
            name='Robin', name_latin='Erithacus', code='ROB01'
        )
        self.species2 = Species.objects.create(
            name='Sparrow', name_latin='Passer', code='SPA01'
        )

    def test_request_post_species_validation_missing_ids(self):
        response = self.client.post(
            '/api/compare/request/',
            {'comparison_type': 'species'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_request_post_family_validation_missing_families(self):
        response = self.client.post(
            '/api/compare/request/',
            {'comparison_type': 'family'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_request_post_returns_existing_species_comparison(self):
        comp = SpeciesComparison.objects.create(
            comparison_type='species',
            species_1=self.species1,
            species_2=self.species2,
            summary='Existing.',
            detailed_comparison='Already generated.',
        )
        response = self.client.post(
            '/api/compare/request/',
            {
                'comparison_type': 'species',
                'species_1_id': self.species1.id,
                'species_2_id': self.species2.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], comp.id)
        self.assertEqual(response.data['summary'], 'Existing.')

    @patch('compare.views.ComparisonRequestView._generate_comparison')
    def test_request_post_family_creates_new_comparison(self, mock_generate):
        # Create comparison only when the view calls _generate_comparison (after existing check)
        def create_comparison(*args, **kwargs):
            return SpeciesComparison.objects.create(
                comparison_type='family',
                family_1='Turdidae',
                family_2='Passeridae',
                summary='Generated.',
                detailed_comparison='Generated comparison.',
            )
        mock_generate.side_effect = create_comparison
        response = self.client.post(
            '/api/compare/request/',
            {
                'comparison_type': 'family',
                'family_1': 'Turdidae',
                'family_2': 'Passeridae',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['comparison_type'], 'family')
        self.assertEqual(response.data['family_1'], 'Turdidae')
        mock_generate.assert_called_once()

    def test_request_get_returns_list_anonymous(self):
        response = self.client.get('/api/compare/request/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 0)


class ScrapeSpeciesViewTestCase(TestCase):
    """POST /api/compare/scrape/ - validation and 400/404 behaviour."""

    def setUp(self):
        self.client = APIClient()
        self.species = Species.objects.create(
            name='Robin', name_latin='Erithacus', code='ROB01'
        )

    def test_scrape_400_without_species_id_or_code(self):
        response = self.client.post(
            '/api/compare/scrape/',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_scrape_404_invalid_species_id(self):
        response = self.client.post(
            '/api/compare/scrape/',
            {'species_id': 999999},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scrape_404_invalid_species_code(self):
        response = self.client.post(
            '/api/compare/scrape/',
            {'species_code': 'NONEXISTENT'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
