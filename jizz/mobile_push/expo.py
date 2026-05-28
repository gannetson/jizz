"""
Expo Push API helpers.
"""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def send_expo_push(
    expo_push_token: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> bool:
    """
    Send one push via Expo. Returns True if the HTTP call succeeded.
    Does not raise; logs errors.
    """
    if not expo_push_token or not expo_push_token.strip():
        logger.warning('send_expo_push: missing token')
        return False

    payload = {
        'to': expo_push_token.strip(),
        'sound': 'default',
        'title': title,
        'body': body,
        'data': data or {},
    }
    url = getattr(settings, 'EXPO_PUSH_URL', EXPO_PUSH_URL)
    send = getattr(settings, 'SEND_PUSH_NOTIFICATIONS', False)

    if not send:
        logger.info('send_expo_push skipped (SEND_PUSH_NOTIFICATIONS=False): %s', title)
        return False

    try:
        import requests

        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code != 200:
            logger.warning('Expo push failed: %s %s', resp.status_code, resp.text)
            return False
        try:
            body_json = resp.json()
            errors = body_json.get('data') or []
            for item in errors:
                if item.get('status') == 'error':
                    logger.warning(
                        'Expo push ticket error: %s',
                        item.get('message', item),
                    )
                    return False
        except Exception:
            pass
        return True
    except Exception as exc:
        logger.warning('Expo push request failed: %s', exc)
        return False
