"""
Custom JWT views so POST /token/ accepts either username or email (mobile sends username=email).
"""
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


User = get_user_model()


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Allow login with username or email; mobile app sends username=email."""

    def validate(self, attrs):
        username_or_email = (attrs.get("username") or "").strip()
        password = attrs.get("password")
        if not username_or_email or not password:
            return super().validate(attrs)
        if "@" in username_or_email:
            user = User.objects.filter(email__iexact=username_or_email).first()
        else:
            user = User.objects.filter(username=username_or_email).first()
        if user and user.check_password(password):
            attrs["username"] = user.get_username()
        return super().validate(attrs)


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer
