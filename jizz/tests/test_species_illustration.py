import base64
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from jizz.models import Species, SpeciesIllustration
from jizz.services.species_illustration import _images_generate_kwargs

FAKE_PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)


@override_settings(
    SPECIES_ILLUSTRATION_ENABLED=True,
    OPENAI_API_KEY='test-key',
)
class SpeciesIllustrationApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.species = Species.objects.create(
            name='Robin',
            name_latin='Erithacus rubecula',
            code='eurrob1',
        )
        self.cover_url = f'/api/species/{self.species.id}/cover/'
        self.detail_url = f'/api/species/{self.species.id}/'

    @patch('jizz.services.species_illustration._generate_image_bytes', return_value=FAKE_PNG)
    def test_first_cover_get_generates_illustration_second_skips_openai(self, mock_generate):
        response1 = self.client.get(self.cover_url)
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response1.data['illustration_status'], 'ready')
        self.assertIsNotNone(response1.data['illustration_url'])
        self.assertEqual(mock_generate.call_count, 1)

        ill = SpeciesIllustration.objects.get(species=self.species)
        self.assertEqual(ill.status, SpeciesIllustration.STATUS_READY)
        self.assertTrue(ill.image.name)

        response2 = self.client.get(self.cover_url)
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(response2.data['illustration_status'], 'ready')
        self.assertEqual(mock_generate.call_count, 1)

    @patch('jizz.services.species_illustration.ensure_species_illustration')
    def test_species_detail_does_not_generate_illustration(self, mock_ensure):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, 200)
        mock_ensure.assert_not_called()
        self.assertNotIn('illustration_url', response.data)
        self.assertNotIn('illustration_status', response.data)

    @override_settings(OPENAI_API_KEY='')
    def test_missing_api_key_returns_null_illustration(self):
        response = self.client.get(self.cover_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['illustration_url'])
        self.assertEqual(response.data['illustration_status'], 'missing')
        self.assertFalse(SpeciesIllustration.objects.filter(species=self.species).exists())

    @override_settings(SPECIES_ILLUSTRATION_ENABLED=False)
    def test_disabled_skips_generation(self):
        with patch('jizz.services.species_illustration._generate_image_bytes') as mock_generate:
            response = self.client.get(self.cover_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['illustration_url'])
        self.assertEqual(response.data['illustration_status'], 'missing')
        mock_generate.assert_not_called()


class SpeciesIllustrationGenerateKwargsTestCase(TestCase):
    @override_settings(SPECIES_ILLUSTRATION_QUALITY='')
    def test_dalle_omits_response_format(self):
        kwargs = _images_generate_kwargs('dall-e-3', 'a bird')
        self.assertNotIn('response_format', kwargs)
        self.assertEqual(kwargs['quality'], 'standard')
        self.assertNotIn('output_format', kwargs)

    @override_settings(SPECIES_ILLUSTRATION_QUALITY='high')
    def test_gpt_image_uses_gpt_params(self):
        kwargs = _images_generate_kwargs('gpt-image-1', 'a bird')
        self.assertNotIn('response_format', kwargs)
        self.assertEqual(kwargs['quality'], 'high')
        self.assertEqual(kwargs['output_format'], 'png')
