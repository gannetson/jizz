from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class AppVersionView(APIView):
    """Public mobile app version requirements and store URLs."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                'min_version': settings.APP_MIN_VERSION,
                'app_store_url': settings.APP_STORE_URL,
                'play_store_url': settings.PLAY_STORE_URL,
            }
        )
