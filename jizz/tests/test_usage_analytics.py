from datetime import date, datetime

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from jizz.models import Country, UsageEvent, UserProfile
from jizz.usage_analytics import (
    parse_device_type,
    record_usage_event,
    resolve_country_code,
    usage_stats_payload,
)


class UsageAnalyticsHelpersTests(TestCase):
    def test_parse_device_type(self):
        self.assertEqual(parse_device_type('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'mobile')
        self.assertEqual(parse_device_type('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'tablet')
        self.assertEqual(parse_device_type('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'desktop')
        self.assertEqual(parse_device_type(''), 'unknown')

    def test_resolve_country_code_prefers_client_then_cf_then_profile(self):
        request = self.client.get('/', HTTP_CF_IPCOUNTRY='DE')
        self.assertEqual(resolve_country_code(request, 'nl'), 'NL')
        self.assertEqual(resolve_country_code(request, None), 'DE')

        user = User.objects.create_user('statsuser', password='x')
        Country.objects.create(code='BE', name='Belgium')
        UserProfile.objects.create(user=user, country_id='BE')
        self.client.force_login(user)
        request = self.client.get('/')
        request.user = user
        self.assertEqual(resolve_country_code(request, None), 'BE')


class UsageAnalyticsAggregationTests(TestCase):
    def setUp(self):
        self.day_one = timezone.make_aware(datetime(2026, 5, 1, 12, 0))
        self.day_two = timezone.make_aware(datetime(2026, 5, 2, 12, 0))

    def _event(self, *, path, platform='web', device_type='desktop', country_code='NL', when=None, session_key='s1'):
        event = UsageEvent.objects.create(
            path=path,
            platform=platform,
            device_type=device_type,
            country_code=country_code,
            session_key=session_key,
            ip_address='127.0.0.1',
        )
        if when:
            UsageEvent.objects.filter(pk=event.pk).update(created_at=when)
        return event

    def test_usage_stats_payload_groups_paths_platforms_and_countries(self):
        self._event(path='/start', platform='web', device_type='desktop', country_code='NL', when=self.day_one)
        self._event(path='/start', platform='web', device_type='mobile', country_code='NL', when=self.day_one, session_key='s2')
        self._event(path='/journey', platform='ios', device_type='mobile', country_code='US', when=self.day_two, session_key='s3')

        payload = usage_stats_payload(date(2026, 5, 1), date(2026, 5, 2))

        self.assertEqual(payload['total_events'], 3)
        self.assertEqual(payload['unique_sessions'], 3)
        self.assertEqual(payload['top_paths'][0]['path'], '/start')
        self.assertEqual(payload['top_paths'][0]['events'], 2)
        self.assertEqual(payload['country_map']['NL'], 2)
        self.assertEqual(payload['country_map']['US'], 1)
        self.assertEqual(len(payload['series']), 2)


class UsageAnalyticsApiTests(TestCase):
    def test_post_event_creates_row_with_ip(self):
        client = APIClient()
        response = client.post(
            reverse('analytics-event'),
            {
                'path': '/scores',
                'platform': 'web',
                'session_key': 'abc123',
                'country_code': 'NL',
            },
            format='json',
            REMOTE_ADDR='203.0.113.10',
        )
        self.assertEqual(response.status_code, 204)
        event = UsageEvent.objects.get()
        self.assertEqual(event.path, '/scores')
        self.assertEqual(event.ip_address, '203.0.113.10')
        self.assertEqual(event.country_code, 'NL')

    def test_staff_dashboard_requires_login(self):
        client = Client()
        response = client.get(reverse('staff-usage'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/admin/login/', response.url)

    def test_staff_dashboard_available_for_staff(self):
        user = User.objects.create_user('staffer', password='x', is_staff=True)
        client = Client()
        client.force_login(user)
        response = client.get(reverse('staff-usage'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Usage metrics')

    def test_record_usage_event_from_request(self):
        request = self.client.get('/', HTTP_USER_AGENT='Mozilla/5.0 (Android 14; Mobile)', REMOTE_ADDR='10.0.0.1')
        event = record_usage_event(request, path='/data/', platform='web')
        self.assertEqual(event.path, '/data/')
        self.assertEqual(event.device_type, 'mobile')
        self.assertEqual(event.ip_address, '10.0.0.1')
