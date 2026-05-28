from django.test import TestCase, RequestFactory

from jizz.models import Country, CountrySpecies, Species, SpeciesIllustration
from jizz.services.species_cover import species_cover_url
from media.models import Media


class SpeciesCoverTestCase(TestCase):
    def setUp(self):
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.species = Species.objects.create(
            name='Test', name_latin='Testus', code='tst001',
        )
        CountrySpecies.objects.create(country=self.country, species=self.species, status='native')
        self.media = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/photo.jpg',
            source='test',
        )

    def test_returns_illustration_when_ready(self):
        ill = SpeciesIllustration.objects.create(
            species=self.species,
            status=SpeciesIllustration.STATUS_READY,
        )
        ill.image.save('x.png', __import__('django.core.files.base', fromlist=['ContentFile']).ContentFile(b'x'))
        url = species_cover_url(self.species)
        self.assertTrue(url)
        self.assertNotEqual(url, self.media.url)

    def test_falls_back_to_first_image(self):
        url = species_cover_url(self.species)
        self.assertEqual(url, 'https://example.com/photo.jpg')
