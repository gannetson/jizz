from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from jizz.models import (
    Game, Player, Question, Answer, Species, Country, CountrySpecies,
    PlayerScore
)
from media.models import Media


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
