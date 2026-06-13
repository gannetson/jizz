"""
Store redirect_uri in session when user starts social OAuth login.
OAuthCompleteView uses this to redirect back to the frontend with tokens.

Apple Sign In requires an HTTPS redirect_uri; custom schemes (e.g. birdr://) cause 400.
When the app sends a non-HTTPS redirect_uri for apple-id, we store it as the app
callback and use our HTTPS completion URL as the redirect_uri sent to Apple.
"""

from django.utils.deprecation import MiddlewareMixin

from jizz.usage_analytics import record_usage_event

_SERVER_RENDERED_PREFIXES = ('/data/', '/country/', '/staff/')


class SocialAuthRedirectUriMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/auth/login/") and request.GET.get("redirect_uri"):
            redirect_uri = request.GET["redirect_uri"]
            request.session["social_auth_redirect_uri"] = redirect_uri
            # Apple only accepts HTTPS redirect URIs; use our HTTPS callback and send user to app after
            if "/apple" in request.path and redirect_uri and not redirect_uri.lower().startswith("https://"):
                request.session["social_auth_app_callback"] = redirect_uri
                # Apple rejects redirect_uri with trailing slash; use path without trailing slash
                request.session["social_auth_redirect_uri"] = request.build_absolute_uri("/auth/complete/apple-id")
        return self.get_response(request)


class AppVersionNoCacheMiddleware:
    """Force fresh responses for /api/app-version/ (nginx was caching 12h on production)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.rstrip('/') == '/api/app-version':
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            if 'Expires' in response:
                del response['Expires']
        return response


class UsageAnalyticsMiddleware(MiddlewareMixin):
    """Log server-rendered Django page views (SPA routes are tracked client-side)."""

    SKIP_PREFIXES = (
        '/static/',
        '/admin/',
        '/api/',
        '/token/',
        '/media/',
        '/.well-known/',
    )

    def process_response(self, request, response):
        if request.method != 'GET' or response.status_code != 200:
            return response

        path = request.path
        if any(path.startswith(prefix) for prefix in self.SKIP_PREFIXES):
            return response
        if not any(path.startswith(prefix) for prefix in _SERVER_RENDERED_PREFIXES):
            return response

        try:
            record_usage_event(
                request,
                path=path,
                event_type='page_view',
                platform='web',
            )
        except Exception:
            pass

        return response
