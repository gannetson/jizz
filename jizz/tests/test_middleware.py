"""
Tests for jizz middleware (e.g. SocialAuthRedirectUriMiddleware).
"""
from django.test import TestCase, RequestFactory
from django.http import HttpResponse

from jizz.middleware import SocialAuthRedirectUriMiddleware


class SocialAuthRedirectUriMiddlewareTestCase(TestCase):
    """SocialAuthRedirectUriMiddleware stores redirect_uri in session when present."""

    def setUp(self):
        self.factory = RequestFactory()
        self.get_response = lambda req: HttpResponse(status=200)

    def test_login_path_with_redirect_uri_stores_in_session(self):
        middleware = SocialAuthRedirectUriMiddleware(self.get_response)
        request = self.factory.get('/auth/login/apple/', {'redirect_uri': 'https://app.example/callback'})
        request.session = {}

        middleware(request)

        self.assertEqual(request.session.get('social_auth_redirect_uri'), 'https://app.example/callback')

    def test_login_path_without_redirect_uri_does_not_set_session(self):
        middleware = SocialAuthRedirectUriMiddleware(self.get_response)
        request = self.factory.get('/auth/login/apple/')
        request.session = {}

        middleware(request)

        self.assertNotIn('social_auth_redirect_uri', request.session)

    def test_other_path_ignored(self):
        middleware = SocialAuthRedirectUriMiddleware(self.get_response)
        request = self.factory.get('/api/species/', {'redirect_uri': 'https://evil.com'})
        request.session = {}

        middleware(request)

        self.assertNotIn('social_auth_redirect_uri', request.session)
