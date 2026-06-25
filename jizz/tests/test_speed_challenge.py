from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from jizz.models import (
    BirdrJourney,
    Country,
    CountrySpecies,
    Game,
    JourneyLevel,
    JourneyStep,
    Player,
    PlayerScore,
    Question,
    QuestionOption,
    Species,
)
from jizz.tests.test_birdr_journey import PNG_1X1, _player_auth
from media.models import Media


class SpeedChallengeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.create(code="SP", name="Speed land")
        self.player = Player.objects.create(name="Speedy", language="en")
        self.species_a = Species.objects.create(name="Bird A", name_latin="Birda a", code="SPA1")
        self.species_b = Species.objects.create(name="Bird B", name_latin="Birdb b", code="SPB2")
        for sp in (self.species_a, self.species_b):
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
            length=3,
            media="images",
            host=self.player,
            speed_seconds=10,
        )
        self.question = Question.objects.create(
            game=self.game,
            species=self.species_a,
            number=0,
            sequence=1,
        )
        QuestionOption.objects.create(question=self.question, species=self.species_a, order=1)
        QuestionOption.objects.create(question=self.question, species=self.species_b, order=2)
        PlayerScore.objects.create(player=self.player, game=self.game)

    def test_timed_out_answer_counts_as_wrong(self):
        response = self.client.post(
            "/api/answer/",
            {
                "question_id": self.question.id,
                "player_token": self.player.token,
                "timed_out": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["correct"])
        self.assertEqual(response.data["species"]["id"], self.species_a.id)

    def test_speed_step_sets_speed_seconds_on_game(self):
        level = JourneyLevel.objects.create(
            sequence=1,
            title="Speed step",
            description="Fast answers",
            icon=SimpleUploadedFile("speed.png", PNG_1X1, content_type="image/png"),
        )
        JourneyStep.objects.create(
            journey_level=level,
            sequence=0,
            step_type="speed",
            level="beginner",
            length=5,
            jokers=2,
            rarity="regular",
            media="images",
            speed_seconds=12,
        )
        journey = BirdrJourney.objects.create(
            player=self.player,
            country=self.country,
            current_sequence=1,
            current_step_sequence=0,
            user=None,
        )
        _player_auth(self.client, self.player)
        response = self.client.post(f"/api/birdr-journey/{journey.id}/start-step/", format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        game = Game.objects.get(token=response.data["journey_game"]["game"]["token"])
        self.assertEqual(game.speed_seconds, 12)
