"""Public marketing pages, sitemap and robots."""

from django.test import TestCase, override_settings

from compare.models import SpeciesComparison
from jizz.models import Country, CountrySpecies, Species
from media.models import Media


class MarketingPagesTests(TestCase):
    def setUp(self):
        self.nl, _ = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})
        if self.nl.name != 'Netherlands':
            self.nl.name = 'Netherlands'
            self.nl.save(update_fields=['name'])
        Country.objects.get_or_create(code='world', defaults={'name': 'World'})
        Country.objects.get_or_create(code='NL-NH', defaults={'name': 'North Holland'})
        self.sparrow = Species.objects.create(
            name='Eurasian Sparrowhawk',
            name_latin='Accipiter nisus',
            code='eurspa',
        )
        self.goshawk = Species.objects.create(
            name='Northern Goshawk',
            name_latin='Accipiter gentilis',
            code='norgos',
        )
        Media.objects.create(
            species=self.sparrow,
            type='image',
            hide=False,
            url='https://upload.wikimedia.org/wikipedia/commons/a/a8/sparrowhawk.jpg',
        )
        Media.objects.create(
            species=self.goshawk,
            type='image',
            hide=False,
            url='https://upload.wikimedia.org/wikipedia/commons/b/b1/goshawk.jpg',
        )
        CountrySpecies.objects.get_or_create(country=self.nl, species=self.sparrow)
        CountrySpecies.objects.get_or_create(country=self.nl, species=self.goshawk)
        SpeciesComparison.objects.create(
            comparison_type='species',
            species_1=self.sparrow,
            species_2=self.goshawk,
            summary='Sparrowhawks are smaller, with a squared tail; goshawks are bulkier.',
            detailed_comparison='Size, tail shape and flight style separate the two Accipiters.',
            identification_tips='Look at size against nearby birds, then tail corners.',
        )

    def test_landing_title_canonical_and_json_ld(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('Birdr – Free Bird Identification Quiz &amp; Training App', html)
        self.assertIn('Learn to identify birds yourself.', html)
        self.assertIn('rel="canonical"', html)
        self.assertIn('https://birdr.pro/', html)
        self.assertIn('WebApplication', html)
        self.assertIn('MobileApplication', html)
        self.assertIn('FAQPage', html)
        self.assertIn('Kudos to the developer!', html)
        self.assertIn('How can I help?', html)
        self.assertIn('/media-review/', html)
        self.assertIn('/media-review/NL', html)
        self.assertIn('info@birdr.pro', html)
        self.assertIn('Get it on Google Play', html)
        self.assertIn('Or play a quiz in the browser', html)
        self.assertIn('href="/play"', html)

    def test_intent_pages(self):
        paths = [
            '/how-it-works/',
            '/bird-identification-quiz/',
            '/learn-bird-identification/',
            '/bird-quiz-by-country/',
            '/birding-app/',
            '/flocks/',
            '/my-tricky-birds/',
        ]
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                html = response.content.decode()
                self.assertIn('rel="canonical"', html)
                self.assertIn(f'https://birdr.pro{path}', html)
                self.assertIn('<title>', html)

    def test_unknown_url_is_404(self):
        response = self.client.get('/definitely-not-a-marketing-page/')
        self.assertEqual(response.status_code, 404)

    def test_country_page_and_skipped_rows(self):
        response = self.client.get('/countries/netherlands/')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('Netherlands', html)
        self.assertIn('Start a quiz', html)
        self.assertIn('Country Challenge', html)
        self.assertIn('/media-review/NL', html)
        self.assertIn('Review Netherlands photos', html)
        self.assertEqual(self.client.get('/countries/world/').status_code, 404)
        self.assertEqual(self.client.get('/countries/north-holland/').status_code, 404)
        self.assertEqual(self.client.get('/countries/not-a-country/').status_code, 404)

    def test_bird_and_compare_pages(self):
        self.sparrow.refresh_from_db()
        self.goshawk.refresh_from_db()
        bird = self.client.get(f'/birds/{self.sparrow.slug}/')
        self.assertEqual(bird.status_code, 200)
        self.assertIn('Eurasian Sparrowhawk', bird.content.decode())
        self.assertIn('Accipiter nisus', bird.content.decode())

        hidden = Species.objects.create(name='Ghost Bird', name_latin='Ghostus birdus', code='ghost')
        self.assertEqual(self.client.get(f'/birds/{hidden.slug}/').status_code, 404)
        self.assertEqual(self.client.get('/birds/no-such-bird/').status_code, 404)

        low, high = (
            (self.sparrow, self.goshawk)
            if self.sparrow.id < self.goshawk.id
            else (self.goshawk, self.sparrow)
        )
        pair = f'{low.slug}-vs-{high.slug}'
        compare = self.client.get(f'/compare/{pair}/')
        self.assertEqual(compare.status_code, 200)
        html = compare.content.decode()
        self.assertIn('Practise this pair', html)
        self.assertIn('/trouble-spots', html)
        self.assertIn('Sparrowhawks are smaller', html)

        reversed_pair = f'{high.slug}-vs-{low.slug}'
        redirect = self.client.get(f'/compare/{reversed_pair}/')
        self.assertEqual(redirect.status_code, 301)

    def test_robots_and_sitemaps(self):
        robots = self.client.get('/robots.txt')
        self.assertEqual(robots.status_code, 200)
        text = robots.content.decode()
        self.assertIn('Disallow: /admin/', text)
        self.assertIn('Disallow: /api/', text)
        self.assertIn('Disallow: /token/', text)
        self.assertIn('Sitemap: https://birdr.pro/sitemap.xml', text)

        index = self.client.get('/sitemap.xml')
        self.assertEqual(index.status_code, 200)
        self.assertIn('sitemap-pages.xml', index.content.decode())

        pages = self.client.get('/sitemap-pages.xml')
        body = pages.content.decode()
        self.assertIn('https://birdr.pro/', body)
        self.assertIn('https://birdr.pro/how-it-works/', body)
        self.assertIn('https://birdr.pro/bird-identification-quiz/', body)
        self.assertIn('https://birdr.pro/flocks/', body)

        countries = self.client.get('/sitemap-countries.xml').content.decode()
        self.assertIn('/countries/netherlands/', countries)
        self.assertNotIn('/countries/world/', countries)

        birds = self.client.get('/sitemap-birds.xml').content.decode()
        self.assertIn(f'/birds/{self.sparrow.slug}/', birds)

        compare = self.client.get('/sitemap-compare.xml').content.decode()
        self.assertIn('-vs-', compare)

    @override_settings(GOOGLE_SITE_VERIFICATION='google-token', BING_SITE_VERIFICATION='bing-token')
    def test_verification_meta(self):
        html = self.client.get('/').content.decode()
        self.assertIn('google-site-verification', html)
        self.assertIn('google-token', html)
        self.assertIn('msvalidate.01', html)
        self.assertIn('bing-token', html)
