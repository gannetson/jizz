"""
Tests for jizz custom auth backends (e.g. AppleIdAuth).
"""
from unittest.mock import MagicMock
from django.test import TestCase

from jizz.backends import AppleIdAuth


class AppleIdAuthTestCase(TestCase):
    """AppleIdAuth.get_private_key loads PEM and raises when secret missing."""

    def test_get_private_key_raises_when_secret_empty(self):
        backend = AppleIdAuth(MagicMock(), MagicMock())
        backend.setting = MagicMock(return_value='')
        with self.assertRaises(ValueError) as ctx:
            backend.get_private_key()
        self.assertIn('SECRET', str(ctx.exception))

    def test_get_private_key_raises_when_secret_whitespace_only(self):
        backend = AppleIdAuth(MagicMock(), MagicMock())
        backend.setting = MagicMock(return_value='   \n  ')
        with self.assertRaises(ValueError) as ctx:
            backend.get_private_key()
        self.assertIn('SECRET', str(ctx.exception))

    def test_get_private_key_raises_when_secret_none(self):
        backend = AppleIdAuth(MagicMock(), MagicMock())
        backend.setting = MagicMock(return_value=None)
        with self.assertRaises(ValueError):
            backend.get_private_key()
