"""
Tests for sign-up, profile (get/update), and my-games endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from jizz.models import (
    Country,
    Game,
    Player,
    PlayerScore,
    Question,
    Answer,
    Species,
    CountrySpecies,
)
from media.models import Media

User = get_user_model()


class RegisterViewTestCase(TestCase):
    """Tests for POST /api/register/ (sign up)."""

    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        response = self.client.post(
            '/api/register/',
            {
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'securepass123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(User.objects.filter(username='newuser').exists())
        self.assertTrue(User.objects.get(username='newuser').profile)

    def test_register_validation_short_password(self):
        response = self.client.post(
            '/api/register/',
            {
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'short',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertFalse(User.objects.filter(username='newuser').exists())

    def test_register_duplicate_username(self):
        User.objects.create_user(username='taken', email='taken@example.com', password='pass12345')
        response = self.client.post(
            '/api/register/',
            {
                'username': 'taken',
                'email': 'other@example.com',
                'password': 'securepass123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_register_duplicate_email(self):
        User.objects.create_user(username='first', email='same@example.com', password='pass12345')
        response = self.client.post(
            '/api/register/',
            {
                'username': 'second',
                'email': 'same@example.com',
                'password': 'securepass123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class ProfileViewTestCase(TestCase):
    """Tests for GET/PUT /api/profile/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='profileuser',
            email='profile@example.com',
            password='testpass123',
        )
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self._auth()

    def _auth(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_profile_get_success(self):
        response = self.client.get('/api/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profileuser')
        self.assertEqual(response.data['email'], 'profile@example.com')
        self.assertIn('language', response.data)
        self.assertIn('receive_updates', response.data)

    def test_profile_get_unauthorized(self):
        self.client.credentials()
        response = self.client.get('/api/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_update_username(self):
        response = self.client.put(
            '/api/profile/',
            {'username': 'newname'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'newname')
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'newname')

    def test_profile_update_language_and_country(self):
        response = self.client.put(
            '/api/profile/',
            {'language': 'nl', 'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['language'], 'nl')
        self.assertEqual(response.data['country_code'], 'NL')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.language, 'nl')
        self.assertEqual(self.user.profile.country_id, self.country.code)

    def test_profile_update_receive_updates(self):
        response = self.client.put(
            '/api/profile/',
            {'receive_updates': True},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['receive_updates'])
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.receive_updates)


class UserGamesViewTestCase(TestCase):
    """Tests for GET /api/my-games/ and GET /api/my-games/<token>/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='gamesuser',
            email='games@example.com',
            password='testpass123',
        )
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self._create_species_with_media()
        self.player = Player.objects.create(
            name='Test Player',
            language='en',
            user=self.user,
        )
        self._auth()

    def _create_species_with_media(self):
        """Create minimal species with media so Game.add_question() can run."""
        for i in range(5):
            species = Species.objects.create(
                name=f'Test Species {i}',
                name_latin=f'Test Latin {i}',
                code=f'TS{i:03d}',
            )
            CountrySpecies.objects.create(
                country=self.country,
                species=species,
                status='native',
            )
            Media.objects.create(
                species=species,
                type='image',
                url=f'https://example.com/img{i}.jpg',
                source='test',
            )

    def _auth(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_my_games_list_empty(self):
        response = self.client.get('/api/my-games/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 0)

    def test_my_games_list_returns_games_user_played(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
            include_rare=True,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)
        question = game.add_question()
        Answer.objects.create(
            player_score=player_score,
            question=question,
            answer=question.species,
            correct=True,
        )
        response = self.client.get('/api/my-games/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        tokens = [g['token'] for g in response.data['results']]
        self.assertIn(game.token, tokens)

    def test_my_games_list_unauthorized(self):
        self.client.credentials()
        response = self.client.get('/api/my-games/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_my_game_detail_success(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
            include_rare=True,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)
        question = game.add_question()
        Answer.objects.create(
            player_score=player_score,
            question=question,
            answer=question.species,
            correct=True,
        )
        response = self.client.get(f'/api/my-games/{game.token}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['token'], game.token)
        self.assertIn('questions', response.data)

    def test_my_game_detail_unauthorized(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
            include_rare=True,
        )
        self.client.credentials()
        response = self.client.get(f'/api/my-games/{game.token}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_my_game_detail_other_users_game_returns_404(self):
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass12345',
        )
        other_player = Player.objects.create(name='Other', language='en', user=other_user)
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=other_player,
            include_rare=True,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=other_player, game=game)
        question = game.add_question()
        Answer.objects.create(
            player_score=player_score,
            question=question,
            answer=question.species,
            correct=True,
        )
        response = self.client.get(f'/api/my-games/{game.token}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
