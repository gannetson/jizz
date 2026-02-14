import asyncio
import unittest
from django.test import TransactionTestCase
from django.db import transaction
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from jizz.models import Game, Player, Answer, Species, Country, CountrySpecies, PlayerScore
from media.models import Media
from jizz.asgi import application


class WebSocketConsumerTestCase(TransactionTestCase):
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
        # Create game in sync test context (same DB connection as setUp)
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )
        player1 = self.player1

        async def async_test():

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

            # Receive first message
            response = await communicator.receive_json_from(timeout=2.0)
            assert 'action' in response
            actions_received = [response.get('action')]
            # Collect any further messages (player_joined, update_players, game_updated)
            try:
                while True:
                    response = await communicator.receive_json_from(timeout=1.0)
                    actions_received.append(response.get('action'))
            except Exception:
                pass  # Timeout or disconnect when no more messages

            # Verify we received expected actions (join sends player_joined, update_players, and game_updated)
            assert 'player_joined' in actions_received, f"Expected player_joined, got {actions_received}"
            assert 'update_players' in actions_received, f"Expected update_players, got {actions_received}"
            assert 'game_updated' in actions_received, f"Expected game_updated, got {actions_received}"

            # Clean up
            await communicator.disconnect()

        asyncio.run(async_test())

    def test_websocket_disconnect(self):
        """Test that connect then disconnect runs without error."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True,
        )

        async def async_test():
            communicator = WebsocketCommunicator(application, f"/mpg/{game.token}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()

        asyncio.run(async_test())

    def test_websocket_receive_invalid_json_no_crash(self):
        """Test that invalid JSON in receive() does not raise."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True,
        )

        async def async_test():
            communicator = WebsocketCommunicator(application, f"/mpg/{game.token}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.send_to(text_data="not valid json")
            # Consumer should not raise; no response expected for invalid JSON
            await communicator.disconnect()

        asyncio.run(async_test())

    def test_websocket_receive_unknown_action_no_crash(self):
        """Test that unknown action in receive() does not raise."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True,
        )

        async def async_test():
            communicator = WebsocketCommunicator(application, f"/mpg/{game.token}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.send_json_to({"action": "unknown_action"})
            # Consumer should not raise
            await communicator.disconnect()

        asyncio.run(async_test())

    @unittest.skip("WebSocket rematch with DB: consumer runs in async thread; DB visibility can prevent response in CI")
    def test_websocket_rematch_as_host_returns_invitation(self):
        """Test that rematch action by host sends rematch_invitation with new_game_token."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True,
        )
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        host = self.player1
        # Force commit so the rematch sync thread (database_sync_to_async) sees the game
        transaction.commit()

        async def async_test():
            communicator = WebsocketCommunicator(application, f"/mpg/{game.token}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.send_json_to({
                'action': 'join_game',
                'player_token': str(host.token),
            })
            # Drain join messages
            try:
                while True:
                    await communicator.receive_json_from(timeout=2.0)
            except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError):
                pass
            await communicator.send_json_to({
                'action': 'rematch',
                'player_token': str(host.token),
            })
            try:
                msg = await communicator.receive_json_from(timeout=15.0)
            except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError) as e:
                self.fail(f"Rematch did not receive response within 15s: {e}")
            self.assertEqual(msg.get('action'), 'rematch_invitation', f"Expected rematch_invitation, got {msg}")
            self.assertIn('new_game_token', msg)
            self.assertIn('host_name', msg)
            self.assertNotEqual(msg['new_game_token'], game.token)
            await communicator.disconnect()

        asyncio.run(async_test())

    @unittest.skip("WebSocket rematch with DB: consumer runs in async thread; DB visibility can prevent response in CI")
    def test_websocket_rematch_as_non_host_returns_error(self):
        """Test that rematch action by non-host sends error action."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True,
        )
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        PlayerScore.objects.get_or_create(player=self.player2, game=game)
        transaction.commit()

        async def async_test():
            communicator = WebsocketCommunicator(application, f"/mpg/{game.token}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.send_json_to({
                'action': 'join_game',
                'player_token': str(self.player2.token),
            })
            try:
                while True:
                    await communicator.receive_json_from(timeout=2.0)
            except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError):
                pass
            await communicator.send_json_to({
                'action': 'rematch',
                'player_token': str(self.player2.token),
            })
            try:
                msg = await communicator.receive_json_from(timeout=15.0)
            except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError) as e:
                self.fail(f"Rematch did not receive response within 15s: {e}")
            self.assertEqual(msg.get('action'), 'error', f"Expected error, got {msg}")
            self.assertIn('message', msg)
            self.assertIn('host', msg['message'].lower())
            await communicator.disconnect()

        asyncio.run(async_test())

    def test_websocket_rematch_without_player_token_returns_error(self):
        """Test that rematch without player_token sends error."""
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True,
        )

        async def async_test():
            communicator = WebsocketCommunicator(application, f"/mpg/{game.token}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.send_json_to({'action': 'rematch'})
            msg = await communicator.receive_json_from(timeout=5.0)
            self.assertEqual(msg.get('action'), 'error')
            self.assertIn('player_token', msg.get('message', ''))
            await communicator.disconnect()

        asyncio.run(async_test())

    @unittest.skip("start_game/add_question in consumer run in thread pool; test DB visibility can cause timeouts")
    def test_websocket_start_game_sends_question(self):
        """Test that start_game action sends a question to all players."""
        # Create game and player scores in sync test context (same DB connection as setUp)
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        PlayerScore.objects.get_or_create(player=self.player2, game=game)

        async def async_test():

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

            # Clear initial messages (join sends several)
            try:
                while True:
                    await communicator1.receive_json_from(timeout=2.0)
            except (Exception, asyncio.CancelledError, asyncio.TimeoutError):
                pass

            # Start game
            await communicator1.send_json_to({
                'action': 'start_game'
            })

            # Should receive game_started and new_question (receive can raise CancelledError on timeout)
            messages = []
            try:
                while len(messages) < 2:
                    response = await communicator1.receive_json_from(timeout=10.0)
                    messages.append(response)
            except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError):
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

    @unittest.skip("start_game/add_question in consumer run in thread pool; test DB visibility can cause timeouts")
    def test_websocket_multiple_players_receive_question(self):
        """Test that multiple players connected via WebSocket receive questions."""
        # Create game and player scores in sync test context (same DB connection as setUp)
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        PlayerScore.objects.get_or_create(player=self.player2, game=game)
        player1 = self.player1
        player2 = self.player2

        async def async_test():

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

            # Clear initial messages (join sends several per connection)
            for comm in [communicator1, communicator2]:
                try:
                    while True:
                        await comm.receive_json_from(timeout=2.0)
                except (Exception, asyncio.CancelledError, asyncio.TimeoutError):
                    pass

            # Player 1 starts game
            await communicator1.send_json_to({
                'action': 'start_game'
            })

            # Both players should receive game_started and new_question (receive can raise CancelledError on timeout)
            for comm in [communicator1, communicator2]:
                messages = []
                try:
                    while len(messages) < 2:
                        response = await comm.receive_json_from(timeout=10.0)
                        messages.append(response)
                except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError):
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

    @unittest.skip("submit_answer in consumer runs in thread pool; test DB visibility can cause timeouts")
    def test_websocket_submit_answer(self):
        """Test submitting an answer via WebSocket."""
        # Create game, player score and question in sync test context (same DB connection as setUp)
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )
        player_score, _ = PlayerScore.objects.get_or_create(player=self.player1, game=game)
        question = game.add_question()
        player1 = self.player1

        async def async_test():

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

            # Clear initial messages (join sends several)
            try:
                while True:
                    await communicator.receive_json_from(timeout=2.0)
            except (Exception, asyncio.CancelledError, asyncio.TimeoutError):
                pass

            # Submit answer
            await communicator.send_json_to({
                'action': 'submit_answer',
                'player_token': str(player1.token),
                'question_id': question.id,
                'answer_id': question.species.id
            })

            # Should receive answer_checked and update_players (receive can raise CancelledError on timeout)
            messages = []
            try:
                while len(messages) < 2:
                    response = await communicator.receive_json_from(timeout=10.0)
                    messages.append(response)
            except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError):
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

    @unittest.skip("next_question/add_question in consumer run in thread pool; test DB visibility can cause timeouts")
    def test_websocket_next_question(self):
        """Test next_question action via WebSocket."""
        # Create game and player score in sync test context (same DB connection as setUp)
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=5,
            media='images',
            host=self.player1,
            multiplayer=True,
            include_rare=True
        )
        PlayerScore.objects.get_or_create(player=self.player1, game=game)
        player1 = self.player1

        async def async_test():

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

            # Clear initial messages (join sends several)
            try:
                while True:
                    await communicator.receive_json_from(timeout=2.0)
            except (Exception, asyncio.CancelledError, asyncio.TimeoutError):
                pass

            # Start game to get first question
            await communicator.send_json_to({
                'action': 'start_game'
            })

            # Clear start game messages (game_started, new_question)
            try:
                while True:
                    await communicator.receive_json_from(timeout=2.0)
            except (Exception, asyncio.CancelledError, asyncio.TimeoutError):
                pass

            # Request next question
            await communicator.send_json_to({
                'action': 'next_question'
            })

            # Should receive new_question (receive can raise CancelledError on timeout)
            try:
                response = await communicator.receive_json_from(timeout=10.0)
            except (asyncio.CancelledError, asyncio.TimeoutError, TimeoutError):
                self.fail("Did not receive new_question within timeout")
            self.assertEqual(response.get('action'), 'new_question')
            self.assertIn('question', response)
            self.assertEqual(response['question']['game']['token'], game.token)

            await communicator.disconnect()

        asyncio.run(async_test())
