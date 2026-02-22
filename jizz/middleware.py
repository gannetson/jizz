"""
Store redirect_uri in session when user starts social OAuth login.
OAuthCompleteView uses this to redirect back to the frontend with tokens.
"""


class SocialAuthRedirectUriMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/auth/login/") and request.GET.get("redirect_uri"):
            request.session["social_auth_redirect_uri"] = request.GET["redirect_uri"]
        return self.get_response(request)
