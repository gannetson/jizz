from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from jizz.models import (
    Answer,
    Country,
    CountrySpecies,
    Game,
    Player,
    PlayerScore,
    Question,
    Species,
    UserProfile,
)
from jizz.serializers import AnswerSerializer
from jizz.services.checklist import compute_checklist_added, compute_checklist_missed
from media.models import Media

User = get_user_model()


class AnswerChecklistAddedTestCase(TestCase):
    def setUp(self):
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.user = User.objects.create_user(username='checklistanswer', password='testpass123')
        UserProfile.objects.create(user=self.user, country=self.country, language='en')
        self.player = Player.objects.create(name='Player', user=self.user)
        self.guest = Player.objects.create(name='Guest')
        self.species = Species.objects.create(
            name='Robin', name_latin='Erithacus rubecula', code='eurrob1',
        )
        CountrySpecies.objects.create(country=self.country, species=self.species, status='native')
        Media.objects.create(
            species=self.species, type='image', url='https://example.com/robin.jpg', source='test',
        )
        self.game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=5,
            media='images',
            host=self.player,
        )
        self.question = Question.objects.create(
            game=self.game,
            species=self.species,
            sequence=1,
            number=0,
        )

    def test_compute_checklist_added_first_correct(self):
        self.assertTrue(
            compute_checklist_added(self.player, self.question, correct=True)
        )

    def test_compute_checklist_added_false_after_prior_correct(self):
        player_score = PlayerScore.objects.create(player=self.player, game=self.game)
        Answer.objects.create(
            player_score=player_score,
            question=self.question,
            answer=self.species,
            correct=True,
        )
        q2 = Question.objects.create(
            game=self.game, species=self.species, sequence=2, number=0,
        )
        self.assertFalse(compute_checklist_added(self.player, q2, correct=True))

    def test_compute_checklist_added_guest_false(self):
        self.assertFalse(
            compute_checklist_added(self.guest, self.question, correct=True)
        )

    def test_compute_checklist_added_jwt_user_unlinked_player(self):
        unlinked = Player.objects.create(name='UnlinkedGuest')
        self.assertTrue(
            compute_checklist_added(
                unlinked, self.question, correct=True, user=self.user
            )
        )

    def test_answer_serializer_checklist_added_jwt_unlinked_player(self):
        from rest_framework.test import APIRequestFactory

        guest = Player.objects.create(name='GuestJwt')
        factory = APIRequestFactory()
        request = factory.post('/api/answer/')
        request.user = self.user
        serializer = AnswerSerializer(
            data={
                'question_id': self.question.id,
                'answer_id': self.species.id,
                'player_token': guest.token,
            },
            context={'request': request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        answer = serializer.save()
        self.assertTrue(answer.correct)
        self.assertTrue(serializer.data['checklist_added'])

    def test_answer_serializer_includes_checklist_added_on_first_correct(self):
        serializer = AnswerSerializer(
            data={
                'question_id': self.question.id,
                'answer_id': self.species.id,
                'player_token': self.player.token,
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        answer = serializer.save()
        self.assertTrue(answer.correct)
        self.assertTrue(serializer.data['checklist_added'])

    def test_answer_serializer_checklist_added_false_on_duplicate(self):
        player_score = PlayerScore.objects.create(player=self.player, game=self.game)
        Answer.objects.create(
            player_score=player_score,
            question=self.question,
            answer=self.species,
            correct=True,
        )
        serializer = AnswerSerializer(
            data={
                'question_id': self.question.id,
                'answer_id': self.species.id,
                'player_token': self.player.token,
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        answer = serializer.save()
        self.assertFalse(serializer.data['checklist_added'])
        self.assertFalse(getattr(answer, 'checklist_added', True))

    def test_answer_api_jwt_first_identification_returns_checklist_added(self):
        guest = Player.objects.create(name='GuestApi')
        q2 = Question.objects.create(
            game=self.game, species=self.species, sequence=2, number=0,
        )
        client = APIClient()
        token = str(RefreshToken.for_user(self.user).access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post(
            '/api/answer/',
            {
                'player_token': guest.token,
                'question_id': q2.id,
                'answer_id': self.species.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['correct'])
        self.assertTrue(response.data['checklist_added'])

    def test_compute_checklist_missed_first_wrong_encounter(self):
        wrong_species = Species.objects.create(
            name='Wrong', name_latin='Wrongus wrongus', code='wrong1',
        )
        self.assertTrue(
            compute_checklist_missed(self.player, self.question, correct=False)
        )

    def test_compute_checklist_missed_false_when_correct(self):
        self.assertFalse(
            compute_checklist_missed(self.player, self.question, correct=True)
        )

    def test_compute_checklist_missed_false_after_prior_encounter(self):
        player_score = PlayerScore.objects.create(player=self.player, game=self.game)
        wrong_species = Species.objects.create(
            name='Wrong', name_latin='Wrongus wrongus', code='wrong2',
        )
        Answer.objects.create(
            player_score=player_score,
            question=self.question,
            answer=wrong_species,
            correct=False,
        )
        q2 = Question.objects.create(
            game=self.game, species=self.species, sequence=2, number=0,
        )
        self.assertFalse(compute_checklist_missed(self.player, q2, correct=False))

    def test_answer_api_jwt_first_wrong_returns_checklist_missed(self):
        guest = Player.objects.create(name='GuestMissed')
        wrong_species = Species.objects.create(
            name='Wrong', name_latin='Wrongus api', code='wrong3',
        )
        client = APIClient()
        token = str(RefreshToken.for_user(self.user).access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post(
            '/api/answer/',
            {
                'player_token': guest.token,
                'question_id': self.question.id,
                'answer_id': wrong_species.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['correct'])
        self.assertTrue(response.data['checklist_missed'])
        self.assertFalse(response.data['checklist_added'])
