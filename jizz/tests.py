from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from jizz.models import (
    Game, Player, Question, Answer, Species, Country, CountrySpecies,
    PlayerScore
)
from media.models import Media
from jizz.consumers import QuizConsumer
from jizz.asgi import application

User = get_user_model()


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


class MultiplayerGameTestCase(TestCase):
    """Test multiplayer game scenarios including WebSocket consumer behavior."""

    def setUp(self):
        """Set up test data for multiplayer games."""
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

        # Create multiple players
        self.player1 = Player.objects.create(
            name='Player 1',
            language='en'
        )
        self.player2 = Player.objects.create(
            name='Player 2',
            language='en'
        )
        self.player3 = Player.objects.create(
            name='Player 3',
            language='en'
        )

    def test_multiple_players_join_game(self):
        """Test that multiple players can join a multiplayer game."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Player 1 joins (host)
        player_score1, created1 = PlayerScore.objects.get_or_create(
            player=self.player1,
            game=game
        )
        self.assertTrue(created1)
        self.assertEqual(player_score1.player, self.player1)
        self.assertEqual(player_score1.game, game)

        # Player 2 joins
        player_score2, created2 = PlayerScore.objects.get_or_create(
            player=self.player2,
            game=game
        )
        self.assertTrue(created2)
        self.assertEqual(player_score2.player, self.player2)
        self.assertEqual(player_score2.game, game)

        # Player 3 joins
        player_score3, created3 = PlayerScore.objects.get_or_create(
            player=self.player3,
            game=game
        )
        self.assertTrue(created3)
        self.assertEqual(player_score3.player, self.player3)
        self.assertEqual(player_score3.game, game)

        # Verify all players are in the game
        self.assertEqual(game.scores.count(), 3)
        self.assertIn(player_score1, game.scores.all())
        self.assertIn(player_score2, game.scores.all())
        self.assertIn(player_score3, game.scores.all())

    def test_multiple_players_receive_question_on_game_start(self):
        """Test that all players receive the first question when game starts."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Create player scores for all players
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        PlayerScore.objects.get_or_create(player=self.player2, game=game)
        PlayerScore.objects.get_or_create(player=self.player3, game=game)

        # Start the game (simulates start_game action)
        # This should create the first question
        question = game.add_question()
        self.assertIsNotNone(question)
        self.assertEqual(question.game, game)
        self.assertFalse(question.done)

        # Verify all players can see the question
        current_question = game.question
        self.assertEqual(current_question.id, question.id)
        self.assertEqual(current_question.game, game)

        # Verify question is accessible to all players
        for player_score in game.scores.all():
            # Each player should be able to answer this question
            self.assertIsNotNone(question)
            self.assertEqual(question.game, game)

    def test_player_joining_after_game_start_receives_current_question(self):
        """Test that a player joining after game starts receives the current question."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Player 1 joins and starts the game
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        PlayerScore.objects.get_or_create(player=self.player2, game=game)

        # Start game - create first question
        question1 = game.add_question()
        self.assertIsNotNone(question1)

        # Player 3 joins AFTER game has started
        player_score3, _ = PlayerScore.objects.get_or_create(
            player=self.player3,
            game=game
        )

        # Player 3 should receive the current question
        current_question = game.question
        self.assertIsNotNone(current_question)
        self.assertEqual(current_question.id, question1.id)
        self.assertEqual(current_question.game, game)
        self.assertFalse(current_question.done)

    def test_multiple_players_answer_same_question(self):
        """Test that multiple players can answer the same question."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Create player scores
        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player1,
            game=game
        )
        player_score2, _ = PlayerScore.objects.get_or_create(
            player=self.player2,
            game=game
        )
        player_score3, _ = PlayerScore.objects.get_or_create(
            player=self.player3,
            game=game
        )

        # Create first question
        question = game.add_question()
        correct_species = question.species

        # Player 1 answers correctly
        answer1 = Answer.objects.create(
            player_score=player_score1,
            question=question,
            answer=correct_species,
            correct=True
        )
        self.assertTrue(answer1.correct)
        self.assertEqual(answer1.player_score, player_score1)

        # Player 2 answers incorrectly
        wrong_species = self.species_list[1] if self.species_list[1] != correct_species else self.species_list[2]
        answer2 = Answer.objects.create(
            player_score=player_score2,
            question=question,
            answer=wrong_species,
            correct=False
        )
        self.assertFalse(answer2.correct)
        self.assertEqual(answer2.player_score, player_score2)

        # Player 3 answers correctly
        answer3 = Answer.objects.create(
            player_score=player_score3,
            question=question,
            answer=correct_species,
            correct=True
        )
        self.assertTrue(answer3.correct)
        self.assertEqual(answer3.player_score, player_score3)

        # Verify all answers are associated with the same question
        self.assertEqual(answer1.question, question)
        self.assertEqual(answer2.question, question)
        self.assertEqual(answer3.question, question)

        # Verify unique constraint works (can't answer twice)
        # This should return the existing answer
        existing_answer = Answer.objects.filter(
            player_score=player_score1,
            question=question
        ).first()
        self.assertIsNotNone(existing_answer)
        self.assertEqual(existing_answer.id, answer1.id)

    def test_player_scores_update_correctly_in_multiplayer(self):
        """Test that player scores update correctly when multiple players answer."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Create player scores
        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player1,
            game=game
        )
        player_score2, _ = PlayerScore.objects.get_or_create(
            player=self.player2,
            game=game
        )

        # Create and answer first question
        question1 = game.add_question()
        correct_species = question1.species

        # Player 1 answers correctly
        answer1 = Answer.objects.create(
            player_score=player_score1,
            question=question1,
            answer=correct_species,
            correct=True
        )
        # Score should be calculated
        self.assertGreater(answer1.score, 0)

        # Player 2 answers incorrectly
        wrong_species = self.species_list[1] if self.species_list[1] != correct_species else self.species_list[2]
        answer2 = Answer.objects.create(
            player_score=player_score2,
            question=question1,
            answer=wrong_species,
            correct=False
        )
        # Incorrect answers have score 0
        self.assertEqual(answer2.score, 0)

        # Refresh player scores
        player_score1.refresh_from_db()
        player_score2.refresh_from_db()

        # Player 1 should have a score > 0
        self.assertGreater(player_score1.score, 0)
        # Player 2 should have score 0
        self.assertEqual(player_score2.score, 0)

        # Create and answer second question
        question2 = game.add_question()
        correct_species2 = question2.species

        # Both players answer correctly this time
        answer1_q2 = Answer.objects.create(
            player_score=player_score1,
            question=question2,
            answer=correct_species2,
            correct=True
        )
        answer2_q2 = Answer.objects.create(
            player_score=player_score2,
            question=question2,
            answer=correct_species2,
            correct=True
        )

        # Refresh scores
        player_score1.refresh_from_db()
        player_score2.refresh_from_db()

        # Both players should have scores now
        self.assertGreater(player_score1.score, answer1.score)
        self.assertGreater(player_score2.score, 0)

    def test_game_question_property_with_multiple_players(self):
        """Test that game.question returns correct question when multiple players are playing."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Create player scores
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        PlayerScore.objects.get_or_create(player=self.player2, game=game)
        PlayerScore.objects.get_or_create(player=self.player3, game=game)

        # Add first question
        question1 = game.add_question()
        self.assertEqual(game.question.id, question1.id)

        # All players answer
        for player_score in game.scores.all():
            Answer.objects.create(
                player_score=player_score,
                question=question1,
                answer=question1.species,
                correct=True
            )
        question1.done = True
        question1.save()

        # game.question should now return None (question is done)
        self.assertIsNone(game.question)

        # Add second question
        question2 = game.add_question()
        self.assertEqual(game.question.id, question2.id)

        # Verify all players see the same question
        for player_score in game.scores.all():
            current_q = game.question
            self.assertIsNotNone(current_q)
            self.assertEqual(current_q.id, question2.id)

    def test_multiple_players_next_question_flow(self):
        """Test the flow of multiple questions with multiple players."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=3,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Create player scores
        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player1,
            game=game
        )
        player_score2, _ = PlayerScore.objects.get_or_create(
            player=self.player2,
            game=game
        )

        # Question 1
        question1 = game.add_question()
        Answer.objects.create(
            player_score=player_score1,
            question=question1,
            answer=question1.species,
            correct=True
        )
        Answer.objects.create(
            player_score=player_score2,
            question=question1,
            answer=question1.species,
            correct=True
        )
        question1.done = True
        question1.save()

        # Question 2
        question2 = game.add_question()
        self.assertEqual(game.question.id, question2.id)
        Answer.objects.create(
            player_score=player_score1,
            question=question2,
            answer=question2.species,
            correct=True
        )
        Answer.objects.create(
            player_score=player_score2,
            question=question2,
            answer=question2.species,
            correct=True
        )
        question2.done = True
        question2.save()

        # Question 3
        question3 = game.add_question()
        self.assertEqual(game.question.id, question3.id)

        # Verify all questions belong to the same game
        self.assertEqual(question1.game, game)
        self.assertEqual(question2.game, game)
        self.assertEqual(question3.game, game)

        # Verify game has 3 questions
        self.assertEqual(game.questions.count(), 3)

    def test_player_joining_after_question_answered_receives_next_question(self):
        """Test that a player joining after a question is answered gets the next question."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Player 1 and 2 join and play
        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player1,
            game=game
        )
        player_score2, _ = PlayerScore.objects.get_or_create(
            player=self.player2,
            game=game
        )

        # Question 1 - both players answer
        question1 = game.add_question()
        Answer.objects.create(
            player_score=player_score1,
            question=question1,
            answer=question1.species,
            correct=True
        )
        Answer.objects.create(
            player_score=player_score2,
            question=question1,
            answer=question1.species,
            correct=True
        )
        question1.done = True
        question1.save()

        # Question 2 is created
        question2 = game.add_question()

        # Player 3 joins AFTER question 1 is done
        player_score3, _ = PlayerScore.objects.get_or_create(
            player=self.player3,
            game=game
        )

        # Player 3 should receive question 2 (current question), not question 1
        current_question = game.question
        self.assertIsNotNone(current_question)
        self.assertEqual(current_question.id, question2.id)
        self.assertNotEqual(current_question.id, question1.id)
        self.assertFalse(current_question.done)

    def test_api_multiple_players_game_lifecycle(self):
        """Test multiplayer game lifecycle through API endpoints."""
        client = APIClient()

        # Create player 2 via API
        response = client.post('/api/player/', {
            'name': 'Player 2',
            'language': 'en'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        player2_token = response.data['token']

        # Create a multiplayer game via API (player 1 is host)
        response = client.post(
            '/api/games/',
            {
                'country': self.country.code,
                'level': 'beginner',
                'length': 3,
                'media': 'images',
                'multiplayer': True,
                'include_rare': True,
                'include_escapes': False
            },
            HTTP_AUTHORIZATION=f'Token {self.player1.token}'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        game_token = response.data['token']
        game_id = Game.objects.get(token=game_token).id

        # Get first question
        response = client.get(f'/api/games/{game_token}/question')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        question1_id = response.data['id']
        question1 = Question.objects.get(id=question1_id)

        # Player 1 answers
        response = client.post(
            '/api/answer/',
            {
                'question_id': question1_id,
                'player_token': self.player1.token,
                'answer_id': question1.species.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Player 2 answers the same question
        response = client.post(
            '/api/answer/',
            {
                'question_id': question1_id,
                'player_token': player2_token,
                'answer_id': question1.species.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify both players have answers
        player_score1 = PlayerScore.objects.get(player__token=self.player1.token, game_id=game_id)
        player_score2 = PlayerScore.objects.get(player__token=player2_token, game_id=game_id)

        answer1 = Answer.objects.get(player_score=player_score1, question=question1)
        answer2 = Answer.objects.get(player_score=player_score2, question=question1)

        self.assertEqual(answer1.question, question1)
        self.assertEqual(answer2.question, question1)
        self.assertTrue(answer1.correct)
        self.assertTrue(answer2.correct)

        # Get second question - both players should see the same question
        response = client.get(f'/api/games/{game_token}/question')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        question2_id = response.data['id']
        question2 = Question.objects.get(id=question2_id)

        # Verify it's a different question
        self.assertNotEqual(question2_id, question1_id)
        self.assertEqual(question2.game.id, game_id)

        # Both players answer question 2
        response = client.post(
            '/api/answer/',
            {
                'question_id': question2_id,
                'player_token': self.player1.token,
                'answer_id': question2.species.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = client.post(
            '/api/answer/',
            {
                'question_id': question2_id,
                'player_token': player2_token,
                'answer_id': question2.species.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify both players have scores
        player_score1.refresh_from_db()
        player_score2.refresh_from_db()
        self.assertGreater(player_score1.score, 0)
        self.assertGreater(player_score2.score, 0)

    def test_get_current_question_returns_active_question(self):
        """Test that get_current_question returns the active (undone) question, not just the last one."""
        # Create a multiplayer game
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )

        # Create player scores
        player_score1, _ = PlayerScore.objects.get_or_create(
            player=self.player1,
            game=game
        )

        # Add first question
        question1 = game.add_question()
        self.assertFalse(question1.done)

        # Answer question 1
        Answer.objects.create(
            player_score=player_score1,
            question=question1,
            answer=question1.species,
            correct=True
        )
        question1.done = True
        question1.save()

        # Add second question
        question2 = game.add_question()
        self.assertFalse(question2.done)

        # Verify game.question returns question2 (active), not question1 (done)
        current_question = game.question
        self.assertIsNotNone(current_question)
        self.assertEqual(current_question.id, question2.id)
        self.assertNotEqual(current_question.id, question1.id)
        self.assertFalse(current_question.done)

        # This tests the fix where get_current_question uses game.question
        # instead of game.questions.last() to ensure players joining after
        # game start get the active question, not a done one


class WebSocketConsumerTestCase(TestCase):
    """Test WebSocket consumer behavior for multiplayer games."""

    def setUp(self):
        """Set up test data for WebSocket tests."""
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

        # Create players
        self.player1 = Player.objects.create(
            name='Player 1',
            language='en'
        )
        self.player2 = Player.objects.create(
            name='Player 2',
            language='en'
        )

    def test_websocket_connect_and_join_game(self):
        """Test WebSocket connection and join_game action."""
        import asyncio
        from channels.testing import ApplicationCommunicator
        
        async def async_test():
            # Get objects in async context
            country = await database_sync_to_async(lambda: self.country)()
            player1 = await database_sync_to_async(lambda: self.player1)()
            
            # Create a multiplayer game
            game = await database_sync_to_async(Game.objects.create)(
                country=country,
                level='beginner',
                length=5,
                media='images',
                host=player1,
                multiplayer=True,
                include_rare=True
            )

            # Connect to WebSocket
            communicator = WebsocketCommunicator(
                application,
                f"/mpg/{game.token}"
            )
            connected, subprotocol = await communicator.connect()
            assert connected, "WebSocket connection failed"

            # Send join_game action
            await communicator.send_json_to({
                'action': 'join_game',
                'player_token': str(player1.token)
            })

            # Receive messages
            response = await communicator.receive_json_from()
            assert 'action' in response
            # Should receive player_joined, update_players, game_updated, and possibly new_question
            actions_received = []
            try:
                while True:
                    response = await communicator.receive_json_from(timeout=0.5)
                    actions_received.append(response.get('action'))
            except Exception:
                pass  # Timeout is expected when no more messages

            # Verify we received expected actions
            assert 'player_joined' in actions_received, f"Expected player_joined, got {actions_received}"
            assert 'update_players' in actions_received, f"Expected update_players, got {actions_received}"
            assert 'game_updated' in actions_received, f"Expected game_updated, got {actions_received}"

            # Clean up
            await communicator.disconnect()
        
        asyncio.run(async_test())

    def test_websocket_start_game_sends_question(self):
        """Test that start_game action sends a question to all players."""
        import asyncio
        
        async def async_test():
            # Get objects in async context
            country = await database_sync_to_async(lambda: self.country)()
            player1 = await database_sync_to_async(lambda: self.player1)()
            
            # Create a multiplayer game
            game = await database_sync_to_async(Game.objects.create)(
                country=country,
                level='beginner',
                length=5,
                media='images',
                host=player1,
                multiplayer=True,
                include_rare=True
            )

            # Create player scores
            await database_sync_to_async(PlayerScore.objects.get_or_create)(
                player=self.player1,
                game=game
            )
            await database_sync_to_async(PlayerScore.objects.get_or_create)(
                player=self.player2,
                game=game
            )

            # Connect player 1
            communicator1 = WebsocketCommunicator(
                application,
                f"/mpg/{game.token}"
            )
            connected, _ = await communicator1.connect()
            assert connected, "WebSocket connection failed"

            # Join game
            await communicator1.send_json_to({
                'action': 'join_game',
                'player_token': str(self.player1.token)
            })

            # Clear initial messages
            try:
                while True:
                    await communicator1.receive_json_from(timeout=0.1)
            except Exception:
                pass

            # Start game
            await communicator1.send_json_to({
                'action': 'start_game'
            })

            # Should receive game_started and new_question
            messages = []
            try:
                while len(messages) < 2:
                    response = await communicator1.receive_json_from(timeout=1.0)
                    messages.append(response)
            except Exception:
                pass

            # Verify we got game_started and new_question
            actions = [msg.get('action') for msg in messages]
            assert 'game_started' in actions, f"Expected game_started, got {actions}"
            assert 'new_question' in actions, f"Expected new_question, got {actions}"

            # Verify question data structure
            question_msg = next((msg for msg in messages if msg.get('action') == 'new_question'), None)
            assert question_msg is not None, "No new_question message received"
            assert 'question' in question_msg
            assert 'game' in question_msg['question']
            assert question_msg['question']['game']['token'] == game.token

            await communicator1.disconnect()
        
        asyncio.run(async_test())

    def test_websocket_multiple_players_receive_question(self):
        """Test that multiple players connected via WebSocket receive questions."""
        import asyncio
        
        async def async_test():
            # Get objects in async context
            country = await database_sync_to_async(lambda: self.country)()
            player1 = await database_sync_to_async(lambda: self.player1)()
            
            # Create a multiplayer game
            game = await database_sync_to_async(Game.objects.create)(
                country=country,
                level='beginner',
                length=5,
                media='images',
                host=player1,
                multiplayer=True,
                include_rare=True
            )

            # Create player scores
            player2 = await database_sync_to_async(lambda: self.player2)()
            await database_sync_to_async(PlayerScore.objects.get_or_create)(
                player=player1,
                game=game
            )
            await database_sync_to_async(PlayerScore.objects.get_or_create)(
                player=player2,
                game=game
            )

            # Connect both players
            communicator1 = WebsocketCommunicator(
                application,
                f"/mpg/{game.token}"
            )
            communicator2 = WebsocketCommunicator(
                application,
                f"/mpg/{game.token}"
            )

            connected1, _ = await communicator1.connect()
            connected2, _ = await communicator2.connect()
            assert connected1, "Player 1 WebSocket connection failed"
            assert connected2, "Player 2 WebSocket connection failed"

            # Both players join
            await communicator1.send_json_to({
                'action': 'join_game',
                'player_token': str(player1.token)
            })
            await communicator2.send_json_to({
                'action': 'join_game',
                'player_token': str(player2.token)
            })

            # Clear initial messages
            for comm in [communicator1, communicator2]:
                try:
                    while True:
                        await comm.receive_json_from(timeout=0.1)
                except Exception:
                    pass

            # Player 1 starts game
            await communicator1.send_json_to({
                'action': 'start_game'
            })

            # Both players should receive game_started and new_question
            for comm in [communicator1, communicator2]:
                messages = []
                try:
                    while len(messages) < 2:
                        response = await comm.receive_json_from(timeout=1.0)
                        messages.append(response)
                except Exception:
                    pass

                actions = [msg.get('action') for msg in messages]
                assert 'game_started' in actions, f"Expected game_started, got {actions}"
                assert 'new_question' in actions, f"Expected new_question, got {actions}"

                # Verify question has game token
                question_msg = next((msg for msg in messages if msg.get('action') == 'new_question'), None)
                assert question_msg is not None, "No new_question message received"
                assert question_msg['question']['game']['token'] == game.token

            await communicator1.disconnect()
            await communicator2.disconnect()
        
        asyncio.run(async_test())

    def test_websocket_submit_answer(self):
        """Test submitting an answer via WebSocket."""
        import asyncio
        
        async def async_test():
            # Get objects in async context
            country = await database_sync_to_async(lambda: self.country)()
            player1 = await database_sync_to_async(lambda: self.player1)()
            
            # Create a multiplayer game
            game = await database_sync_to_async(Game.objects.create)(
                country=country,
                level='beginner',
                length=5,
                media='images',
                host=player1,
                multiplayer=True,
                include_rare=True
            )

            # Create player score
            player_score = await database_sync_to_async(PlayerScore.objects.get_or_create)(
                player=player1,
                game=game
            )[0]

            # Create a question
            question = await database_sync_to_async(game.add_question)()

            # Connect and join
            communicator = WebsocketCommunicator(
                application,
                f"/mpg/{game.token}"
            )
            connected, _ = await communicator.connect()
            assert connected, "WebSocket connection failed"

            await communicator.send_json_to({
                'action': 'join_game',
                'player_token': str(player1.token)
            })

            # Clear initial messages
            try:
                while True:
                    await communicator.receive_json_from(timeout=0.1)
            except Exception:
                pass

            # Submit answer
            await communicator.send_json_to({
                'action': 'submit_answer',
                'player_token': str(player1.token),
                'question_id': question.id,
                'answer_id': question.species.id
            })

            # Should receive answer_checked and update_players
            messages = []
            try:
                while len(messages) < 2:
                    response = await communicator.receive_json_from(timeout=1.0)
                    messages.append(response)
            except Exception:
                pass

            actions = [msg.get('action') for msg in messages]
            assert 'answer_checked' in actions, f"Expected answer_checked, got {actions}"
            assert 'update_players' in actions, f"Expected update_players, got {actions}"

            # Verify answer was created
            answer = await database_sync_to_async(
                lambda: Answer.objects.filter(
                    player_score=player_score,
                    question=question
                ).first()
            )()
            assert answer is not None, "Answer was not created"
            assert answer.correct, "Answer should be correct"

            await communicator.disconnect()
        
        asyncio.run(async_test())

    def test_websocket_next_question(self):
        """Test next_question action via WebSocket."""
        import asyncio
        
        async def async_test():
            # Get the country object (it's created in setUp, but we need to fetch it in async context)
            country = await database_sync_to_async(lambda: self.country)()
            
            # Get player1 in async context
            player1 = await database_sync_to_async(lambda: self.player1)()
            
            # Create a multiplayer game
            game = await database_sync_to_async(Game.objects.create)(
                country=country,
                level='beginner',
                length=5,
                media='images',
                host=player1,
                multiplayer=True,
                include_rare=True
            )

            # Create player score
            await database_sync_to_async(PlayerScore.objects.get_or_create)(
                player=player1,
                game=game
            )

            # Connect and join
            communicator = WebsocketCommunicator(
                application,
                f"/mpg/{game.token}"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)

            await communicator.send_json_to({
                'action': 'join_game',
                'player_token': str(player1.token)
            })

            # Clear initial messages
            try:
                while True:
                    await communicator.receive_json_from(timeout=0.1)
            except Exception:
                pass

            # Start game to get first question
            await communicator.send_json_to({
                'action': 'start_game'
            })

            # Clear start game messages
            try:
                while True:
                    await communicator.receive_json_from(timeout=0.1)
            except Exception:
                pass

            # Request next question
            await communicator.send_json_to({
                'action': 'next_question'
            })

            # Should receive new_question
            response = await communicator.receive_json_from(timeout=1.0)
            self.assertEqual(response.get('action'), 'new_question')
            self.assertIn('question', response)
            self.assertEqual(response['question']['game']['token'], game.token)

            await communicator.disconnect()
        
        asyncio.run(async_test())

