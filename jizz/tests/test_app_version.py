from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class AppVersionApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_app_version_returns_min_version_and_store_urls(self):
        response = self.client.get('/api/app-version/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['min_version'], '1.59.0')
        self.assertIn('apps.apple.com', data['app_store_url'])
        self.assertIn('play.google.com', data['play_store_url'])

    @override_settings(APP_MIN_VERSION='2.0.0')
    def test_app_version_respects_settings_override(self):
        response = self.client.get('/api/app-version/')
        self.assertEqual(response.json()['min_version'], '2.0.0')
