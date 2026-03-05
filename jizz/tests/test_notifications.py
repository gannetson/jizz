"""
Tests for jizz.notifications (push and email helpers).
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model

from jizz.models import DeviceToken
from jizz import notifications

User = get_user_model()


class SendPushToUserTestCase(TestCase):
    """send_push_to_user sends to Expo when tokens exist and SEND_PUSH_NOTIFICATIONS is True."""

    def test_no_tokens_returns_early(self):
        user = User.objects.create_user(username='u', email='u@test.com', password='pass')
        # No DeviceToken for user - should return without error and without calling requests
        with patch('requests.post') as mock_post:
            notifications.send_push_to_user(user, 'Title', 'Body')
            mock_post.assert_not_called()

    @patch('jizz.notifications.settings', MagicMock(SEND_PUSH_NOTIFICATIONS=False, EXPO_PUSH_URL='https://exp.host/--/api/v2/push/send'))
    def test_tokens_exist_but_send_disabled_does_not_post(self):
        user = User.objects.create_user(username='u', email='u@test.com', password='pass')
        DeviceToken.objects.create(user=user, token='ExponentPushToken[xxx]', platform='ios')
        with patch('requests.post') as mock_post:
            notifications.send_push_to_user(user, 'Title', 'Body')
            mock_post.assert_not_called()

    @patch('jizz.notifications.settings', MagicMock(SEND_PUSH_NOTIFICATIONS=True, EXPO_PUSH_URL='https://exp.host/--/api/v2/push/send'))
    def test_tokens_and_send_enabled_posts_to_expo(self):
        user = User.objects.create_user(username='u', email='u@test.com', password='pass')
        DeviceToken.objects.create(user=user, token='ExponentPushToken[yyy]', platform='android')
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(status_code=200, text='')
            notifications.send_push_to_user(user, 'Hi', 'Message', data={'key': 'value'})
            mock_post.assert_called_once()
            call_kw = mock_post.call_args[1]
            self.assertEqual(call_kw['json']['title'], 'Hi')
            self.assertEqual(call_kw['json']['body'], 'Message')
            self.assertEqual(call_kw['json']['data'], {'key': 'value'})
            self.assertEqual(call_kw['json']['to'], 'ExponentPushToken[yyy]')
