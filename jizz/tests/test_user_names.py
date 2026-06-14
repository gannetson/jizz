from django.contrib.auth import get_user_model
from django.test import TestCase

from jizz.country_challenge_leaderboard import journey_player_name
from jizz.migrations.0118_sanitize_email_usernames import sanitize_email_usernames
from jizz.models import BirdrJourney, Country, Player
from jizz.user_names import (
    make_unique_username,
    player_name_for_user,
    sanitize_player_name,
    sanitize_username,
    strip_email_local_part,
    username_from_oauth,
)

User = get_user_model()


class UserNameHelperTests(TestCase):
    def test_strip_email_local_part(self):
        self.assertEqual(strip_email_local_part('mobile@example.com'), 'mobile')
        self.assertEqual(strip_email_local_part('Ada Lovelace'), 'Ada Lovelace')
        self.assertEqual(strip_email_local_part(''), '')

    def test_sanitize_username(self):
        self.assertEqual(sanitize_username('mobile@example.com'), 'mobile')
        self.assertEqual(sanitize_username(''), 'user')

    def test_make_unique_username_avoids_collision(self):
        User.objects.create_user(username='mobile', email='first@example.com', password='pass12345')
        self.assertEqual(make_unique_username('mobile@other.com'), 'mobile_1')

    def test_username_from_oauth_prefers_full_name(self):
        username = username_from_oauth(first_name='Ada', last_name='Lovelace', email='ada@example.com')
        self.assertEqual(username, 'Ada Lovelace')

    def test_username_from_oauth_strips_email_when_no_name(self):
        username = username_from_oauth(email='mobile@example.com')
        self.assertEqual(username, 'mobile')

    def test_player_name_for_user_prefers_full_name(self):
        user = User.objects.create_user(
            username='mobile@example.com',
            email='mobile@example.com',
            password='pass12345',
            first_name='Ada',
            last_name='Bird',
        )
        self.assertEqual(player_name_for_user(user), 'Ada Bird')

    def test_player_name_for_user_strips_email_username(self):
        user = User.objects.create_user(
            username='mobile@example.com',
            email='mobile@example.com',
            password='pass12345',
        )
        self.assertEqual(player_name_for_user(user), 'mobile')

    def test_sanitize_player_name(self):
        self.assertEqual(sanitize_player_name('player@example.com'), 'player')


class SanitizeEmailUsernamesMigrationTests(TestCase):
    def test_migration_strips_user_and_player_names(self):
        user = User.objects.create_user(
            username='legacy@example.com',
            email='legacy@example.com',
            password='pass12345',
        )
        player = Player.objects.create(name='player@example.com', language='en', user=user)

        sanitize_email_usernames(None, None)

        user.refresh_from_db()
        player.refresh_from_db()
        self.assertEqual(user.username, 'legacy')
        self.assertEqual(player.name, 'player')


class JourneyPlayerNameEmailStripTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code='NL', name='Netherlands')

    def test_journey_player_name_never_returns_email(self):
        user = User.objects.create_user(
            username='bird@example.com',
            email='bird@example.com',
            password='pass12345',
        )
        journey = BirdrJourney.objects.create(user=user, country=self.country)
        self.assertEqual(journey_player_name(journey), 'bird')
