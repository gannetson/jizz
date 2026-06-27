from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from jizz.models import (
    Answer,
    Country,
    CountrySpecies,
    Game,
    Player,
    PlayerScore,
    Question,
    QuestionOption,
    Species,
    TaxonomicFamily,
    TaxonomicGenus,
    TaxonomicOrder,
    UserProfile,
)
from jizz.game_question_selection import species_practice_pool_ids
from jizz.quiz_mistake_stats import (
    get_user_confusion_pair_rows,
    get_user_species_mistake_rows,
)
from media.models import Media

User = get_user_model()


class UserMistakeStatsTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code="TS", name="Trouble Spots")
        self.user = User.objects.create_user(username="troubleuser", password="pass")
        UserProfile.objects.create(user=self.user, country=self.country, language="en")
        self.player = Player.objects.create(user=self.user, name="Trouble", language="en")

        self.sp_a = Species.objects.create(name="Alpha", name_latin="Alpha a", code="TA01")
        self.sp_b = Species.objects.create(name="Beta", name_latin="Beta b", code="TB02")
        for sp in (self.sp_a, self.sp_b):
            CountrySpecies.objects.create(country=self.country, species=sp, status="native")
            Media.objects.create(
                species=sp,
                type="image",
                url=f"https://example.com/{sp.code}.jpg",
                source="test",
            )

        self.game = Game.objects.create(
            country=self.country,
            level="beginner",
            length=5,
            media="images",
            host=self.player,
        )
        self.score = PlayerScore.objects.create(player=self.player, game=self.game)

        self.q1 = Question.objects.create(game=self.game, species=self.sp_a, number=0, sequence=1)
        QuestionOption.objects.create(question=self.q1, species=self.sp_a, order=1)
        Answer.objects.create(
            player_score=self.score,
            question=self.q1,
            answer=self.sp_b,
            correct=False,
        )
        Answer.objects.create(
            player_score=self.score,
            question=self.q1,
            answer=self.sp_a,
            correct=True,
        )

        self.q2 = Question.objects.create(game=self.game, species=self.sp_b, number=0, sequence=2)
        QuestionOption.objects.create(question=self.q2, species=self.sp_b, order=1)
        Answer.objects.create(
            player_score=self.score,
            question=self.q2,
            answer=self.sp_a,
            correct=False,
        )

    def test_user_species_mistake_rows_target_based(self):
        rows = {r["species_id"]: r for r in get_user_species_mistake_rows(self.user.id, "TS")}
        self.assertIn(self.sp_a.id, rows)
        self.assertEqual(rows[self.sp_a.id]["times_shown"], 2)
        self.assertEqual(rows[self.sp_a.id]["wrongly_answered"], 1)
        self.assertEqual(rows[self.sp_a.id]["correctly_answered"], 1)
        self.assertAlmostEqual(rows[self.sp_a.id]["correct_rate"], 50.0)
        self.assertAlmostEqual(rows[self.sp_a.id]["error_rate"], 50.0)
        self.assertNotIn(self.sp_b.id, rows)

    def test_user_confusion_pair_rows(self):
        rows = get_user_confusion_pair_rows(self.user.id, "TS")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["total_wrong"], 2)
        low_id, high_id = sorted([self.sp_a.id, self.sp_b.id])
        self.assertEqual(rows[0]["low_id"], low_id)
        self.assertEqual(rows[0]["high_id"], high_id)


class PracticeApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.create(code="PR", name="Practice")
        self.user = User.objects.create_user(username="practiceuser", password="pass")
        UserProfile.objects.create(user=self.user, country=self.country, language="en")

        self.sp_low = Species.objects.create(name="Low", name_latin="Low l", code="PL01")
        self.sp_high = Species.objects.create(name="High", name_latin="High h", code="PH02")
        for sp in (self.sp_low, self.sp_high):
            CountrySpecies.objects.create(country=self.country, species=sp, status="native")
            Media.objects.create(
                species=sp,
                type="image",
                url=f"https://example.com/{sp.code}.jpg",
                source="test",
            )

        low_id, high_id = sorted([self.sp_low.id, self.sp_high.id])
        self.low_id = low_id
        self.high_id = high_id

    def test_trouble_spots_requires_auth(self):
        response = self.client.get(reverse("practice-trouble-spots"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_start_pair_practice_creates_two_option_game(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("practice-confusion-pair-start"),
            {
                "low_id": self.low_id,
                "high_id": self.high_id,
                "country_code": "PR",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["game"]["game_type"], "pair_practice")
        self.assertEqual(data["game"]["length"], 20)
        self.assertIn("player_token", data)

        game = Game.objects.get(token=data["game"]["token"])
        question = game.questions.first()
        self.assertIsNotNone(question)
        self.assertEqual(question.options.count(), 2)

    def test_pair_practice_excluded_from_scores(self):
        player = Player.objects.create(user=self.user, name="Practice", language="en")
        game = Game.objects.create(
            country=self.country,
            level="beginner",
            length=20,
            media="images",
            game_type=Game.GAME_TYPE_PAIR_PRACTICE,
            pair_species_low_id=self.low_id,
            pair_species_high_id=self.high_id,
            host=player,
        )
        PlayerScore.objects.create(player=player, game=game, score=9999)

        response = self.client.get("/api/scores/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r["id"] for r in response.json()["results"]]
        self.assertNotIn(
            PlayerScore.objects.get(player=player, game=game).id,
            ids,
        )


class SpeciesPracticeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.create(code="SP", name="Species Practice")
        self.user = User.objects.create_user(username="speciespractice", password="pass")
        UserProfile.objects.create(user=self.user, country=self.country, language="en")

        order = TaxonomicOrder.objects.create(
            name_latin='Passeriformes', name_en='Passeriformes', name_nl='Passeriformes',
        )
        family = TaxonomicFamily.objects.create(
            name_latin='Parulidae', name_en='Parulidae', name_nl='Parulidae', taxonomic_order=order,
        )
        genus = TaxonomicGenus.objects.create(
            name_latin='Setophaga', name_en='Setophaga', name_nl='Setophaga', taxonomic_family=family,
        )

        self.focus = Species.objects.create(
            name='Yellow Warbler',
            name_latin='Setophaga petechia',
            code='yelwar',
            taxonomic_order=order,
            taxonomic_family=family,
            taxonomic_genus=genus,
            tax_ordering=500.0,
        )
        self.related = Species.objects.create(
            name='Magnolia Warbler',
            name_latin='Setophaga magnolia',
            code='magwar',
            taxonomic_order=order,
            taxonomic_family=family,
            taxonomic_genus=genus,
            tax_ordering=501.0,
        )
        self.unrelated = Species.objects.create(
            name='Mallard',
            name_latin='Anas platyrhynchos',
            code='mallar',
            tax_ordering=100.0,
        )

        for sp in (self.focus, self.related, self.unrelated):
            CountrySpecies.objects.create(country=self.country, species=sp, status='native')
            Media.objects.create(
                species=sp,
                type='image',
                url=f'https://example.com/{sp.code}.jpg',
                source='test',
            )

    def test_species_practice_pool_includes_focus_and_genus(self):
        game = Game(
            country=self.country,
            level='advanced',
            media='images',
            focus_species_id=self.focus.id,
        )
        pool = species_practice_pool_ids(game)
        self.assertIn(self.focus.id, pool)
        self.assertIn(self.related.id, pool)
        self.assertNotIn(self.unrelated.id, pool)

    def test_start_species_practice_creates_advanced_game(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse('practice-species-start'),
            {'species_id': self.focus.id, 'country_code': 'SP'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['game']['game_type'], 'species_practice')
        self.assertEqual(data['game']['level'], 'advanced')
        self.assertEqual(data['game']['length'], 20)

        game = Game.objects.get(token=data['game']['token'])
        question = game.questions.first()
        self.assertIsNotNone(question)
        self.assertEqual(question.options.count(), 5)
        option_ids = set(question.options.values_list('species_id', flat=True))
        self.assertTrue(option_ids.issubset({self.focus.id, self.related.id}))

    def test_species_practice_excluded_from_scores(self):
        player = Player.objects.create(user=self.user, name='Practice', language='en')
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=20,
            media='images',
            game_type=Game.GAME_TYPE_SPECIES_PRACTICE,
            focus_species_id=self.focus.id,
            host=player,
        )
        PlayerScore.objects.create(player=player, game=game, score=9999)

        response = self.client.get('/api/scores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.json()['results']]
        self.assertNotIn(
            PlayerScore.objects.get(player=player, game=game).id,
            ids,
        )
