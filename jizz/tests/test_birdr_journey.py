"""
Tests for Birdr Journey API (/api/birdr-journey/).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from jizz.models import BirdrJourney, ChallengeLevel, Country, Player

User = get_user_model()


def _player_auth(client, player):
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {player.token}')


def _jwt_auth(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class BirdrJourneyApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.player = Player.objects.create(name='JourneyGuest', language='en')
        self.user = User.objects.create_user(username='journeyuser', password='testpass123')
        ChallengeLevel.objects.get_or_create(
            sequence=0,
            defaults={
                'level': 'beginner',
                'length': 10,
                'media': 'images',
                'jokers': 2,
                'rarity': 'familiar',
                'title': 'Nest',
                'description': 'Hatch your skills',
            },
        )
        ChallengeLevel.objects.get_or_create(
            sequence=1,
            defaults={
                'level': 'beginner',
                'length': 10,
                'media': 'video',
                'jokers': 2,
                'rarity': 'familiar',
                'title': 'Fledgling',
                'description': 'First flight',
            },
        )

    def test_get_requires_auth(self):
        response = self.client.get('/api/birdr-journey/', {'country_code': 'NL'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_creates_journey_for_player(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['current_sequence'], 0)
        self.assertFalse(response.data['can_play_today'])
        self.assertEqual(len(response.data['roadmap']), 8)
        self.assertEqual(response.data['roadmap'][0]['status'], 'current')
        self.assertEqual(response.data['roadmap'][1]['status'], 'locked')
        self.assertTrue(
            BirdrJourney.objects.filter(player=self.player, country=self.country).exists()
        )

    def test_post_idempotent_for_same_player_country(self):
        _player_auth(self.client, self.player)
        self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            BirdrJourney.objects.filter(player=self.player, country=self.country).count(),
            1,
        )

    def test_get_returns_journey(self):
        _player_auth(self.client, self.player)
        BirdrJourney.objects.create(
            player=self.player,
            country=self.country,
            current_sequence=0,
            user=None,
        )
        response = self.client.get('/api/birdr-journey/', {'country_code': 'NL'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_level']['sequence'], 0)
        self.assertEqual(response.data['next_level']['sequence'], 1)

    def test_jwt_user_can_create_journey(self):
        _jwt_auth(self.client, self.user)
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            BirdrJourney.objects.filter(user=self.user, country=self.country).exists()
        )

    def test_unique_user_country(self):
        _jwt_auth(self.client, self.user)
        BirdrJourney.objects.create(user=self.user, country=self.country, player=None)
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(BirdrJourney.objects.filter(user=self.user).count(), 1)
