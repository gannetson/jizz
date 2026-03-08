"""
Store redirect_uri in session when user starts social OAuth login.
OAuthCompleteView uses this to redirect back to the frontend with tokens.

Apple Sign In requires an HTTPS redirect_uri; custom schemes (e.g. birdr://) cause 400.
When the app sends a non-HTTPS redirect_uri for apple-id, we store it as the app
callback and use our HTTPS completion URL as the redirect_uri sent to Apple.
"""


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
