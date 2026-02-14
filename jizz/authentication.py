"""
Authentication that accepts Bearer token as a Player token (for game/answer/challenge endpoints).
Runs before JWT so that requests with player token in Authorization are not rejected as invalid JWT.
"""
from rest_framework import authentication

from jizz.models import Player


class PlayerTokenAuthentication(authentication.BaseAuthentication):
    """
    If Authorization: Bearer <token> matches a Player.token, accept as authenticated
    (with AnonymousUser) so that views using GetPlayerMixin can read the token and get the player.
    """
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith(self.keyword + ' '):
            return None
        token = auth_header[len(self.keyword) + 1:].strip()
        if not token:
            return None
        try:
            player = Player.objects.get(token=token)
        except Player.DoesNotExist:
            return None
        # Accept so that DRF does not return 401; view's GetPlayerMixin will resolve the player
        from django.contrib.auth.models import AnonymousUser
        return (AnonymousUser(), token)
