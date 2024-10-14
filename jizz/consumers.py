import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Game, Player, Question
import random

from .serializers import PlayerSerializer, MultiPlayerSerializer, QuestionSerializer


class QuizConsumer(AsyncWebsocketConsumer):
    game_token = ''
    game_group_name = ''
    game = None

    async def get_players(self):
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        players = await sync_to_async(lambda: list(game.players.all()))()
        serializer = MultiPlayerSerializer(players, many=True)
        players_data = serializer.data

        return players_data

    async def current_question(self):
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        question = await sync_to_async(game.questions.last)()
        serializer = QuestionSerializer(question)
        question_data = await sync_to_async(lambda: serializer.data)()
        await sync_to_async(game.save)()
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'new_question',
                'question': question_data
            }
        )

    async def next_question(self):
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        await sync_to_async(game.add_question)()
        await self.current_question()

    async def connect(self):
        self.game_token = self.scope['url_route']['kwargs']['game_token']
        self.game_group_name = f'quiz_{self.game_token}'
        await self.channel_layer.group_add(self.game_group_name, self.channel_name)
        await self.accept()
        players = await self.get_players()
        await self.send(
            text_data=json.dumps({
                'action': 'update_players',
                'players': players,
            })
        )
        await self.current_question()


    async def disconnect(self, close_code):
        # Leave the room group
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data['action'] == 'create_game':
            game = await sync_to_async(Game.objects.create)(token=self.game_token, multiplayer=True)
            player = await sync_to_async(Player.objects.create)(game=game, name=data['player_name'])
            await self.send(text_data=json.dumps(
                {'message': 'Game created', 'game_code': game.token, 'player_token': str(player.token)}))

        elif data['action'] == 'join_game':
            game = await sync_to_async(Game.objects.get)(token=self.game_token)
            player = await sync_to_async(Player.objects.get)(token=data['player_token'])
            player.game = game
            await sync_to_async(player.save)()
            await self.channel_layer.group_send(
                self.game_group_name, {
                    'type': 'player_joined',
                    'player_name': player.name
                }
            )
            players = await self.get_players()
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'update_players',
                    'players': players
                }
            )

        elif data['action'] == 'start_game':
            # Start the game and send the first question
            game = await sync_to_async(Game.objects.get)(token=self.game_token)
            game.started = True
            await sync_to_async(game.save)()
            await self.channel_layer.group_send(
                self.game_group_name, {
                    'type': 'game_started',
                }
            )
            await self.next_question()

        elif data['action'] == 'submit_answer':
            game = await sync_to_async(Game.objects.get)(token=self.game_token)
            player = Player.objects.get(name=data['player_name'], game__code=self.game_code)
            question = Question.objects.get(id=data['question_id'])
            if data['answer'] == question.correct_answer:
                player.score += 100  # Add 100 points for a correct answer
            player.save()

            await self.channel_layer.group_send(self.game_group_name, {
                'type': 'answer_submitted',
                'player_name': player.name,
                'score': player.score
            })

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

    async def answer_submitted(self, event):
        await self.send(text_data=json.dumps({
            'player_name': event['player_name'],
            'score': event['score']
        }))
