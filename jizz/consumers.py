import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Game, Player, Question
import random

class QuizConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_code = self.scope['url_route']['kwargs']['game_code']
        self.game_group_name = f'quiz_{self.game_code}'

        # Join the room group
        await self.channel_layer.group_add(self.game_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the room group
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data['action'] == 'create_game':
            # Player one creates a new game
            game = await sync_to_async(Game.objects.create, thread_sensitive=False)(code=self.game_code)
            player = await sync_to_async(Player.objects.create, thread_sensitive=False)(game=game, name=data['player_name'])
            await self.send(text_data=json.dumps({'message': 'Game created', 'game_code': game.code}))

        elif data['action'] == 'join_game':
            # Another player joins the game
            game = Game.objects.get(code=self.game_code)
            player = Player.objects.create(game=game, name=data['player_name'])
            await self.channel_layer.group_send(self.game_group_name, {
                'type': 'player_joined',
                'message': f'{data["player_name"]} joined the game.'
            })

        elif data['action'] == 'start_game':
            # Start the game and send the first question
            game = await sync_to_async(Game.objects.get, thread_sensitive=False)(code=self.game_code)
            questions = list(Question.objects.all())[:game.num_questions]
            random.shuffle(questions)
            await self.channel_layer.group_send(self.game_group_name, {
                'type': 'game_started',
                'questions': [q.text for q in questions]
            })

        elif data['action'] == 'submit_answer':
            # Handle answer submission and scoring
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

    async def player_joined(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message']
        }))

    async def game_started(self, event):
        await self.send(text_data=json.dumps({
            'questions': event['questions']
        }))

    async def answer_submitted(self, event):
        await self.send(text_data=json.dumps({
            'player_name': event['player_name'],
            'score': event['score']
        }))
