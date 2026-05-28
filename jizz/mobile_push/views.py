from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from jizz.mobile_push.expo import send_expo_push
from jizz.mobile_push.serializers import PushRegisterSerializer
from jizz.mobile_push.services import register_push_device, send_signup_test_push_async


class PushRegisterView(APIView):
    """POST /api/mobile/push/register/ — store Expo token, timezone, send welcome push."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PushRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['expo_push_token']
        platform = serializer.validated_data['platform']
        timezone = serializer.validated_data.get('timezone') or ''

        device = register_push_device(
            request.user,
            token,
            platform,
            timezone=timezone or None,
        )
        test_push_sent = send_expo_push(
            token,
            'Birdr',
            "You're good to go!",
            data={'type': 'signup_test'},
        )
        # Also try async in case sync path is slow; idempotent for user.
        send_signup_test_push_async(token)

        return Response(
            {
                'id': device.id,
                'expo_push_token': device.expo_push_token,
                'platform': device.platform,
                'enabled': device.enabled,
                'test_push_sent': test_push_sent,
            },
            status=status.HTTP_200_OK,
        )
