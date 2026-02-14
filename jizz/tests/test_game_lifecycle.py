from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from jizz.models import (
    Game, Player, Question, Answer, Species, Country, CountrySpecies,
    PlayerScore
)
from media.models import Media


class GameLifecycleTestCase(TestCase):
    """Test the complete lifecycle of starting a game, answering questions, and starting a new game."""

    def setUp(self):
        """Set up test data."""
        # Create a country
        self.country, _create = Country.objects.get_or_create(
            code='NL',
            name='Netherlands'
        )

        # Create some species with media
        self.species_list = []
        for i in range(20):
            species = Species.objects.create(
                name=f'Species {i}',
                name_latin=f'Species Latin {i}',
                code=f'SP{i:03d}'
            )
            # Create country species relationship
            CountrySpecies.objects.create(
                country=self.country,
                species=species,
                status='native'
            )
            # Create media for each species
            Media.objects.create(
                species=species,
                type='image',
                url=f'https://example.com/image{i}.jpg',
                source='test'
            )
            self.species_list.append(species)

        # Create a player
        self.player = Player.objects.create(
            name='Test Player',
            language='en'
        )

    def test_start_game_and_answer_questions(self):
        """Test starting a game and answering multiple questions."""
        # Create a game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player,
            include_rare=True
        )

        # Get first question
        question1 = game.question
        self.assertIsNone(question1, "No question should exist initially")

        # Add first question
        question1 = game.add_question()
        self.assertIsNotNone(question1)
        self.assertEqual(question1.game, game)
        self.assertFalse(question1.done)

        # Answer first question
        player_score, _ = PlayerScore.objects.get_or_create(
            player=self.player,
            game=game
        )
        answer1 = Answer.objects.create(
            player_score=player_score,
            question=question1,
            answer=question1.species,
            correct=True
        )
        question1.done = True
        question1.save()

        # Add second question
        question2 = game.add_question()
        self.assertIsNotNone(question2)
        self.assertEqual(question2.game, game)
        self.assertNotEqual(question2.id, question1.id)

        # Verify first question is marked as done
        question1.refresh_from_db()
        self.assertTrue(question1.done)

        # Verify game.question returns the new question
        current_question = game.question
        self.assertEqual(current_question.id, question2.id)
        self.assertFalse(current_question.done)

    def test_start_new_game_after_first_game(self):
        """Test starting a new game after playing one game - this should catch the bug."""
        # Create first game
        game1 = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player,
            include_rare=True
        )

        # Add and answer first question in game1
        question1_game1 = game1.add_question()
        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player,
            game=game1
        )
        answer1 = Answer.objects.create(
            player_score=player_score1,
            question=question1_game1,
            answer=question1_game1.species,
            correct=True
        )
        question1_game1.done = True
        question1_game1.save()

        # Add second question in game1
        question2_game1 = game1.add_question()
        self.assertEqual(question2_game1.game, game1)

        # Now create a NEW game
        game2 = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player,
            include_rare=True
        )

        # Verify games are different
        self.assertNotEqual(game1.token, game2.token)
        self.assertNotEqual(game1.id, game2.id)

        # Get first question for game2
        question1_game2 = game2.add_question()
        self.assertIsNotNone(question1_game2)
        self.assertEqual(question1_game2.game, game2)
        self.assertNotEqual(question1_game2.id, question1_game1.id)
        self.assertNotEqual(question1_game2.id, question2_game1.id)

        # Answer first question in game2
        player_score2, _ = PlayerScore.objects.get_or_create(
            player=self.player,
            game=game2
        )
        answer2 = Answer.objects.create(
            player_score=player_score2,
            question=question1_game2,
            answer=question1_game2.species,
            correct=True
        )
        question1_game2.done = True
        question1_game2.save()

        # Add second question in game2 - THIS IS WHERE THE BUG MIGHT APPEAR
        question2_game2 = game2.add_question()
        
        # CRITICAL TEST: The new question should belong to game2, not game1
        self.assertEqual(question2_game2.game, game2, 
                        "Second question in new game should belong to game2, not game1")
        self.assertNotEqual(question2_game2.game.id, game1.id,
                           "Second question should not belong to game1")
        
        # Verify game2.question returns the correct question
        current_question_game2 = game2.question
        self.assertIsNotNone(current_question_game2)
        self.assertEqual(current_question_game2.id, question2_game2.id)
        self.assertEqual(current_question_game2.game.id, game2.id)

        # Verify game1's questions haven't changed
        game1.refresh_from_db()
        self.assertEqual(game1.questions.count(), 2)
        self.assertEqual(game1.questions.filter(done=True).count(), 1)
        self.assertEqual(game1.questions.filter(done=False).count(), 1)

    def test_api_game_lifecycle(self):
        """Test the game lifecycle through the API endpoints."""
        client = APIClient()

        # Create a game via API
        response = client.post(
            '/api/games/',
            {
                'country': self.country.code,
                'level': 'beginner',
                'length': 5,
                'media': 'images',
                'include_rare': True,
                'include_escapes': False
            },
            HTTP_AUTHORIZATION=f'Token {self.player.token}'
        )
        if response.status_code != status.HTTP_201_CREATED:
            print(f"API Error: {response.status_code}")
            print(f"Response data: {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Response: {response.data}")
        game1_token = response.data['token']
        game1_id = Game.objects.get(token=game1_token).id

        # Get first question
        response = client.get(f'/api/games/{game1_token}/question')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        question1_id = response.data['id']
        question1 = Question.objects.get(id=question1_id)
        self.assertEqual(question1.game.id, game1_id)

        # Answer first question
        response = client.post(
            '/api/answer/',
            {
                'question_id': question1_id,
                'player_token': self.player.token,
                'answer_id': question1.species.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Get second question
        response = client.get(f'/api/games/{game1_token}/question')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        question2_id = response.data['id']
        question2 = Question.objects.get(id=question2_id)
        self.assertEqual(question2.game.id, game1_id)
        self.assertNotEqual(question2_id, question1_id)

        # Create a NEW game via API
        response = client.post(
            '/api/games/',
            {
                'country': self.country.code,
                'level': 'beginner',
                'length': 5,
                'media': 'images',
                'include_rare': True,
                'include_escapes': False
            },
            HTTP_AUTHORIZATION=f'Token {self.player.token}'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        game2_token = response.data['token']
        game2_id = Game.objects.get(token=game2_token).id

        # Verify it's a different game
        self.assertNotEqual(game1_token, game2_token)
        self.assertNotEqual(game1_id, game2_id)

        # Get first question for game2
        response = client.get(f'/api/games/{game2_token}/question')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        question1_game2_id = response.data['id']
        question1_game2 = Question.objects.get(id=question1_game2_id)
        self.assertEqual(question1_game2.game.id, game2_id)
        self.assertNotEqual(question1_game2_id, question1_id)
        self.assertNotEqual(question1_game2_id, question2_id)

        # Answer first question in game2
        response = client.post(
            '/api/answer/',
            {
                'question_id': question1_game2_id,
                'player_token': self.player.token,
                'answer_id': question1_game2.species.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # CRITICAL TEST: Get second question for game2 - should still be game2
        response = client.get(f'/api/games/{game2_token}/question')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        question2_game2_id = response.data['id']
        question2_game2 = Question.objects.get(id=question2_game2_id)
        
        # THIS IS THE KEY ASSERTION - the question should belong to game2
        self.assertEqual(question2_game2.game.id, game2_id,
                        f"BUG DETECTED: Question {question2_game2_id} belongs to game {question2_game2.game.id}, expected {game2_id}")
        self.assertNotEqual(question2_game2.game.id, game1_id,
                           f"BUG DETECTED: Question {question2_game2_id} belongs to old game {game1_id}")

    def test_multiple_games_question_isolation(self):
        """Test that questions from different games are properly isolated."""
        # Create game1
        game1 = Game.objects.create(
            country=self.country,
            level='beginner',
            length=3,
            media='images',
            host=self.player
        )

        # Create game2
        game2 = Game.objects.create(
            country=self.country,
            level='beginner',
            length=3,
            media='images',
            host=self.player
        )

        # Add questions to both games
        q1_g1 = game1.add_question()
        q1_g2 = game2.add_question()

        # Verify questions belong to correct games
        self.assertEqual(q1_g1.game, game1)
        self.assertEqual(q1_g2.game, game2)

        # Answer question in game1
        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player,
            game=game1
        )
        Answer.objects.create(
            player_score=player_score1,
            question=q1_g1,
            answer=q1_g1.species,
            correct=True
        )
        q1_g1.done = True
        q1_g1.save()

        # Answer question in game2
        player_score2, _ = PlayerScore.objects.get_or_create(
            player=self.player,
            game=game2
        )
        Answer.objects.create(
            player_score=player_score2,
            question=q1_g2,
            answer=q1_g2.species,
            correct=True
        )
        q1_g2.done = True
        q1_g2.save()

        # Add second questions
        q2_g1 = game1.add_question()
        q2_g2 = game2.add_question()

        # Verify isolation
        self.assertEqual(q2_g1.game, game1)
        self.assertEqual(q2_g2.game, game2)
        self.assertNotEqual(q2_g1.id, q2_g2.id)

        # Verify game.question returns correct question
        self.assertEqual(game1.question.id, q2_g1.id)
        self.assertEqual(game2.question.id, q2_g2.id)

    def test_game_question_property_returns_correct_question(self):
        """Test that game.question property correctly filters by done=False and game."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player
        )

        # Add first question
        q1 = game.add_question()
        self.assertEqual(game.question.id, q1.id)

        # Mark as done
        q1.done = True
        q1.save()

        # game.question should be None now
        self.assertIsNone(game.question)

        # Add second question
        q2 = game.add_question()
        self.assertEqual(game.question.id, q2.id)

        # Create another game and add question
        game2 = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player
        )
        q1_g2 = game2.add_question()

        # Verify game.question still returns q2, not q1_g2
        self.assertEqual(game.question.id, q2.id)
        self.assertNotEqual(game.question.id, q1_g2.id)
        self.assertEqual(game2.question.id, q1_g2.id)

    def test_add_question_marks_previous_undone_questions(self):
        """Test that add_question marks all undone questions as done."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player
        )

        # Add first question
        q1 = game.add_question()
        self.assertFalse(q1.done)

        # Add second question without marking first as done
        # This should mark q1 as done
        q2 = game.add_question()
        
        q1.refresh_from_db()
        self.assertTrue(q1.done, "Previous question should be marked as done when adding new question")
        self.assertFalse(q2.done)

    def test_complete_game_lifecycle_with_new_game(self):
        """Test complete lifecycle: start game, answer questions, start new game, answer more questions."""
        # Start first game
        game1 = Game.objects.create(
            country=self.country,
            level='beginner',
            length=3,
            media='images',
            host=self.player
        )

        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player,
            game=game1
        )

        # Answer 2 questions in game1
        for i in range(2):
            question = game1.add_question()
            Answer.objects.create(
                player_score=player_score1,
                question=question,
                answer=question.species,
                correct=True
            )
            question.done = True
            question.save()

        # Verify game1 has 2 questions
        self.assertEqual(game1.questions.count(), 2)
        self.assertEqual(game1.questions.filter(done=True).count(), 2)

        # Start NEW game
        game2 = Game.objects.create(
            country=self.country,
            level='beginner',
            length=3,
            media='images',
            host=self.player
        )

        player_score2, _ = PlayerScore.objects.get_or_create(
            player=self.player,
            game=game2
        )

        # Answer first question in game2
        question1_g2 = game2.add_question()
        self.assertEqual(question1_g2.game.id, game2.id)

        Answer.objects.create(
            player_score=player_score2,
            question=question1_g2,
            answer=question1_g2.species,
            correct=True
        )
        question1_g2.done = True
        question1_g2.save()

        # Get second question in game2 - THIS IS WHERE BUG MIGHT APPEAR
        question2_g2 = game2.add_question()
        
        # Verify it belongs to game2
        self.assertEqual(question2_g2.game.id, game2.id,
                        "Second question in new game must belong to game2")
        
        # Verify game1 hasn't changed
        game1.refresh_from_db()
        self.assertEqual(game1.questions.count(), 2,
                        "Game1 should still have only 2 questions")

        # Answer second question in game2
        Answer.objects.create(
            player_score=player_score2,
            question=question2_g2,
            answer=question2_g2.species,
            correct=True
        )
        question2_g2.done = True
        question2_g2.save()

        # Get third question in game2
        question3_g2 = game2.add_question()
        self.assertEqual(question3_g2.game.id, game2.id,
                        "Third question in new game must belong to game2")

        # Final verification: game2 should have 3 questions, all belonging to game2
        game2.refresh_from_db()
        self.assertEqual(game2.questions.count(), 3)
        for q in game2.questions.all():
            self.assertEqual(q.game.id, game2.id,
                            f"Question {q.id} should belong to game2, not game1")
