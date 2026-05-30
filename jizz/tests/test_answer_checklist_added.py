from django.contrib.auth import get_user_model
from django.test import TestCase

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
from jizz.services.checklist import compute_checklist_added
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
