import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

class QuizConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for multiplayer game communication.
    
    Handles real-time communication for multiplayer games including:
    - Player joining/leaving
    - Game start/stop
    - Question broadcasting
    - Answer submission
    - Score updates
    - Rematch invitations
    
    WebSocket URL: /mpg/{game_token}/
    
    Actions:
    - join_game: Player joins the game
    - start_game: Host starts the game (generates first question)
    - submit_answer: Player submits answer to current question
    - next_question: Advance to next question (when all players answered)
    - rematch: Host creates a rematch game
    
    Events:
    - update_players: Player list updated
    - new_question: New question available
    - answer_checked: Answer processed
    - game_started: Game has started
    - game_updated: Game state changed
    - rematch_invitation: Rematch game created
    
    See docs/GAME_LIFECYCLE.md for complete documentation.
    """
    game_token = ''
    game_group_name = ''
    game = None
    player = None

    async def get_player_data(self):
        from .models import Game
        from .serializers import PlayerScoreSerializer
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        player_scores = await sync_to_async(lambda: list(game.scores.order_by('-score').all()))()
        serializer = PlayerScoreSerializer(player_scores, many=True)
        players_data = await sync_to_async(lambda: serializer.data)()
        return players_data

    async def send_game_update(self):
        from .models import Game
        from .serializers import GameSerializer
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        serializer = GameSerializer(game)
        game_data = await sync_to_async(lambda: serializer.data)()
        await self.send(text_data=json.dumps({
            'action': 'game_updated',
            'game': game_data
        }))

    async def send_players_update(self, everyone):
        player_data = await self.get_player_data()
        if everyone:
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'update_players',
                    'players': player_data
                }
            )
        else:
            await self.send(text_data=json.dumps({
                'action': 'update_players',
                'players': player_data
            }))

    async def get_current_question(self):
        from .models import Game
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        # Use game.question property which returns the current undone question
        # This ensures players joining after game start get the active question
        return await sync_to_async(lambda: game.question)()

    async def get_current_answer(self):
        question = await self.get_current_question()
        if not question:
            return None
        return await sync_to_async(lambda: question.answers.filter(player_score__player=self.player).first)()

    async def send_current_answer(self):
        from .serializers import AnswerSerializer
        answer = await self.get_current_answer()
        if not answer:
            return None
        serializer = AnswerSerializer(answer)
        data = await sync_to_async(lambda: serializer.data)()
        if not data:
            return None
        await self.send(
            text_data=json.dumps({
                'action': 'answer_checked',
                'answer': data
            })
        )

    async def send_current_question(self, everyone):
        """
        Send the current question to player(s).
        
        Args:
            everyone: If True, broadcast to all players in game group.
                     If False, send only to this connection.
        
        The question data includes the game token so the frontend can
        validate that the question belongs to the current game.
        This prevents old questions from previous games from being displayed.
        """
        from .serializers import QuestionSerializer
        from .models import Game
        question = await self.get_current_question()
        if not question:
            return None
        serializer = QuestionSerializer(question)
        question_data = await sync_to_async(lambda: serializer.data)()
        # Add game token to question data so frontend can verify it belongs to current game
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        question_data['game'] = {'token': game.token}
        if everyone:
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'new_question',
                    'question': question_data
                }
            )
        else:
            await self.send(
                text_data=json.dumps({
                    'action': 'new_question',
                    'question': question_data
                })
            )

    async def next_question(self):
        from .models import Game
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        await sync_to_async(game.add_question)()
        await self.send_current_question(True)

    async def connect(self):
        self.game_token = self.scope['url_route']['kwargs']['game_token']
        self.game_group_name = f'quiz_{self.game_token}'
        await self.channel_layer.group_add(self.game_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)

    async def receive(self, text_data):
        from .serializers import AnswerSerializer
        from .models import Game, Player, Question, Answer
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON in receive: {e}, text_data: {text_data}")
            return
        
        print(f"Received action: {data.get('action')}")

        # if data['action'] == 'create_game':
        #     game = await sync_to_async(Game.objects.create)(token=self.game_token, multiplayer=True)
        #     player = await sync_to_async(Player.objects.create)(game=game, name=data['player_name'])
        #     await self.send(text_data=json.dumps(
        #         {'message': 'Game created', 'game_code': game.token, 'player_token': str(player.token)}))

        if data['action'] == 'end_game':
            game = await sync_to_async(Game.objects.create)(token=self.game_token, multiplayer=True)
            player = await sync_to_async(Player.objects.create)(game=game, name=data['player_name'])
            await self.send(text_data=json.dumps(
                {'message': 'Game created', 'game_code': game.token, 'player_token': str(player.token)}))

        elif data['action'] == 'join_game':
            from jizz.models import PlayerScore
            game = await sync_to_async(Game.objects.get)(token=self.game_token)
            player = await sync_to_async(Player.objects.get)(token=data['player_token'])
            await sync_to_async(PlayerScore.objects.get_or_create)(
                player=player,
                game=game
            )
            await self.channel_layer.group_send(
                self.game_group_name, {
                    'type': 'player_joined',
                    'player_name': player.name
                }
            )
            await self.send_players_update(True)
            await self.send_game_update()
            await self.send_current_question(False)
            await self.send_current_answer()

        elif data['action'] == 'start_game':
            game = await sync_to_async(Game.objects.get)(token=self.game_token)
            game.started = True
            await sync_to_async(game.save)()
            await self.channel_layer.group_send(
                self.game_group_name, {
                    'type': 'game_started',
                }
            )
            await self.next_question()

        elif data['action'] == 'next_question':
            await self.next_question()

        elif data['action'] == 'submit_answer':
            from jizz.models import PlayerScore
            player = await sync_to_async(Player.objects.get)(token=data['player_token'])
            game = await sync_to_async(Game.objects.get)(token=self.game_token)
            player_score = await sync_to_async(PlayerScore.objects.get)(player=player, game=game)
            question = await sync_to_async(Question.objects.get)(id=data['question_id'])
            correct = data['answer_id'] == question.species_id
            answer = await sync_to_async(Answer.objects.filter(player_score=player_score, question=question).first)()
            if not answer:
                answer = await sync_to_async(Answer.objects.create)(
                    answer_id=data['answer_id'],
                    player_score=player_score,
                    question=question,
                    correct=correct
                )

            serializer = AnswerSerializer(answer)
            answer_data = await sync_to_async(lambda: serializer.data)()
            await self.send(text_data=json.dumps({
                'action': 'answer_checked',
                'answer': answer_data
            }))

            player_data = await self.get_player_data()
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'update_players',
                    'players': player_data
                }
            )

        elif data['action'] == 'rematch':
            # Host requests a rematch - create new game with same specs and notify all players
            try:
                from jizz.models import PlayerScore
                
                # Helper function to create rematch game synchronously
                def create_rematch_game_sync(game_token, player_token):
                    player = Player.objects.get(token=player_token)
                    old_game = Game.objects.get(token=game_token)
                    
                    # Verify player is the host
                    if old_game.host_id != player.id:
                        raise ValueError('Only the host can start a rematch')
                    
                    # Extract all values before creating (to avoid async context issues)
                    country = old_game.country
                    level = old_game.level
                    length = old_game.length
                    media = old_game.media
                    multiplayer = old_game.multiplayer
                    include_rare = old_game.include_rare
                    include_escapes = old_game.include_escapes
                    tax_order = old_game.tax_order
                    tax_family = old_game.tax_family
                    language = old_game.language
                    repeat = old_game.repeat
                    
                    # Create new game with same specifications
                    new_game = Game.objects.create(
                        country=country,
                        level=level,
                        length=length,
                        media=media,
                        host=player,
                        multiplayer=multiplayer,
                        include_rare=include_rare,
                        include_escapes=include_escapes,
                        tax_order=tax_order,
                        tax_family=tax_family,
                        language=language,
                        repeat=repeat
                    )
                    
                    return new_game, player
                
                # Call the sync function in async context
                new_game, player = await sync_to_async(create_rematch_game_sync)(
                    self.game_token,
                    data['player_token']
                )
                
                print(f"Rematch: Created new game {new_game.token} for host {player.name}")
                
                # Send rematch invitation to all players in the game group
                # This includes the host who will auto-join, and other players who will see the join button
                invitation_data = {
                    'type': 'rematch_invitation',
                    'new_game_token': new_game.token,
                    'host_name': player.name
                }
                print(f"Rematch: Sending group message to {self.game_group_name}: {invitation_data}")
                await self.channel_layer.group_send(
                    self.game_group_name,
                    invitation_data
                )
                
                # Also send directly to the requester to ensure they receive it
                direct_message = {
                    'action': 'rematch_invitation',
                    'new_game_token': new_game.token,
                    'host_name': player.name
                }
                print(f"Rematch: Sending direct message: {direct_message}")
                await self.send(text_data=json.dumps(direct_message))
                print(f"Rematch: Messages sent successfully")
            except Exception as e:
                import traceback
                error_msg = f"Error in rematch action: {str(e)}\n{traceback.format_exc()}"
                print(error_msg)
                await self.send(text_data=json.dumps({
                    'action': 'error',
                    'message': f'Failed to create rematch: {str(e)}'
                }))

    async def update_players(self, event):
        message = {
            'action': 'update_players',
            'players': event['players'],
        }
        await self.send(text_data=json.dumps(message))

    async def player_joined(self, event):
        await self.send(text_data=json.dumps(
            {
                'action': 'player_joined',
                'player_name': event['player_name']
            }
        ))

    async def game_started(self, event):
        await self.send(text_data=json.dumps({
            'action': 'game_started',
        }))

    async def new_question(self, event):
        message = {
            'action': 'new_question',
            'question': event['question'],
        }
        await self.send(text_data=json.dumps(message))

    async def player_answered(self, event):
        await self.send(text_data=json.dumps({
            'action': 'player_answered',
            'player': event['player']
        }))

    async def rematch_invitation(self, event):
        print(f"rematch_invitation handler called with event: {event}")
        try:
            message = {
                'action': 'rematch_invitation',
                'new_game_token': event['new_game_token'],
                'host_name': event['host_name']
            }
            print(f"Sending rematch_invitation message: {message}")
            await self.send(text_data=json.dumps(message))
            print(f"rematch_invitation message sent successfully")
        except Exception as e:
            import traceback
            error_msg = f"Error in rematch_invitation handler: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)
