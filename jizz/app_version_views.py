from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from jizz.store_version import get_store_release_labels


class AppVersionView(APIView):
    """Public mobile app version requirements and store URLs."""

    permission_classes = [AllowAny]

    def get(self, request):
        store_labels = get_store_release_labels()
        response = Response(
            {
                'min_version': settings.APP_MIN_VERSION,
                'app_store_url': settings.APP_STORE_URL,
                'play_store_url': settings.PLAY_STORE_URL,
                'store_release_label_ios': store_labels['ios'],
                'store_release_label_android': store_labels['android'],
            }
        )
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        return response
