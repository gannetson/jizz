from rest_framework import serializers


class PushRegisterSerializer(serializers.Serializer):
    expo_push_token = serializers.CharField(max_length=500)
    timezone = serializers.CharField(max_length=63, required=False, allow_blank=True, default='')
    platform = serializers.ChoiceField(choices=['ios', 'android'])
    send_welcome = serializers.BooleanField(required=False, default=False)

    def validate_expo_push_token(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('expo_push_token is required.')
        if not (
            value.startswith('ExponentPushToken[')
            or value.startswith('ExpoPushToken[')
        ):
            raise serializers.ValidationError('Invalid Expo push token format.')
        return value

    def validate_timezone(self, value):
        if value is None:
            return ''
        return (value or '').strip()
