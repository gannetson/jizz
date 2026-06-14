from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from jizz.country_challenge_leaderboard import country_challenge_leaderboard, journey_player_name
from jizz.models import BirdrJourney, Country, JourneyLevel, JourneyStep, Player

User = get_user_model()

PNG_1X1 = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
    b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx'
    b'\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
)


def _make_level(sequence, title, step_count=2):
    icon = SimpleUploadedFile(f'level{sequence}.png', PNG_1X1, content_type='image/png')
    level = JourneyLevel.objects.create(
        sequence=sequence,
        title=title,
        description=title,
        icon=icon,
    )
    for i in range(step_count):
        JourneyStep.objects.create(
            journey_level=level,
            sequence=i,
            level='beginner',
            length=5,
            jokers=2,
        )
    return level


class CountryChallengeLeaderboardTests(TestCase):
    def setUp(self):
        self.country_nl = Country.objects.create(code='NL', name='Netherlands')
        self.country_de = Country.objects.create(code='DE', name='Germany')
        _make_level(0, 'Nestling', step_count=2)
        _make_level(1, 'Fledgling', step_count=2)
        _make_level(2, 'Champion', step_count=0)

    def test_player_can_appear_for_each_country(self):
        player = Player.objects.create(name='Ada', language='en')
        BirdrJourney.objects.create(
            player=player,
            country=self.country_nl,
            current_sequence=1,
            current_step_sequence=0,
        )
        BirdrJourney.objects.create(
            player=player,
            country=self.country_de,
            current_sequence=0,
            current_step_sequence=1,
        )

        rows = country_challenge_leaderboard(limit=10)
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(row['player_name'] == 'Ada' for row in rows))
        codes = {row['country_code'] for row in rows}
        self.assertEqual(codes, {'NL', 'DE'})

    def test_sorts_by_highest_level_then_step(self):
        ahead = Player.objects.create(name='Ahead', language='en')
        behind = Player.objects.create(name='Behind', language='en')
        BirdrJourney.objects.create(
            player=behind,
            country=self.country_de,
            current_sequence=0,
            current_step_sequence=0,
        )
        BirdrJourney.objects.create(
            player=ahead,
            country=self.country_nl,
            current_sequence=1,
            current_step_sequence=1,
        )

        rows = country_challenge_leaderboard(limit=10)
        self.assertEqual(rows[0]['player_name'], 'Ahead')
        self.assertEqual(rows[0]['level_title'], 'Fledgling')
        self.assertEqual(rows[0]['step_label'], 'Step 2')
        self.assertEqual(rows[1]['player_name'], 'Behind')
        self.assertEqual(rows[1]['step_label'], 'Step 1')

    def test_champion_row(self):
        player = Player.objects.create(name='Winner', language='en')
        BirdrJourney.objects.create(
            player=player,
            country=self.country_nl,
            current_sequence=2,
            current_step_sequence=0,
        )

        row = country_challenge_leaderboard(limit=1)[0]
        self.assertTrue(row['is_champion'])
        self.assertEqual(row['step_label'], 'Champion')
        self.assertEqual(row['level_title'], 'Champion')

    def test_user_journey_uses_linked_player_name(self):
        user = User.objects.create_user(username='birduser', password='pass')
        Player.objects.create(user=user, name='Bird User', language='en')
        BirdrJourney.objects.create(
            user=user,
            player=None,
            country=self.country_nl,
            current_sequence=0,
            current_step_sequence=0,
        )

        journey = BirdrJourney.objects.get(user=user)
        self.assertEqual(journey_player_name(journey), 'Bird User')
