"""
Tests for jizz.authentication (PlayerTokenAuthentication).
"""
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from jizz.models import Player
from jizz.authentication import PlayerTokenAuthentication


class PlayerTokenAuthenticationTestCase(TestCase):
    """PlayerTokenAuthentication accepts Bearer token that matches a Player."""

    def setUp(self):
        self.auth = PlayerTokenAuthentication()
        self.factory = APIRequestFactory()
        self.player = Player.objects.create(name='P', language='en')

    def test_no_authorization_header_returns_none(self):
        request = self.factory.get('/api/answer/')
        self.assertIsNone(self.auth.authenticate(request))

    def test_bearer_with_invalid_token_returns_none(self):
        request = self.factory.get('/api/answer/', HTTP_AUTHORIZATION='Bearer invalid-token')
        self.assertIsNone(self.auth.authenticate(request))

    def test_bearer_with_valid_player_token_returns_anonymous_user_and_token(self):
        request = self.factory.get('/api/answer/', HTTP_AUTHORIZATION=f'Bearer {self.player.token}')
        result = self.auth.authenticate(request)
        self.assertIsNotNone(result)
        user, token = result
        from django.contrib.auth.models import AnonymousUser
        self.assertIsInstance(user, AnonymousUser)
        self.assertEqual(token, self.player.token)

    def test_malformed_header_returns_none(self):
        request = self.factory.get('/api/answer/', HTTP_AUTHORIZATION='Basic abc')
        self.assertIsNone(self.auth.authenticate(request))
        request = self.factory.get('/api/answer/', HTTP_AUTHORIZATION='Bearer')
        self.assertIsNone(self.auth.authenticate(request))
