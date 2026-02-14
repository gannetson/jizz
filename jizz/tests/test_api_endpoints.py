"""
Tests for all API endpoints (jizz and compare).
Auth/profile/my-games/scores are covered in test_auth_and_profile and test_player_score_list.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from jizz.models import (
    Country,
    Game,
    Player,
    PlayerScore,
    Question,
    Answer,
    Species,
    CountrySpecies,
    Language,
    Feedback,
    Update,
    Reaction,
    FlagQuestion,
    CountryChallenge,
    CountryGame,
    ChallengeLevel,
)
from media.models import Media, MediaReview, FlagMedia

User = get_user_model()


def _player_auth(client, player):
    """Set client to use player token in Authorization (Bearer <player.token>)."""
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {player.token}')


class ApiCountriesTestCase(TestCase):
    """GET /api/countries/ (list), GET /api/countries/<code>/ (retrieve)."""

    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        species, _ = Species.objects.get_or_create(
            code='T001', defaults={'name': 'Test', 'name_latin': 'Test'}
        )
        CountrySpecies.objects.get_or_create(
            country=self.country, species=species, defaults={'status': 'native'}
        )

    def test_countries_list_returns_200(self):
        response = self.client.get('/api/countries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_countries_retrieve_returns_200(self):
        response = self.client.get(f'/api/countries/{self.country.code}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], self.country.code)


class ApiLanguagesTestCase(TestCase):
    """GET /api/languages/."""

    def setUp(self):
        self.client = APIClient()
        Language.objects.get_or_create(code='en', defaults={'name': 'English'})
        Language.objects.get_or_create(code='nl', defaults={'name': 'Dutch'})

    def test_languages_list_returns_200(self):
        response = self.client.get('/api/languages/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)


class ApiPlayerTestCase(TestCase):
    """POST /api/player/, GET/PUT /api/player/<token>/, GET /api/player/<token>/stats/."""

    def setUp(self):
        self.client = APIClient()

    def test_player_create_returns_201(self):
        response = self.client.post(
            '/api/player/',
            {'name': 'TestPlayer', 'language': 'en'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['name'], 'TestPlayer')
        self.assertTrue(Player.objects.filter(token=response.data['token']).exists())

    def test_player_retrieve_returns_200(self):
        player = Player.objects.create(name='P', language='en')
        response = self.client.get(f'/api/player/{player.token}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'P')

    def test_player_update_returns_200(self):
        player = Player.objects.create(name='P', language='en')
        response = self.client.put(
            f'/api/player/{player.token}/',
            {'name': 'Updated', 'language': 'nl'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        player.refresh_from_db()
        self.assertEqual(player.name, 'Updated')

    def test_player_stats_returns_200(self):
        player = Player.objects.create(name='P', language='en')
        response = self.client.get(f'/api/player/{player.token}/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ApiSpeciesTestCase(TestCase):
    """GET /api/species/, GET /api/species/<pk>/."""

    def setUp(self):
        self.client = APIClient()
        self.species = Species.objects.create(
            name='Test Bird', name_latin='Testus', code='TB01',
        )

    def test_species_list_returns_200(self):
        response = self.client.get('/api/species/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_species_detail_returns_200(self):
        response = self.client.get(f'/api/species/{self.species.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Bird')


class ApiFamiliesOrdersTestCase(TestCase):
    """GET /api/families/, GET /api/orders/."""

    def setUp(self):
        self.client = APIClient()
        Species.objects.create(
            name='S', name_latin='S', code='S01',
            tax_family='Family1', tax_family_en='Family1', tax_order='Order1',
        )

    def test_families_list_returns_200(self):
        response = self.client.get('/api/families/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_orders_list_returns_200(self):
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)


class ApiGamesTestCase(TestCase):
    """GET /api/games/, POST /api/games/, GET /api/games/<token>/."""

    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.player = Player.objects.create(name='Host', language='en')
        self.game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player,
            include_rare=True,
        )

    def test_games_list_returns_200(self):
        response = self.client.get('/api/games/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)

    def test_games_create_returns_201_with_player_token(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/games/',
            {'country': 'NL', 'level': 'beginner', 'length': 5, 'media': 'images', 'include_rare': True},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['level'], 'beginner')

    def test_games_create_requires_auth(self):
        response = self.client.post(
            '/api/games/',
            {'country': 'NL', 'level': 'beginner', 'length': 5, 'media': 'images'},
            format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_game_detail_returns_200(self):
        response = self.client.get(f'/api/games/{self.game.token}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['token'], self.game.token)


class ApiQuestionAnswerTestCase(TestCase):
    """GET /api/games/<token>/question, POST /api/answer/, GET /api/answer/<question>/<token>/."""

    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        for i in range(5):
            s = Species.objects.create(name=f'S{i}', name_latin=f'S{i}', code=f'S{i:03d}')
            CountrySpecies.objects.create(country=self.country, species=s, status='native')
            Media.objects.create(species=s, type='image', url=f'https://x.com/{i}.jpg', source='test')
        self.player = Player.objects.create(name='P', language='en')
        self.game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player,
            include_rare=True,
        )
        self.question = self.game.add_question()
        self.player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=self.game)
        self.answer = Answer.objects.create(
            player_score=self.player_score,
            question=self.question,
            answer=self.question.species,
            correct=True,
        )

    def test_game_question_returns_200(self):
        response = self.client.get(f'/api/games/{self.game.token}/question')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)

    def test_answer_create_returns_201(self):
        q2 = self.game.add_question()
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/answer/',
            {
                'player_token': self.player.token,
                'question_id': q2.id,
                'answer_id': q2.species_id,
            },
            format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_201_CREATED, status.HTTP_200_OK))

    def test_answer_detail_returns_200(self):
        # URL has no trailing slash per urlpattern
        response = self.client.get(
            f'/api/answer/{self.question.id}/{self.player.token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['id'], self.answer.id)


class ApiQuestionDetailTestCase(TestCase):
    """GET/PUT /api/questions/<pk>/."""

    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        CountrySpecies.objects.create(country=self.country, species=self.species, status='native')
        Media.objects.create(species=self.species, type='image', url='https://x.com/1.jpg', source='test')
        self.player = Player.objects.create(name='P', language='en')
        self.game = Game.objects.create(
            country=self.country, level='beginner', length=5, media='images',
            host=self.player, include_rare=True,
        )
        self.question = self.game.add_question()

    def test_question_detail_get_returns_200(self):
        response = self.client.get(f'/api/questions/{self.question.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.question.id)

    def test_question_detail_put_returns_200(self):
        response = self.client.patch(
            f'/api/questions/{self.question.id}/',
            {'done': True},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ApiFlagTestCase(TestCase):
    """GET/POST /api/flag/."""

    def setUp(self):
        self.client = APIClient()
        self.player = Player.objects.create(name='P', language='en')

    def test_flag_list_returns_200(self):
        response = self.client.get('/api/flag/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertIsInstance(results, list)

    def test_flag_create_returns_201(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/flag/',
            {'player_token': self.player.token, 'description': 'Test flag', 'media_url': 'https://example.com/x.jpg'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ApiMediaTestCase(TestCase):
    """GET /api/media/, GET/POST /api/review-media/, GET/POST /api/flag-media/."""

    def setUp(self):
        self.client = APIClient()
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.media = Media.objects.create(species=self.species, type='image', url='https://x.com/1.jpg', source='test')
        self.player = Player.objects.create(name='P', language='en')

    def test_media_list_returns_200(self):
        response = self.client.get('/api/media/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_review_media_list_returns_200(self):
        response = self.client.get('/api/review-media/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertIsInstance(results, list)

    def test_review_media_create_returns_201(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/review-media/',
            {
                'player_token': self.player.token,
                'media_id': self.media.id,
                'review_type': 'approved',
                'description': 'Good',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_flag_media_list_returns_200(self):
        response = self.client.get('/api/flag-media/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_flag_media_create_returns_201(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/flag-media/',
            {
                'player_token': self.player.token,
                'media_id': self.media.id,
                'description': 'Inappropriate',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ApiFeedbackTestCase(TestCase):
    """GET/POST /api/feedback/."""

    def setUp(self):
        self.client = APIClient()
        self.player = Player.objects.create(name='P', language='en')

    def test_feedback_list_returns_200(self):
        response = self.client.get('/api/feedback/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertIsInstance(results, list)

    def test_feedback_create_returns_201(self):
        response = self.client.post(
            '/api/feedback/',
            {'comment': 'Great app', 'player_token': self.player.token, 'rating': 5},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ApiUpdatesReactionsTestCase(TestCase):
    """GET /api/updates/, POST /api/updates/reactions/."""

    def setUp(self):
        self.client = APIClient()
        self.player = Player.objects.create(name='P', language='en')
        self.update_user = User.objects.create_user(username='admin', email='a@b.com', password='x')
        self.update = Update.objects.create(title='News', message='Hello', user=self.update_user)

    def test_updates_list_returns_200(self):
        response = self.client.get('/api/updates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_reactions_create_returns_201(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/updates/reactions/',
            {'player_token': self.player.token, 'message': 'Nice', 'update_id': self.update.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ApiCountryChallengesTestCase(TestCase):
    """GET/POST /api/country-challenges/ (viewset list/create, retrieve uses get_object which returns last)."""

    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.player = Player.objects.create(name='P', language='en')
        # Signal create_initial_country_game requires ChallengeLevel(sequence=0)
        ChallengeLevel.objects.get_or_create(
            sequence=0,
            defaults={
                'level': 'beginner', 'length': 5, 'media': 'images',
                'jokers': 2, 'include_rare': True, 'title': 'Level 0', 'description': 'First',
            },
        )

    def test_country_challenges_list_requires_auth(self):
        response = self.client.get('/api/country-challenges/')
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_country_challenges_create_returns_201(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/country-challenges/',
            {'country_code': self.country.code},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)


class ApiChallengeNextLevelTestCase(TestCase):
    """POST /api/challenge/<id>/next-level/."""

    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.player = Player.objects.create(name='P', language='en')
        # Signal create_initial_country_game requires ChallengeLevel(sequence=0)
        self.level0 = ChallengeLevel.objects.get_or_create(
            sequence=0,
            defaults={
                'level': 'beginner', 'length': 5, 'media': 'images',
                'jokers': 2, 'include_rare': True, 'title': 'Level 0', 'description': 'First',
            },
        )[0]
        self.challenge = CountryChallenge.objects.create(country=self.country, player=self.player)
        self.level = self.level0
        self.game = Game.objects.create(
            country=self.country, level='beginner', length=5, media='images',
            host=self.player, include_rare=True,
        )
        CountryGame.objects.create(
            country_challenge=self.challenge,
            game=self.game,
            challenge_level=self.level,
        )

    def test_add_challenge_level_requires_auth(self):
        response = self.client.post(
            f'/api/challenge/{self.challenge.id}/next-level',
            {},
            format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_add_challenge_level_returns_201(self):
        level1 = ChallengeLevel.objects.create(
            sequence=1, level='advanced', length=10, media='images',
            jokers=2, include_rare=True, title='Level 1', description='Second',
        )
        _player_auth(self.client, self.player)
        response = self.client.post(
            f'/api/challenge/{self.challenge.id}/next-level',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('game', response.data)


class ApiJwtTestCase(TestCase):
    """POST /token/, POST /token/refresh/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='u', email='u@example.com', password='pass12345')

    def test_token_obtain_returns_200(self):
        response = self.client.post(
            '/token/',
            {'username': 'u', 'password': 'pass12345'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_obtain_401_bad_password(self):
        response = self.client.post(
            '/token/',
            {'username': 'u', 'password': 'wrong'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_returns_200(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        response = self.client.post(
            '/token/refresh/',
            {'refresh': str(refresh)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class ApiPasswordResetTestCase(TestCase):
    """POST /api/password-reset/, POST /api/password-reset/confirm/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='u', email='u@example.com', password='pass12345')

    def test_password_reset_request_returns_200(self):
        response = self.client.post(
            '/api/password-reset/',
            {'email': 'u@example.com'},
            format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT))

    def test_password_reset_confirm_returns_400_without_valid_token(self):
        response = self.client.post(
            '/api/password-reset/confirm/',
            {'uid': 'invalid', 'token': 'invalid', 'new_password': 'newpass12345'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ApiCompareTestCase(TestCase):
    """GET /api/compare/traits/, GET /api/compare/comparisons/, POST /api/compare/request/."""

    def setUp(self):
        self.client = APIClient()

    def test_compare_traits_list_returns_200(self):
        response = self.client.get('/api/compare/traits/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertIsInstance(results, list)

    def test_compare_comparisons_list_returns_200(self):
        response = self.client.get('/api/compare/comparisons/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertIsInstance(results, list)
