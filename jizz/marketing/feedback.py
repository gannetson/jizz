"""Spam-resistant helpers for the public marketing feedback form."""

from __future__ import annotations

import time

from django.core.cache import cache
from django.core.signing import BadSignature, Signer
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

_SALT = 'marketing-feedback'
_MIN_SECONDS = 1.5
_MAX_SECONDS = 60 * 60
_RATE_LIMIT = 6
_RATE_WINDOW = 60 * 60


def issue_started_token() -> str:
    return Signer(salt=_SALT).sign(str(int(time.time())))


def started_token_ok(token: str) -> bool:
    try:
        started = int(Signer(salt=_SALT).unsign(token or ''))
    except (BadSignature, TypeError, ValueError):
        return False
    elapsed = time.time() - started
    return _MIN_SECONDS <= elapsed <= _MAX_SECONDS


def client_ip(request) -> str:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()[:64]
    return (request.META.get('REMOTE_ADDR') or 'unknown')[:64]


def rate_limited(request) -> bool:
    key = f'mkt-feedback:{client_ip(request)}'
    count = cache.get(key, 0)
    if count >= _RATE_LIMIT:
        return True
    cache.set(key, count + 1, _RATE_WINDOW)
    return False


def looks_like_spam(*, website: str, token: str, request) -> bool:
    if (website or '').strip():
        return True
    if not started_token_ok(token):
        return True
    return rate_limited(request)


def clean_email(value: str) -> str:
    email = (value or '').strip()
    if not email:
        return ''
    try:
        validate_email(email)
    except ValidationError:
        raise
    return email


def safe_next_path(value: str, fallback: str = '/site/') -> str:
    path = (value or '').strip() or fallback
    if path.startswith('//') or '://' in path:
        return fallback
    if not path.startswith('/'):
        return fallback
    return path.split('#')[0].split('?')[0]
