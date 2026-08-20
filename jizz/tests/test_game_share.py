"""Public game result share pages, OG images, and JSON."""

from django.test import Client, TestCase
from rest_framework import status
from rest_framework.test import APIClient

from jizz.models import Country, Game, Player, PlayerScore, Species, CountrySpecies, Answer, Question
from media.models import Media


class GameShareTestCase(TestCase):
    def setUp(self):
        self.country, _ = Country.objects.get_or_create(
            code='NL', defaults={'name': 'Netherlands'}
        )
        self.country.name = 'Netherlands'
        self.country.save(update_fields=['name'])
        self.player = Player.objects.create(name='Ada', language='en')
        self.guest = Player.objects.create(name='Bob', language='en')
        species = Species.objects.create(name='Robin', name_latin='Erithacus', code='ROBIN')
        CountrySpecies.objects.create(country=self.country, species=species, status='native')
        Media.objects.create(species=species, type='image', url='https://example.com/r.jpg', source='test')
        self.species = species

    def _ended_game(self, **kwargs):
        defaults = dict(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
            force_ended=True,
        )
        defaults.update(kwargs)
        game = Game.objects.create(**defaults)
        PlayerScore.objects.create(player=self.player, game=game, score=450)
        PlayerScore.objects.create(player=self.guest, game=game, score=320)
        return game

    def test_share_page_and_og_image_for_ended_game(self):
        game = self._ended_game()
        page = Client().get(f'/g/{game.token}/')
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'og:image')
        self.assertContains(page, f'/g/{game.token}/og.png')
        self.assertContains(page, 'og:image:width')
        self.assertContains(page, 'Ada')
        self.assertContains(page, '450 pts')
        self.assertContains(page, 'Netherlands')
        self.assertContains(page, 'href="/start/"')
        self.assertContains(page, '/images/app-store.png')
        self.assertContains(page, '/images/google-play.png')
        self.assertNotContains(page, self.player.token)
        self.assertNotContains(page, 'email')

        og = Client().get(f'/g/{game.token}/og.png')
        self.assertEqual(og.status_code, 200)
        self.assertEqual(og['Content-Type'], 'image/png')
        self.assertTrue(og.content.startswith(b'\x89PNG'))
        self.assertIn('max-age=600', og.get('Cache-Control', ''))

        public = APIClient().get(f'/api/games/{game.token}/share/')
        self.assertEqual(public.status_code, status.HTTP_200_OK)
        self.assertEqual(public.data['players'][0]['name'], 'Ada')
        self.assertEqual(public.data['players'][0]['score'], 450)
        self.assertNotIn('email', public.data)
        self.assertIn('/g/', public.data['share_url'])

    def test_in_progress_game_is_not_shareable(self):
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=10,
            media='images',
            host=self.player,
        )
        PlayerScore.objects.create(player=self.player, game=game, score=10)
        self.assertEqual(Client().get(f'/g/{game.token}/').status_code, 404)
        self.assertEqual(Client().get(f'/g/{game.token}/og.png').status_code, 404)
        self.assertEqual(
            APIClient().get(f'/api/games/{game.token}/share/').status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_practice_game_is_not_shareable(self):
        game = self._ended_game(game_type=Game.GAME_TYPE_PAIR_PRACTICE)
        self.assertEqual(Client().get(f'/g/{game.token}/').status_code, 404)
        self.assertEqual(
            APIClient().get(f'/api/games/{game.token}/share/').status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_missing_token_is_404(self):
        page = Client().get('/g/notareal/')
        self.assertEqual(page.status_code, 404)
        self.assertContains(page, 'Result not found', status_code=404)

    def test_correct_count_on_share_payload(self):
        game = self._ended_game()
        score = PlayerScore.objects.get(game=game, player=self.player)
        question = Question.objects.create(
            game=game,
            species=self.species,
            sequence=1,
            done=True,
        )
        Answer.objects.create(
            player_score=score,
            question=question,
            answer=self.species,
            correct=True,
            score=50,
        )
        public = APIClient().get(f'/api/games/{game.token}/share/')
        self.assertEqual(public.data['players'][0]['correct_count'], 1)
        self.assertEqual(public.data['players'][0]['correct_label'], '1/10 correct')
