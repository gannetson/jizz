"""
Tests for POST /api/mobile/push/register/ and mobile_push services.
"""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from jizz.models import PushDevice, UserProfile
class MobilePushRegisterTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='pushuser', email='p@example.com', password='secret')
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        self.token = 'ExponentPushToken[test-mobile-push]'

    def test_register_requires_auth(self):
        client = APIClient()
        response = client.post(
            '/api/mobile/push/register/',
            {
                'expo_push_token': self.token,
                'timezone': 'Europe/Amsterdam',
                'platform': 'ios',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_invalid_token(self):
        response = self.client.post(
            '/api/mobile/push/register/',
            {
                'expo_push_token': 'not-a-valid-token',
                'timezone': 'UTC',
                'platform': 'android',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('jizz.mobile_push.views.send_signup_test_push_async')
    def test_register_creates_device_and_updates_timezone(self, mock_test_push):
        response = self.client.post(
            '/api/mobile/push/register/',
            {
                'expo_push_token': self.token,
                'timezone': 'America/New_York',
                'platform': 'ios',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('test_push_sent', response.data)
        self.assertTrue(
            PushDevice.objects.filter(user=self.user, expo_push_token=self.token).exists()
        )
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.timezone, 'America/New_York')
        mock_test_push.assert_called_once_with(self.token)

    @patch('jizz.mobile_push.views.send_signup_test_push_async')
    def test_register_reassigns_token_to_current_user(self, _mock_test_push):
        other = User.objects.create_user(username='other', password='x')
        PushDevice.objects.create(
            user=other,
            expo_push_token=self.token,
            platform='android',
        )
        response = self.client.post(
            '/api/mobile/push/register/',
            {
                'expo_push_token': self.token,
                'platform': 'ios',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PushDevice.objects.filter(expo_push_token=self.token).count(), 1)
        device = PushDevice.objects.get(expo_push_token=self.token)
        self.assertEqual(device.user_id, self.user.id)
