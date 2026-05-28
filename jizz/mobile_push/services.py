"""
Register mobile push devices and optional welcome test push.
"""
from __future__ import annotations

import logging
import threading

from django.contrib.auth.models import User

from jizz.mobile_push.expo import send_expo_push
from jizz.models import PushDevice, UserProfile

logger = logging.getLogger(__name__)

SIGNUP_TEST_TITLE = 'Birdr'
SIGNUP_TEST_BODY = "You're good to go!"


def register_push_device(
    user: User,
    expo_push_token: str,
    platform: str,
    timezone: str | None = None,
) -> PushDevice:
    """
    Upsert PushDevice; reassign token to ``user`` if it belonged to someone else.
    Update profile timezone when provided.
    """
    token = expo_push_token.strip()
    PushDevice.objects.filter(expo_push_token=token).exclude(user=user).delete()
    device, _ = PushDevice.objects.update_or_create(
        expo_push_token=token,
        defaults={
            'user': user,
            'platform': platform,
            'enabled': True,
        },
    )

    if timezone and timezone.strip():
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.timezone = timezone.strip()[:63]
        profile.save(update_fields=['timezone', 'updated'])

    return device


def send_signup_test_push_async(expo_push_token: str) -> None:
    """Fire-and-forget welcome push so registration never fails on delivery."""

    def _send():
        send_expo_push(
            expo_push_token,
            SIGNUP_TEST_TITLE,
            SIGNUP_TEST_BODY,
            data={'type': 'signup_test'},
        )

    threading.Thread(target=_send, daemon=True).start()
