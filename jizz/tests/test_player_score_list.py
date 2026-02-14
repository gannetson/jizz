from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from jizz.models import Game, Player, Country, PlayerScore


class PlayerScoreListViewTestCase(TestCase):
    """Tests for GET /api/scores/ (hiscores list endpoint)."""

    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.country_de = Country.objects.get_or_create(code='DE', defaults={'name': 'Germany'})[0]

        self.player1 = Player.objects.create(name='Alice', language='en')
        self.player2 = Player.objects.create(name='Bob', language='en')
        self.player3 = Player.objects.create(name='Carol', language='en')

        # Game 1: advanced, 10, images, NL
        self.game1 = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player1,
            include_rare=True,
        )
        self.ps1, _ = PlayerScore.objects.get_or_create(player=self.player1, game=self.game1)
        self.ps1.score = 500
        self.ps1.save()
        self.ps2, _ = PlayerScore.objects.get_or_create(player=self.player2, game=self.game1)
        self.ps2.score = 300
        self.ps2.save()
        self.ps3, _ = PlayerScore.objects.get_or_create(player=self.player3, game=self.game1)
        self.ps3.score = 400
        self.ps3.save()

        # Game 2: same type so they appear in same filtered list
        self.game2 = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player2,
            include_rare=True,
        )
        self.ps4, _ = PlayerScore.objects.get_or_create(player=self.player1, game=self.game2)
        self.ps4.score = 200
        self.ps4.save()
        self.ps5, _ = PlayerScore.objects.get_or_create(player=self.player2, game=self.game2)
        self.ps5.score = 600
        self.ps5.save()

    def test_scores_list_returns_200(self):
        response = self.client.get('/api/scores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_scores_list_returns_paginated_results(self):
        response = self.client.get('/api/scores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)
        self.assertIn('count', response.data)
        self.assertGreaterEqual(response.data['count'], 5)

    def test_scores_list_returns_expected_fields(self):
        response = self.client.get('/api/scores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertGreater(len(results), 0)
        item = results[0]
        for field in ('id', 'name', 'country', 'media', 'level', 'length', 'score', 'ranking'):
            self.assertIn(field, item, f'Missing field: {field}')
        self.assertIn('code', item['country'])
        self.assertIn('name', item['country'])

    def test_scores_ordered_by_score_desc(self):
        response = self.client.get('/api/scores/?game__level=advanced&game__length=10&game__media=images&game__country=NL')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        scores = [r['score'] for r in results]
        self.assertEqual(scores, sorted(scores, reverse=True), 'Scores should be descending')

    def test_scores_ranking_is_sequential(self):
        response = self.client.get('/api/scores/?game__level=advanced&game__length=10&game__media=images&game__country=NL')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        rankings = [r['ranking'] for r in results]
        expected = list(range(1, len(rankings) + 1))
        self.assertEqual(rankings, expected, 'Ranking should be 1, 2, 3, ...')

    def test_scores_filter_by_level(self):
        response = self.client.get('/api/scores/?game__level=advanced')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data['results']:
            self.assertEqual(item['level'], 'advanced')

    def test_scores_filter_by_country(self):
        response = self.client.get('/api/scores/?game__country=NL')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data['results']:
            self.assertEqual(item['country']['code'], 'NL')

    def test_scores_page_size_100(self):
        response = self.client.get('/api/scores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 100)
