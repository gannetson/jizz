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
from media.models import Media

User = get_user_model()


class ChecklistApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.user = User.objects.create_user(username='checklistuser', password='testpass123')
        UserProfile.objects.create(user=self.user, country=self.country, language='en')
        self.player = Player.objects.create(name='Checklist Player', user=self.user)
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        self.sp_identified = Species.objects.create(
            name='Robin', name_latin='Erithacus rubecula', code='eurrob1',
        )
        self.sp_missed = Species.objects.create(
            name='Bluetail', name_latin='Tarsiger cyanurus', code='redblu1',
        )
        self.sp_unseen = Species.objects.create(
            name='Unseen Bird', name_latin='Unseenus birdus', code='unseen1',
        )
        for sp in (self.sp_identified, self.sp_missed, self.sp_unseen):
            CountrySpecies.objects.create(country=self.country, species=sp, status='native')
            Media.objects.create(
                species=sp, type='image', url=f'https://example.com/{sp.code}.jpg', source='test',
            )

        self.wrong_species = Species.objects.create(
            name='Wrong Pick', name_latin='Wrongus pickus', code='wrong01',
        )
        Media.objects.create(
            species=self.wrong_species, type='image',
            url='https://example.com/wrong.jpg', source='test',
        )

    def test_checklist_requires_auth(self):
        self.client.credentials()
        response = self.client.get('/api/checklist/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_checklist_no_country_without_profile_country(self):
        UserProfile.objects.filter(user=self.user).update(country=None)
        response = self.client.get('/api/checklist/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checklist_totals_identified_missed_unseen(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)

        q1 = Question.objects.create(game=game, species=self.sp_identified, sequence=1, number=1)
        Answer.objects.create(
            player_score=player_score, question=q1,
            answer=self.sp_identified, correct=True,
        )

        q2 = Question.objects.create(game=game, species=self.sp_missed, sequence=2, number=1)
        Answer.objects.create(
            player_score=player_score, question=q2,
            answer=self.wrong_species, correct=False,
        )

        response = self.client.get('/api/checklist/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        totals = response.data['totals']
        self.assertEqual(totals['all'], 3)
        self.assertEqual(totals['identified'], 1)
        self.assertEqual(totals['missed'], 1)
        self.assertEqual(totals['unseen'], 1)

        by_id = {s['id']: s for s in response.data['species']}
        self.assertEqual(by_id[self.sp_identified.id]['status'], 'identified')
        self.assertEqual(by_id[self.sp_missed.id]['status'], 'missed')
        self.assertEqual(by_id[self.sp_unseen.id]['status'], 'unseen')

    def test_wrong_then_correct_counts_as_identified(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)
        q = Question.objects.create(game=game, species=self.sp_identified, sequence=1, number=1)
        Answer.objects.create(
            player_score=player_score, question=q,
            answer=self.wrong_species, correct=False,
        )
        game2 = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score2, _ = PlayerScore.objects.get_or_create(player=self.player, game=game2)
        q2 = Question.objects.create(game=game2, species=self.sp_identified, sequence=1, number=1)
        Answer.objects.create(
            player_score=player_score2, question=q2,
            answer=self.sp_identified, correct=True,
        )

        response = self.client.get('/api/checklist/', {'status': 'identified'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [s['id'] for s in response.data['species']]
        self.assertIn(self.sp_identified.id, ids)
        self.assertNotIn(self.sp_missed.id, ids)

    def test_correct_then_wrong_still_identified(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)

        q1 = Question.objects.create(game=game, species=self.sp_identified, sequence=1, number=1)
        Answer.objects.create(
            player_score=player_score, question=q1,
            answer=self.sp_identified, correct=True,
        )

        game2 = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score2, _ = PlayerScore.objects.get_or_create(player=self.player, game=game2)
        q2 = Question.objects.create(game=game2, species=self.sp_identified, sequence=1, number=1)
        Answer.objects.create(
            player_score=player_score2, question=q2,
            answer=self.wrong_species, correct=False,
        )

        response = self.client.get('/api/checklist/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        totals = response.data['totals']
        self.assertEqual(totals['identified'], 1)
        self.assertEqual(totals['missed'], 0)

        row = next(s for s in response.data['species'] if s['id'] == self.sp_identified.id)
        self.assertEqual(row['status'], 'identified')
        self.assertGreaterEqual(row['times_identified'], 1)

    def test_filter_missed(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)
        q = Question.objects.create(game=game, species=self.sp_missed, sequence=1, number=1)
        Answer.objects.create(
            player_score=player_score, question=q,
            answer=self.wrong_species, correct=False,
        )

        response = self.client.get('/api/checklist/', {'status': 'missed'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [s['id'] for s in response.data['species']]
        self.assertEqual(ids, [self.sp_missed.id])

    def test_unanswered_question_does_not_count_as_encountered(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)
        Question.objects.create(game=game, species=self.sp_missed, sequence=1, number=1)

        response = self.client.get('/api/checklist/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        totals = response.data['totals']
        self.assertEqual(totals['missed'], 0)
        self.assertEqual(totals['unseen'], 3)

        row = next(s for s in response.data['species'] if s['id'] == self.sp_missed.id)
        self.assertEqual(row['status'], 'unseen')
        self.assertEqual(row['times_encountered'], 0)

    def test_pagination(self):
        response = self.client.get('/api/checklist/', {'page_size': 2, 'page': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['species']), 2)
        self.assertTrue(response.data['pagination']['has_next'])

    def test_excludes_non_checklist_country_species_status(self):
        introduced = Species.objects.create(
            name='Escapee', name_latin='Escapeus duckus', code='escape1',
        )
        CountrySpecies.objects.create(
            country=self.country, species=introduced, status='introduced',
        )
        Media.objects.create(
            species=introduced, type='image',
            url='https://example.com/escape.jpg', source='test',
        )
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player, game=game)
        q = Question.objects.create(game=game, species=introduced, sequence=1, number=1)
        Answer.objects.create(
            player_score=player_score, question=q,
            answer=introduced, correct=True,
        )

        response = self.client.get('/api/checklist/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['totals']['all'], 3)
        ids = {s['id'] for s in response.data['species']}
        self.assertNotIn(introduced.id, ids)

    def test_illustration_url_falls_back_to_first_image(self):
        response = self.client.get('/api/checklist/', {'status': 'unseen'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(s for s in response.data['species'] if s['id'] == self.sp_unseen.id)
        self.assertEqual(row['illustration_url'], f'https://example.com/{self.sp_unseen.code}.jpg')
