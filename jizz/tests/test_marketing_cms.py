"""Marketing CMS API and HTML sanitizer."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from jizz.marketing.html import sanitize_html
from jizz.models import MarketingPage

User = get_user_model()


def _jwt(client, user):
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')


class SanitizeHtmlTests(TestCase):
    def test_strips_script_and_javascript_urls(self):
        html = sanitize_html(
            '<p>Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>'
            '<a href="/play">quiz</a>'
        )
        self.assertIn('<p>Hi</p>', html)
        self.assertNotIn('script', html)
        self.assertNotIn('javascript:', html)
        self.assertIn('href="/play"', html)


class MarketingPageApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user('editor', password='x', is_staff=True)
        self.user = User.objects.create_user('member', password='x', is_staff=False)

    def test_public_list_hides_drafts(self):
        MarketingPage.objects.create(title='Draft', slug='draft', published=False)
        response = self.client.get('/api/marketing-pages/')
        self.assertEqual(response.status_code, 200)
        slugs = {row['slug'] for row in response.data}
        self.assertIn('about', slugs)
        self.assertNotIn('draft', slugs)

    def test_anonymous_cannot_write(self):
        response = self.client.post('/api/marketing-pages/', {'title': 'Nope'}, format='json')
        self.assertIn(response.status_code, (401, 403))

    def test_non_staff_cannot_write(self):
        _jwt(self.client, self.user)
        response = self.client.post('/api/marketing-pages/', {'title': 'Nope'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_staff_can_create_and_update(self):
        _jwt(self.client, self.staff)
        created = self.client.post(
            '/api/marketing-pages/',
            {'title': 'How we score', 'body': '<p>Fairly</p><script>x</script>'},
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['slug'], 'how-we-score')
        self.assertIn('<p>Fairly</p>', created.data['body'])
        self.assertNotIn('script', created.data['body'])
        patched = self.client.patch(
            '/api/marketing-pages/how-we-score/',
            {'title': 'Scoring'},
            format='json',
        )
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data['title'], 'Scoring')
        html = self.client.get('/site/page/how-we-score/').content.decode()
        self.assertIn('Scoring', html)
