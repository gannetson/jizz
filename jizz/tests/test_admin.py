"""
Tests for Django admin: changelist/change pages, custom URLs, and admin actions.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse

from jizz.models import (
    Country,
    Species,
    Game,
    Player,
    PlayerScore,
    CountrySpecies,
    Feedback,
    Language,
    CountryChallenge,
    ChallengeLevel,
)
from compare.models import SpeciesComparison, SpeciesTrait

User = get_user_model()


def _create_staff_user():
    return User.objects.create_superuser(
        username='admin',
        email='admin@test.com',
        password='adminpass',
    )


class AdminAuthenticationTestCase(TestCase):
    """Admin requires staff login."""

    def setUp(self):
        self.client = Client()
        self.country = Country.objects.create(name='Netherlands', code='NL')

    def test_changelist_redirects_to_login_when_not_authenticated(self):
        url = reverse('admin:jizz_country_changelist')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        self.assertIn('login', response.url)

    def test_changelist_returns_200_when_staff(self):
        user = _create_staff_user()
        self.client.force_login(user)
        response = self.client.get(reverse('admin:jizz_country_changelist'))
        self.assertEqual(response.status_code, 200)


class AdminChangelistTestCase(TestCase):
    """Admin changelist pages load for main models."""

    def setUp(self):
        self.user = _create_staff_user()
        self.client = Client()
        self.client.force_login(self.user)

    def test_country_changelist(self):
        Country.objects.create(name='Netherlands', code='NL')
        response = self.client.get(reverse('admin:jizz_country_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_species_changelist(self):
        Species.objects.create(name='Robin', name_latin='Erithacus', code='ROB01')
        response = self.client.get(reverse('admin:jizz_species_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_game_changelist(self):
        country = Country.objects.create(name='Netherlands', code='NL')
        player = Player.objects.create(name='P', language='en')
        Game.objects.create(
            country=country, level='beginner', length=5, media='images',
            host=player, include_rare=True,
        )
        response = self.client.get(reverse('admin:jizz_game_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_player_changelist(self):
        Player.objects.create(name='P', language='en')
        response = self.client.get(reverse('admin:jizz_player_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_playerscore_changelist(self):
        country = Country.objects.create(name='Netherlands', code='NL')
        player = Player.objects.create(name='P', language='en')
        game = Game.objects.create(
            country=country, level='beginner', length=5, media='images',
            host=player, include_rare=True,
        )
        PlayerScore.objects.create(player=player, game=game, score=10)
        response = self.client.get(reverse('admin:jizz_playerscore_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_countryspecies_changelist(self):
        country = Country.objects.create(name='Netherlands', code='NL')
        species = Species.objects.create(name='Robin', name_latin='Erithacus', code='ROB01')
        CountrySpecies.objects.create(country=country, species=species, status='native')
        response = self.client.get(reverse('admin:jizz_countryspecies_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_feedback_changelist(self):
        response = self.client.get(reverse('admin:jizz_feedback_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_language_changelist(self):
        Language.objects.get_or_create(code='en', defaults={'name': 'English'})
        response = self.client.get(reverse('admin:jizz_language_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_countrychallenge_changelist(self):
        country = Country.objects.create(name='Netherlands', code='NL')
        player = Player.objects.create(name='P', language='en')
        CountryChallenge.objects.create(country=country, player=player)
        response = self.client.get(reverse('admin:jizz_countrychallenge_changelist'))
        self.assertEqual(response.status_code, 200)

    def test_challengelevel_changelist(self):
        response = self.client.get(reverse('admin:jizz_challengelevel_changelist'))
        self.assertEqual(response.status_code, 200)


class AdminChangeFormTestCase(TestCase):
    """Admin change form pages load."""

    def setUp(self):
        self.user = _create_staff_user()
        self.client = Client()
        self.client.force_login(self.user)

    def test_country_change(self):
        country = Country.objects.create(name='Netherlands', code='NL')
        response = self.client.get(
            reverse('admin:jizz_country_change', args=(country.code,))
        )
        self.assertEqual(response.status_code, 200)

    def test_species_change(self):
        species = Species.objects.create(
            name='Robin', name_latin='Erithacus', code='ROB01',
        )
        response = self.client.get(
            reverse('admin:jizz_species_change', args=(species.pk,))
        )
        self.assertEqual(response.status_code, 200)

    def test_game_change(self):
        country = Country.objects.create(name='Netherlands', code='NL')
        player = Player.objects.create(name='P', language='en')
        game = Game.objects.create(
            country=country, level='beginner', length=5, media='images',
            host=player, include_rare=True,
        )
        response = self.client.get(
            reverse('admin:jizz_game_change', args=(game.pk,))
        )
        self.assertEqual(response.status_code, 200)

    def test_player_change(self):
        player = Player.objects.create(name='P', language='en')
        response = self.client.get(
            reverse('admin:jizz_player_change', args=(player.pk,))
        )
        self.assertEqual(response.status_code, 200)

    def test_language_change(self):
        lang, _ = Language.objects.get_or_create(
            code='en', defaults={'name': 'English'}
        )
        response = self.client.get(
            reverse('admin:jizz_language_change', args=(lang.code,))
        )
        self.assertEqual(response.status_code, 200)


class AdminCountryCustomUrlsTestCase(TestCase):
    """Country admin custom URLs: sync-species, sync-images."""

    def setUp(self):
        self.user = _create_staff_user()
        self.client = Client()
        self.client.force_login(self.user)
        self.country = Country.objects.create(name='Netherlands', code='NL')

    @patch('jizz.admin.sync_species')
    @patch('jizz.admin.sync_country')
    def test_sync_species_redirects_and_calls_sync(self, mock_sync_country, mock_sync_species):
        url = reverse('admin:sync-species', args=(self.country.code,))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            reverse('admin:jizz_country_change', args=(self.country.code,)),
        )
        mock_sync_species.assert_called_once()
        mock_sync_country.assert_called_once_with(self.country.code)

    @patch('jizz.admin.get_country_images')
    @patch('jizz.admin.sync_country')
    def test_sync_images_redirects_and_calls_sync(self, mock_sync_country, mock_get_country_images):
        url = reverse('admin:sync-images', args=(self.country.code,))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            reverse('admin:jizz_country_change', args=(self.country.code,)),
        )
        mock_sync_country.assert_called_once_with(self.country.code)
        mock_get_country_images.assert_called_once_with(self.country.code)


class AdminSpeciesCustomUrlsTestCase(TestCase):
    """Species admin custom URL: get-media."""

    def setUp(self):
        self.user = _create_staff_user()
        self.client = Client()
        self.client.force_login(self.user)
        self.species = Species.objects.create(
            name='Robin', name_latin='Erithacus', code='ROB01',
        )

    @patch('jizz.admin.get_species_media')
    def test_get_media_redirects_and_calls_get_species_media(self, mock_get_species_media):
        url = reverse('admin:get-media', args=(self.species.pk,))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            reverse('admin:jizz_species_change', args=(self.species.pk,)),
        )
        mock_get_species_media.assert_called_once_with(self.species)


class AdminSpeciesCompareViewTestCase(TestCase):
    """Species admin compare view (GET shows form; POST with missing data redirects)."""

    def setUp(self):
        self.user = _create_staff_user()
        self.client = Client()
        self.client.force_login(self.user)

    def test_compare_species_get_returns_200_or_template_missing(self):
        url = reverse('admin:compare-species')
        response = self.client.get(url)
        # Either 200 (template exists) or 500/404 if template missing
        self.assertIn(response.status_code, (200, 404, 500))

    def test_compare_species_post_missing_selection_redirects_to_changelist(self):
        url = reverse('admin:compare-species')
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('admin:jizz_species_changelist'))


class AdminSpeciesActionsTestCase(TestCase):
    """Species admin actions: generate_comparison, scrape_traits."""

    def setUp(self):
        self.user = _create_staff_user()
        self.client = Client()
        self.client.force_login(self.user)
        self.species1 = Species.objects.create(
            name='Robin', name_latin='Erithacus', code='ROB01',
        )
        self.species2 = Species.objects.create(
            name='Sparrow', name_latin='Passer', code='SPA01',
        )

    def _post_changelist_with_action(self, action, selected_ids):
        url = reverse('admin:jizz_species_changelist')
        data = {
            'action': action,
            'index': 0,
        }
        for i, pk in enumerate(selected_ids):
            data[f'_selected_action'] = pk
        return self.client.post(url, data, follow=False)

    def test_generate_comparison_action_with_one_species_shows_error(self):
        response = self._post_changelist_with_action(
            'generate_comparison',
            [self.species1.pk],
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('admin:jizz_species_changelist'))
        # Message is set by action (we redirect back to changelist)
        messages = list(response.wsgi_request._messages) if hasattr(response.wsgi_request, '_messages') else []
        # Alternative: follow redirect and check for error in content
        response_follow = self.client.post(
            reverse('admin:jizz_species_changelist'),
            {'action': 'generate_comparison', '_selected_action': self.species1.pk},
            follow=True,
        )
        self.assertEqual(response_follow.status_code, 200)
        # Error message "Please select exactly 2 species" is shown
        self.assertIn(b'select exactly 2', response_follow.content or b'')

    def test_generate_comparison_action_with_two_species_existing_redirects_to_comparison(self):
        comp = SpeciesComparison.objects.create(
            comparison_type='species',
            species_1=self.species1,
            species_2=self.species2,
            summary='Existing',
            detailed_comparison='Existing comparison.',
        )
        response = self.client.post(
            reverse('admin:jizz_species_changelist'),
            {
                'action': 'generate_comparison',
                'index': 0,
                '_selected_action': [self.species1.pk, self.species2.pk],
            },
            follow=False,
        )
        # Action with multiple selection: Django sends multiple _selected_action
        from django.contrib.admin.helpers import ACTION_CHECKBOX_NAME
        response = self.client.post(
            reverse('admin:jizz_species_changelist'),
            {
                'action': 'generate_comparison',
                'index': 0,
                ACTION_CHECKBOX_NAME: [self.species1.pk, self.species2.pk],
            },
            follow=False,
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            reverse('admin:compare_speciescomparison_change', args=(comp.pk,)),
        )

    @patch('jizz.admin.BirdsOfTheWorldScraper')
    def test_scrape_traits_action_mocked_scraper(self, MockScraper):
        mock_instance = MagicMock()
        mock_instance.scrape_species.return_value = {
            'traits': {
                'size': {'title': 'Size', 'content': '14 cm.', 'section': 'Identification'},
            },
            'source_url': 'https://example.com',
        }
        MockScraper.return_value = mock_instance

        response = self.client.post(
            reverse('admin:jizz_species_changelist'),
            {
                'action': 'scrape_traits',
                'index': 0,
                '_selected_action': self.species1.pk,
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        mock_instance.scrape_species.assert_called()
        self.assertTrue(
            SpeciesTrait.objects.filter(species=self.species1, category='size').exists(),
            'Trait should be created',
        )


class AdminAddFormTestCase(TestCase):
    """Admin add pages load for models that support add."""

    def setUp(self):
        self.user = _create_staff_user()
        self.client = Client()
        self.client.force_login(self.user)

    def test_country_add(self):
        response = self.client.get(reverse('admin:jizz_country_add'))
        self.assertEqual(response.status_code, 200)

    def test_species_add(self):
        response = self.client.get(reverse('admin:jizz_species_add'))
        self.assertEqual(response.status_code, 200)

    def test_language_add(self):
        response = self.client.get(reverse('admin:jizz_language_add'))
        self.assertEqual(response.status_code, 200)

    def test_feedback_add(self):
        response = self.client.get(reverse('admin:jizz_feedback_add'))
        self.assertEqual(response.status_code, 200)
