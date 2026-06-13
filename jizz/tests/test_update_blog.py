import json

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from jizz.models import Player, Update, UpdateEmailRecipient, UpdateThumbsUp, UserProfile
from jizz.update_emails import mark_email_opened, send_test_update_email


class UpdateBlogApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user('author', password='x', email='author@example.com')
        self.update = Update.objects.create(
            title_en='New feature',
            title_nl='Nieuwe functie',
            body_en='{"delta":"","html":"<p>Hello world</p>"}',
            body_nl='{"delta":"","html":"<p>Hallo wereld</p>"}',
            user=self.author,
        )
        self.player = Player.objects.create(name='Player', language='en')

    def test_list_returns_title_and_excerpt(self):
        response = self.client.get('/api/updates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data['results'][0]
        self.assertEqual(row['title'], 'New feature')
        self.assertIn('Hello world', row['excerpt'])
        self.assertEqual(row['message'], 'Hello world')
        self.assertEqual(row['reactions'], [])

    def test_list_message_uses_dutch_body(self):
        response = self.client.get('/api/updates/', HTTP_ACCEPT_LANGUAGE='nl')
        row = response.data['results'][0]
        self.assertEqual(row['title'], 'Nieuwe functie')
        self.assertEqual(row['message'], 'Hallo wereld')

    def test_detail_includes_legacy_message_and_rich_body(self):
        response = self.client.get(f'/api/updates/{self.update.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Hello world')
        self.assertIn('"html"', response.data['body'])

    def test_detail_localizes_to_dutch(self):
        response = self.client.get(
            f'/api/updates/{self.update.id}/',
            HTTP_ACCEPT_LANGUAGE='nl',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Nieuwe functie')

    def test_thumbs_up_with_player_token(self):
        response = self.client.post(
            f'/api/updates/{self.update.id}/thumbs-up/',
            {'player_token': self.player.token},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['thumbs_up_count'], 1)
        self.assertTrue(UpdateThumbsUp.objects.filter(update=self.update, player=self.player).exists())

    def test_thumbs_up_with_authenticated_user(self):
        user = User.objects.create_user('reader', password='x')
        self.client.force_authenticate(user=user)
        response = self.client.post(f'/api/updates/{self.update.id}/thumbs-up/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UpdateThumbsUp.objects.filter(update=self.update, user=user).exists())


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class UpdateEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            'staff',
            password='x',
            email='staff@example.com',
            is_staff=True,
        )
        UserProfile.objects.create(user=self.admin, receive_updates=True)
        self.update = Update.objects.create(
            title_en='Email update',
            body_en='{"delta":"","html":"<p>Email body</p>"}',
            user=self.admin,
        )

    def test_send_test_email_creates_recipient_with_tracking_token(self):
        ok = send_test_update_email(self.update, self.admin)
        self.assertTrue(ok)
        recipient = UpdateEmailRecipient.objects.get(user=self.admin)
        self.assertEqual(recipient.email, 'staff@example.com')
        self.assertTrue(recipient.tracking_token)

    def test_email_open_tracking_marks_recipient(self):
        send_test_update_email(self.update, self.admin)
        recipient = UpdateEmailRecipient.objects.get(user=self.admin)
        self.assertTrue(mark_email_opened(recipient.tracking_token))
        recipient.refresh_from_db()
        self.assertIsNotNone(recipient.opened_at)

    def test_email_open_pixel_endpoint(self):
        send_test_update_email(self.update, self.admin)
        recipient = UpdateEmailRecipient.objects.get(user=self.admin)
        response = self.client.get(f'/api/updates/email-open/{recipient.tracking_token}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/gif')
        recipient.refresh_from_db()
        self.assertIsNotNone(recipient.opened_at)

    def test_email_uses_open_url_and_button_label(self):
        from django.core import mail

        send_test_update_email(self.update, self.admin)
        self.assertEqual(len(mail.outbox), 1)
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn(f'/open/update/{self.update.id}/', html)
        self.assertIn('Open Birdr App', html)


class ReceiveUpdatesMigrationTests(TestCase):
    def test_new_profiles_default_to_true(self):
        user = User.objects.create_user('newbie', password='x')
        profile = UserProfile.objects.create(user=user)
        self.assertTrue(profile.receive_updates)
