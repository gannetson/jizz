"""Public marketing pages, sitemap and robots."""

from unittest.mock import patch

from django.test import TestCase, override_settings

from compare.models import SpeciesComparison
from jizz.models import (
    Answer,
    BirdrJourney,
    Country,
    CountrySpecies,
    Game,
    Player,
    PlayerScore,
    Question,
    Species,
)
from media.models import Media, MediaReview


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

    def test_legacy_home_redirects_to_site(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response['Location'], '/site/')

    def test_landing_title_canonical_and_json_ld(self):
        response = self.client.get('/site/')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('Birdr – Free Bird Identification Quiz &amp; Training App', html)
        self.assertIn('Learn to identify birds yourself.', html)
        self.assertIn('rel="canonical"', html)
        self.assertIn('https://birdr.pro/site/', html)
        self.assertIn('WebApplication', html)
        self.assertIn('MobileApplication', html)
        self.assertIn('FAQPage', html)
        self.assertIn('Kudos to the developer!', html)
        self.assertIn('How can I help?', html)
        self.assertIn('Flag', html)
        self.assertIn('#review-photos', html)
        self.assertIn('/media-review/', html)
        self.assertIn('/media-review/NL', html)
        self.assertIn('info@birdr.pro', html)
        self.assertIn('Get it on Google Play', html)
        self.assertIn('Or play a quiz in the browser', html)
        self.assertIn('href="/play"', html)

    def test_intent_pages(self):
        paths = [
            '/site/how-it-works/',
            '/site/bird-identification-quiz/',
            '/site/learn-bird-identification/',
            '/site/bird-quiz-by-country/',
            '/site/birding-app/',
            '/site/flocks/',
            '/site/my-tricky-birds/',
        ]
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                html = response.content.decode()
                self.assertIn('rel="canonical"', html)
                self.assertIn(f'https://birdr.pro{path}', html)
                self.assertIn('<title>', html)

        quiz = self.client.get('/site/bird-identification-quiz/').content.decode()
        self.assertIn('compete in real time', quiz)
        self.assertIn('more points when you answer fast', quiz)

    def test_legacy_marketing_paths_redirect(self):
        pairs = [
            ('/how-it-works/', '/site/how-it-works/'),
            ('/bird-identification-quiz/', '/site/bird-identification-quiz/'),
            ('/flocks/', '/site/flocks/'),
            ('/countries/netherlands/', '/site/countries/netherlands/'),
        ]
        for old, new in pairs:
            with self.subTest(old=old):
                response = self.client.get(old)
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response['Location'], new)

    def test_unknown_url_is_404(self):
        response = self.client.get('/definitely-not-a-marketing-page/')
        self.assertEqual(response.status_code, 404)

    def test_country_page_and_skipped_rows(self):
        response = self.client.get('/site/countries/netherlands/')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('Netherlands', html)
        self.assertIn('Start a quiz', html)
        self.assertIn('Country Challenge', html)
        self.assertIn('/media-review/NL', html)
        self.assertIn('Review Netherlands photos', html)
        self.assertNotIn('How people play', html)
        self.assertNotIn('High scores', html)
        self.assertEqual(self.client.get('/site/countries/world/').status_code, 404)
        self.assertEqual(self.client.get('/site/countries/north-holland/').status_code, 404)
        self.assertEqual(self.client.get('/site/countries/not-a-country/').status_code, 404)

    def test_species_index_search_and_sections(self):
        from jizz.models import TaxonomicFamily

        family = TaxonomicFamily.objects.create(
            name_latin='Accipitridae',
            name_en='Hawks, eagles and kites',
            name_nl='Haviken',
        )
        self.sparrow.taxonomic_family = family
        self.sparrow.save(update_fields=['taxonomic_family'])
        self.goshawk.taxonomic_family = family
        self.goshawk.save(update_fields=['taxonomic_family'])

        landing = self.client.get('/site/').content.decode()
        self.assertIn('href="/site/birds/"', landing)

        redirect = self.client.get('/birds/')
        self.assertEqual(redirect.status_code, 301)
        self.assertEqual(redirect['Location'], '/site/birds/')

        page = self.client.get('/site/birds/')
        self.assertEqual(page.status_code, 200)
        html = page.content.decode()
        self.assertIn('Find a bird', html)
        self.assertIn('name="q"', html)
        self.assertIn('How to tell them apart', html)
        self.assertIn('Eurasian Sparrowhawk', html)
        self.assertIn('Northern Goshawk', html)
        self.assertIn('Browse by country', html)
        self.assertIn('Hawks, eagles and kites', html)

        search = self.client.get('/site/birds/', {'q': 'sparrow'}).content.decode()
        self.assertIn('Results for', search)
        self.assertIn(f'/site/birds/{self.sparrow.slug}/', search)

        short = self.client.get('/site/birds/', {'q': 's'}).content.decode()
        self.assertIn('at least two letters', short)
        self.assertNotIn('Results for', short)

        family_html = self.client.get('/site/birds/', {'family': 'Accipitridae'}).content.decode()
        self.assertIn('Hawks, eagles and kites', family_html)
        self.assertIn('Eurasian Sparrowhawk', family_html)
        self.assertIn('Northern Goshawk', family_html)

        game = Game.objects.create(
            country=self.nl,
            level='beginner',
            length=10,
            media='images',
            multiplayer=False,
        )
        question = Question.objects.create(
            game=game, species=self.goshawk, number=1, sequence=1,
        )
        for i in range(10):
            player = Player.objects.create(name=f'Index-miss-{i}', language='en')
            score = PlayerScore.objects.create(player=player, game=game, score=10)
            Answer.objects.create(
                player_score=score,
                question=question,
                answer=self.sparrow,
                correct=False,
            )
        missed = self.client.get('/site/birds/').content.decode()
        self.assertIn('Most missed species', missed)
        self.assertIn('Confusing pairs', missed)
        self.assertIn('/data/quiz-mistakes/species/', missed)

    def test_country_page_stats_from_data_section(self):
        CountrySpecies.objects.filter(country=self.nl).update(status='native')
        game = Game.objects.create(
            country=self.nl,
            level='beginner',
            length=10,
            media='images',
            multiplayer=False,
        )
        player = Player.objects.create(name='Ada', language='en')
        PlayerScore.objects.create(player=player, game=game, score=4200)
        BirdrJourney.objects.create(player=player, country=self.nl, current_sequence=0)
        question = Question.objects.create(
            game=game,
            species=self.goshawk,
            number=1,
            sequence=1,
        )
        for i in range(3):
            p = Player.objects.create(name=f'Miss-{i}', language='en')
            score = PlayerScore.objects.create(player=p, game=game, score=10)
            Answer.objects.create(
                player_score=score,
                question=question,
                answer=self.sparrow,
                correct=False,
            )

        html = self.client.get('/site/countries/netherlands/').content.decode()
        self.assertIn('How people play in Netherlands', html)
        self.assertIn('Quizzes played', html)
        self.assertIn('High scores', html)
        self.assertIn('Ada', html)
        self.assertIn('4200', html)
        self.assertIn('/scores/?country=NL', html)
        self.assertIn('Country Challenge', html)
        self.assertIn('/data/country-challenge-leaderboard/?country=NL', html)
        self.assertIn('Most missed birds', html)
        self.assertIn('Eurasian Sparrowhawk', html)
        self.assertIn('Confusing pairs', html)
        self.assertIn('vs', html)
        self.assertIn('/data/quiz-mistakes/species/?country=NL', html)
        self.assertIn('/data/quiz-mistakes/pairs/?country=NL', html)

    def test_bird_and_compare_pages(self):
        self.sparrow.refresh_from_db()
        self.goshawk.refresh_from_db()
        bird = self.client.get(f'/site/birds/{self.sparrow.slug}/')
        self.assertEqual(bird.status_code, 200)
        html = bird.content.decode()
        self.assertIn('Eurasian Sparrowhawk', html)
        self.assertIn('Accipiter nisus', html)
        self.assertIn('species-hero', html)
        self.assertIn('species-thumb', html)
        self.assertIn('View all photos, video and sound', html)
        self.assertIn('https://ebird.org/species/eurspa', html)
        self.assertIn('https://birdsoftheworld.org/bow/species/eurspa/cur/introduction', html)
        self.assertIn('eBird', html)
        self.assertIn('Birds of the World', html)
        self.assertIn(f'data-species-id="{self.sparrow.id}"', html)
        self.assertIn(f'/api/species/{self.sparrow.id}/', html)
        self.assertIn('Review needed', html)
        self.assertIn('community-driven', html)
        self.assertIn('Review photos', html)
        self.assertIn(f'/media-review/?species={self.sparrow.id}', html)
        self.assertNotIn('review-status is-ok', html)
        self.assertNotIn('Often mixed up with', html)

        game = Game.objects.create(
            country=self.nl,
            level='beginner',
            length=10,
            media='images',
            multiplayer=False,
        )
        q_sparrow = Question.objects.create(
            game=game, species=self.sparrow, number=1, sequence=1,
        )
        q_goshawk = Question.objects.create(
            game=game, species=self.goshawk, number=2, sequence=2,
        )
        for i, question, pick in (
            (0, q_sparrow, self.goshawk),
            (1, q_goshawk, self.sparrow),
        ):
            player = Player.objects.create(name=f'Mix-{i}', language='en')
            score = PlayerScore.objects.create(player=player, game=game, score=10)
            Answer.objects.create(
                player_score=score,
                question=question,
                answer=pick,
                correct=False,
            )

        html = self.client.get(f'/site/birds/{self.sparrow.slug}/').content.decode()
        self.assertIn('Often mixed up with', html)
        self.assertIn('Northern Goshawk', html)
        self.assertIn('Accipiter gentilis', html)
        low, high = (
            (self.sparrow, self.goshawk)
            if self.sparrow.id < self.goshawk.id
            else (self.goshawk, self.sparrow)
        )
        self.assertIn(f'/site/compare/{low.slug}-vs-{high.slug}/', html)
        self.assertIn(f'/site/birds/{self.goshawk.slug}/', html)

        hidden = Species.objects.create(name='Ghost Bird', name_latin='Ghostus birdus', code='ghost')
        self.assertEqual(self.client.get(f'/site/birds/{hidden.slug}/').status_code, 404)
        self.assertEqual(self.client.get('/site/birds/no-such-bird/').status_code, 404)

        low, high = (
            (self.sparrow, self.goshawk)
            if self.sparrow.id < self.goshawk.id
            else (self.goshawk, self.sparrow)
        )
        pair = f'{low.slug}-vs-{high.slug}'
        compare = self.client.get(f'/site/compare/{pair}/')
        self.assertEqual(compare.status_code, 200)
        html = compare.content.decode()
        self.assertIn('Practise this pair', html)
        self.assertIn('/trouble-spots', html)
        self.assertIn('Sparrowhawks are smaller', html)
        self.assertIn('data-open-species-media', html)
        self.assertIn(f'/api/species/{low.id}/', html)
        self.assertIn(f'/api/species/{high.id}/', html)
        self.assertIn('species-media-dialog', html)
        self.assertIn('height="210"', html)
        self.assertNotIn('width="280"', html)

        reversed_pair = f'{high.slug}-vs-{low.slug}'
        redirect = self.client.get(f'/site/compare/{reversed_pair}/')
        self.assertEqual(redirect.status_code, 301)

    def test_bird_page_shows_reviewed_when_ten_images_accepted(self):
        self.sparrow.refresh_from_db()
        player = Player.objects.create(name='Reviewer', language='en')
        for i in range(10):
            media = Media.objects.create(
                species=self.sparrow,
                type='image',
                hide=False,
                url=f'https://example.com/sparrow-{i}.jpg',
            )
            MediaReview.objects.create(
                media=media,
                player=player,
                review_type=MediaReview.APPROVED,
            )
        html = self.client.get(f'/site/birds/{self.sparrow.slug}/').content.decode()
        self.assertIn('review-status is-ok', html)
        self.assertIn('Reviewed', html)
        self.assertNotIn('Review needed', html)
        self.assertNotIn('Review photos', html)
        self.assertNotIn(f'/media-review/?species={self.sparrow.id}', html)

    def test_compare_page_without_written_comparison(self):
        extra = Species.objects.create(name='Little Gull', name_latin='Hydrocoloeus minutus', code='litgul')
        extra.refresh_from_db()
        low, high = (
            (self.sparrow, extra)
            if self.sparrow.id < extra.id
            else (extra, self.sparrow)
        )
        pair = f'{low.slug}-vs-{high.slug}'
        with patch('jizz.marketing.views.get_or_create_species_comparison', return_value=None):
            response = self.client.get(f'/site/compare/{pair}/')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn(low.name, html)
        self.assertIn(high.name, html)
        self.assertIn('often mixed up', html)

    @patch('jizz.marketing.views.get_or_create_species_comparison')
    def test_compare_page_renders_generated_markdown(self, mock_generate):
        extra = Species.objects.create(name='Little Gull', name_latin='Hydrocoloeus minutus', code='litgul')
        extra.refresh_from_db()
        low, high = (
            (self.sparrow, extra)
            if self.sparrow.id < extra.id
            else (extra, self.sparrow)
        )
        mock_generate.return_value = SpeciesComparison(
            comparison_type='species',
            species_1=low,
            species_2=high,
            summary='**Wing formula** is the key.',
            size_comparison='Almost the same size.',
            identification_tips='- Check primary projection\n- Listen in spring',
            detailed_comparison='',
        )
        pair = f'{low.slug}-vs-{high.slug}'
        response = self.client.get(f'/site/compare/{pair}/')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('<strong>Wing formula</strong>', html)
        self.assertIn('Identification tips', html)
        self.assertLess(html.find('In short'), html.find('Identification tips'))
        self.assertLess(html.find('Identification tips'), html.find('>Size<'))
        self.assertIn('<li>', html)
        self.assertNotIn('often mixed up', html)
        mock_generate.assert_called_once()

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
        self.assertIn('https://birdr.pro/site/', body)
        self.assertIn('https://birdr.pro/site/birds/', body)
        self.assertIn('https://birdr.pro/site/how-it-works/', body)
        self.assertIn('https://birdr.pro/site/bird-identification-quiz/', body)
        self.assertIn('https://birdr.pro/site/flocks/', body)

        countries = self.client.get('/sitemap-countries.xml').content.decode()
        self.assertIn('/site/countries/netherlands/', countries)
        self.assertNotIn('/site/countries/world/', countries)

        birds = self.client.get('/sitemap-birds.xml').content.decode()
        self.assertIn(f'/site/birds/{self.sparrow.slug}/', birds)

        compare = self.client.get('/sitemap-compare.xml').content.decode()
        self.assertIn('-vs-', compare)

    @override_settings(GOOGLE_SITE_VERIFICATION='google-token', BING_SITE_VERIFICATION='bing-token')
    def test_verification_meta(self):
        html = self.client.get('/site/').content.decode()
        self.assertIn('google-site-verification', html)
        self.assertIn('google-token', html)
        self.assertIn('msvalidate.01', html)
        self.assertIn('bing-token', html)


class MarketingCmsTests(TestCase):
    def test_seeded_about_page(self):
        response = self.client.get('/site/page/about/')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('About Birdr', html)
        self.assertIn('rel="canonical"', html)
        self.assertIn('https://birdr.pro/site/page/about/', html)
        self.assertIn('/site/page/about/', self.client.get('/site/').content.decode())

    def test_unpublished_is_404(self):
        from jizz.models import MarketingPage
        MarketingPage.objects.create(
            title='Draft',
            slug='draft',
            body='<p>Secret</p>',
            published=False,
        )
        self.assertEqual(self.client.get('/site/page/draft/').status_code, 404)

    def test_staff_can_see_unpublished(self):
        from django.contrib.auth import get_user_model
        from jizz.models import MarketingPage
        MarketingPage.objects.create(
            title='Draft',
            slug='draft',
            body='<p>Secret</p>',
            published=False,
        )
        user = get_user_model().objects.create_user('cms-staff', password='x', is_staff=True)
        self.client.force_login(user)
        response = self.client.get('/site/page/draft/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Secret', response.content.decode())
        self.assertIn('canEditServer = true', response.content.decode())

    def test_staff_sees_editor_flag_on_landing(self):
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.create_user('cms-home', password='x', is_staff=True)
        self.client.force_login(user)
        html = self.client.get('/site/').content.decode()
        self.assertIn('canEditServer = true', html)
        self.assertIn('id="cms-bar"', html)

    def test_page_index_and_sitemap(self):
        html = self.client.get('/site/page/').content.decode()
        self.assertIn('/site/page/about/', html)
        sitemap = self.client.get('/sitemap-pages.xml').content.decode()
        self.assertIn('https://birdr.pro/site/page/about/', sitemap)
        self.assertIn('https://birdr.pro/site/page/privacy/', sitemap)
        self.assertEqual(self.client.get('/page/about/').status_code, 301)
        self.assertEqual(self.client.get('/page/about/')['Location'], '/site/page/about/')
        self.assertEqual(self.client.get('/site/about/').status_code, 301)
        self.assertEqual(self.client.get('/site/about/')['Location'], '/site/page/about/')


def _started_token(seconds_ago=3):
    import time
    from django.core.signing import Signer

    return Signer(salt='marketing-feedback').sign(str(int(time.time()) - seconds_ago))


class MarketingFeedbackFormTests(TestCase):
    def test_landing_shows_form(self):
        html = self.client.get('/site/').content.decode()
        self.assertIn('name="comment"', html)
        self.assertIn('name="website"', html)
        self.assertIn('action="/site/feedback/"', html)

    def test_valid_submit_saves_and_emails(self):
        from django.core import mail
        from jizz.models import Feedback

        with self.settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
            response = self.client.post(
                '/site/feedback/',
                {
                    'comment': 'Love the quizzes',
                    'name': 'Ada',
                    'email': 'ada@example.com',
                    'started': _started_token(),
                    'next': '/site/',
                    'website': '',
                },
            )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], '/site/?sent=1#help')
        feedback = Feedback.objects.get()
        self.assertEqual(feedback.comment, 'Love the quizzes')
        self.assertEqual(feedback.contact_name, 'Ada')
        self.assertEqual(feedback.contact_email, 'ada@example.com')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].reply_to, ['Ada <ada@example.com>'])

    def test_honeypot_is_dropped(self):
        from jizz.models import Feedback

        response = self.client.post(
            '/site/feedback/',
            {
                'comment': 'spam',
                'started': _started_token(),
                'website': 'http://bots.example',
                'next': '/site/',
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], '/site/?sent=1#help')
        self.assertEqual(Feedback.objects.count(), 0)

    def test_instant_submit_is_dropped(self):
        from jizz.models import Feedback

        response = self.client.post(
            '/site/feedback/',
            {
                'comment': 'too fast',
                'started': _started_token(seconds_ago=0),
                'next': '/site/',
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_missing_comment(self):
        from jizz.models import Feedback

        response = self.client.post(
            '/site/feedback/',
            {'comment': '  ', 'started': _started_token(), 'next': '/site/'},
        )
        self.assertEqual(response['Location'], '/site/?sent=missing#help')
        self.assertEqual(Feedback.objects.count(), 0)

    def test_invalid_email(self):
        from jizz.models import Feedback

        response = self.client.post(
            '/site/feedback/',
            {
                'comment': 'Hi',
                'email': 'not-an-email',
                'started': _started_token(),
                'next': '/site/',
            },
        )
        self.assertEqual(response['Location'], '/site/?sent=email#help')
        self.assertEqual(Feedback.objects.count(), 0)

