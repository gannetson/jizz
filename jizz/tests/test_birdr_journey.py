"""
Tests for Birdr Journey API (/api/birdr-journey/).
"""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from jizz.models import (
    BirdrJourney,
    BirdrJourneyGame,
    Country,
    Game,
    JourneyLevel,
    JourneyStep,
    Player,
)

User = get_user_model()

PNG_1X1 = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
    b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx'
    b'\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
)


def _player_auth(client, player):
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {player.token}')


def _jwt_auth(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _make_level(sequence, title, step_count=2):
    icon = SimpleUploadedFile(f'level{sequence}.png', PNG_1X1, content_type='image/png')
    level = JourneyLevel.objects.create(
        sequence=sequence,
        title=title,
        description=f'Description {title}',
        icon=icon,
    )
    for i in range(step_count):
        JourneyStep.objects.create(
            journey_level=level,
            sequence=i,
            level='beginner',
            length=5,
            jokers=2,
            rarity='familiar',
            media='images',
        )
    return level


class BirdrJourneyApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.player = Player.objects.create(name='JourneyGuest', language='en')
        self.user = User.objects.create_user(username='journeyuser', password='testpass123')
        self.level0 = _make_level(0, 'Nest', step_count=2)
        self.level1 = _make_level(1, 'Fledgling', step_count=1)
        _make_level(2, 'Birdr Champion', step_count=0)

    def test_get_requires_auth(self):
        response = self.client.get('/api/birdr-journey/', {'country_code': 'NL'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_creates_journey_for_player(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['player_token'], self.player.token)
        self.assertEqual(response.data['current_sequence'], 0)
        self.assertEqual(response.data['current_step_sequence'], 0)
        self.assertTrue(response.data['can_play_today'])
        self.assertFalse(response.data['is_champion'])
        self.assertEqual(len(response.data['current_level']['steps']), 2)
        self.assertEqual(response.data['current_level']['steps'][0]['status'], 'current')
        self.assertEqual(response.data['current_level']['steps'][1]['status'], 'locked')
        self.assertTrue(
            BirdrJourney.objects.filter(player=self.player, country=self.country).exists()
        )

    def test_post_idempotent_for_same_player_country(self):
        _player_auth(self.client, self.player)
        self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            BirdrJourney.objects.filter(player=self.player, country=self.country).count(),
            1,
        )

    def test_get_returns_journey(self):
        _player_auth(self.client, self.player)
        BirdrJourney.objects.create(
            player=self.player,
            country=self.country,
            current_sequence=0,
            current_step_sequence=0,
            user=None,
        )
        response = self.client.get('/api/birdr-journey/', {'country_code': 'NL'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_level']['sequence'], 0)
        self.assertEqual(response.data['next_level']['sequence'], 1)
        self.assertIn('icon_url', response.data['current_level'])
        self.assertEqual(response.data['next_level']['sequence'], 1)

    def test_jwt_user_can_create_journey(self):
        _jwt_auth(self.client, self.user)
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            BirdrJourney.objects.filter(user=self.user, country=self.country).exists()
        )
        host = Player.objects.get(user=self.user)
        self.assertEqual(response.data['player_token'], host.token)

    def test_jwt_user_player_token_after_start_step(self):
        _jwt_auth(self.client, self.user)
        create = self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        journey_id = create.data['id']
        response = self.client.post(f'/api/birdr-journey/{journey_id}/start-step/', format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        host = Player.objects.get(user=self.user)
        self.assertEqual(response.data['journey']['player_token'], host.token)
        game = Game.objects.get(token=response.data['journey_game']['game']['token'])
        self.assertEqual(game.host_id, host.id)

    def test_unique_user_country(self):
        _jwt_auth(self.client, self.user)
        BirdrJourney.objects.create(user=self.user, country=self.country, player=None)
        response = self.client.post(
            '/api/birdr-journey/',
            {'country_code': 'NL'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(BirdrJourney.objects.filter(user=self.user).count(), 1)

    def test_start_step_creates_game(self):
        _player_auth(self.client, self.player)
        create = self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        journey_id = create.data['id']
        response = self.client.post(f'/api/birdr-journey/{journey_id}/start-step/', format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('journey_game', response.data)
        self.assertEqual(response.data['journey_game']['status'], 'new')
        self.assertEqual(
            BirdrJourneyGame.objects.filter(birdr_journey_id=journey_id).count(),
            1,
        )

    def test_start_step_idempotent_for_running_game(self):
        _player_auth(self.client, self.player)
        create = self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        journey_id = create.data['id']
        first = self.client.post(f'/api/birdr-journey/{journey_id}/start-step/', format='json')
        second = self.client.post(f'/api/birdr-journey/{journey_id}/start-step/', format='json')
        self.assertEqual(first.data['journey_game']['game']['token'], second.data['journey_game']['game']['token'])
        self.assertEqual(
            BirdrJourneyGame.objects.filter(birdr_journey_id=journey_id).count(),
            1,
        )

    def test_complete_step_advances_progress(self):
        _player_auth(self.client, self.player)
        create = self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        journey = BirdrJourney.objects.get(id=create.data['id'])
        step = journey.current_step_sequence
        start = self.client.post(f'/api/birdr-journey/{journey.id}/start-step/', format='json')
        game_token = start.data['journey_game']['game']['token']
        game = Game.objects.get(token=game_token)
        game.ended = True
        game.save(update_fields=['ended'])

        response = self.client.post(
            f'/api/birdr-journey/{journey.id}/complete-step/',
            {'game_token': game_token},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['journey']['current_step_sequence'], step + 1)
        self.assertFalse(response.data['level_complete'])

    def test_complete_last_step_and_advance_level(self):
        _player_auth(self.client, self.player)
        create = self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        journey = BirdrJourney.objects.get(id=create.data['id'])
        journey.current_step_sequence = 1
        journey.save(update_fields=['current_step_sequence'])

        start = self.client.post(f'/api/birdr-journey/{journey.id}/start-step/', format='json')
        game_token = start.data['journey_game']['game']['token']
        game = Game.objects.get(token=game_token)
        game.ended = True
        game.save(update_fields=['ended'])

        complete = self.client.post(
            f'/api/birdr-journey/{journey.id}/complete-step/',
            {'game_token': game_token},
            format='json',
        )
        self.assertTrue(complete.data['level_complete'])
        self.assertTrue(complete.data['journey']['pending_level_celebration'])

        advance = self.client.post(f'/api/birdr-journey/{journey.id}/advance-level/', format='json')
        self.assertEqual(advance.status_code, status.HTTP_200_OK)
        self.assertEqual(advance.data['current_sequence'], 1)
        self.assertEqual(advance.data['current_step_sequence'], 0)

    def test_works_with_one_based_level_sequences(self):
        JourneyLevel.objects.all().delete()
        _make_level(1, 'First', step_count=1)
        _make_level(2, 'Second', step_count=1)
        _make_level(3, 'Champion', step_count=0)

        _player_auth(self.client, self.player)
        response = self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['current_level']['sequence'], 1)
        self.assertEqual(response.data['current_level']['title'], 'First')
        self.assertTrue(response.data['can_play_today'])

    def test_joker_exhaustion_ends_journey_step(self):
        from jizz.models import Question

        _player_auth(self.client, self.player)
        create = self.client.post('/api/birdr-journey/', {'country_code': 'NL'}, format='json')
        journey_id = create.data['id']
        start = self.client.post(f'/api/birdr-journey/{journey_id}/start-step/', format='json')
        journey_game = BirdrJourneyGame.objects.get(id=start.data['journey_game']['id'])
        step = journey_game.journey_step
        step.jokers = 1
        step.save(update_fields=['jokers'])

        game = Game.objects.get(token=start.data['journey_game']['game']['token'])
        game.host = self.player
        game.save(update_fields=['host'])

        def submit_wrong_answer():
            q_resp = self.client.get(
                f'/api/games/{game.token}/question',
                HTTP_AUTHORIZATION=f'Bearer {self.player.token}',
            )
            self.assertEqual(q_resp.status_code, status.HTTP_200_OK)
            question = Question.objects.get(id=q_resp.data['id'])
            wrong = question.options.exclude(species_id=question.species_id).first()
            self.assertIsNotNone(wrong)
            return self.client.post(
                '/api/answer/',
                {
                    'player_token': self.player.token,
                    'question_id': question.id,
                    'answer_id': wrong.species_id,
                },
                format='json',
            )

        submit_wrong_answer()
        journey_game.refresh_from_db()
        game.refresh_from_db()
        self.assertEqual(journey_game.remaining_jokers, 0)
        self.assertEqual(journey_game.status, 'running')
        self.assertFalse(game.force_ended)

        submit_wrong_answer()
        journey_game.refresh_from_db()
        game.refresh_from_db()
        self.assertEqual(journey_game.status, 'failed')
        self.assertTrue(game.force_ended)

        q_after = self.client.get(f'/api/games/{game.token}/question')
        self.assertEqual(q_after.status_code, status.HTTP_404_NOT_FOUND)

    def test_champion_level(self):
        _player_auth(self.client, self.player)
        journey = BirdrJourney.objects.create(
            player=self.player,
            country=self.country,
            current_sequence=2,
            current_step_sequence=0,
            user=None,
        )
        response = self.client.get('/api/birdr-journey/', {'country_code': 'NL'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_champion'])
        self.assertFalse(response.data['can_play_today'])
        self.assertEqual(response.data['current_level']['title'], 'Birdr Champion')
