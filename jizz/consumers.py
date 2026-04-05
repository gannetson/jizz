"""
Multiplayer quiz WebSocket consumer (Django Channels).

URL: ws(s)://<host>/mpg/<game_token>
Each connection is scoped to one game group `quiz_<game_token>`.

Client -> server actions: join_game, start_game, next_question, submit_answer, rematch, end_game.
Server -> client: update_players, new_question, game_started, game_updated, game_ended, answer_checked, etc.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


def _as_int(value, field_name: str):
    """Coerce JSON number or numeric string for ORM / comparisons."""
    if value is None:
        raise ValueError(f"missing {field_name}")
    if isinstance(value, bool):
        raise ValueError(f"invalid {field_name}")
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    try:
        return int(value)
    except (TypeError, ValueError) as e:
        raise ValueError(f"invalid {field_name}") from e


class QuizConsumer(AsyncWebsocketConsumer):
    """
    One consumer instance per WebSocket connection.
    All per-connection state must live on self (never rely on class attributes for instance data).
    """

    async def connect(self):
        self.game_token = self.scope["url_route"]["kwargs"]["game_token"]
        self.game_group_name = f"quiz_{self.game_token}"
        # Player token from the last join_game on this connection (for send_current_answer)
        self._player_token: Optional[str] = None
        await self.channel_layer.group_add(self.game_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        self._player_token = None
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError as e:
            logger.warning("WebSocket JSON parse error: %s data=%s", e, text_data[:200])
            return

        action = data.get("action")
        if not action:
            return

        try:
            if action == "join_game":
                await self._handle_join_game(data)
            elif action == "start_game":
                await self._handle_start_game(data)
            elif action == "next_question":
                await self._handle_next_question(data)
            elif action == "submit_answer":
                await self._handle_submit_answer(data)
            elif action == "rematch":
                await self._handle_rematch(data)
            elif action == "end_game":
                await self._handle_end_game(data)
        except Exception as e:
            logger.exception("WebSocket action %s failed: %s", action, e)
            await self.send(
                text_data=json.dumps(
                    {"action": "error", "message": str(e) or "Server error"}
                )
            )

    # --- Handlers ---

    async def _handle_end_game(self, data):
        """Any player in the game may end the session: finished games broadcast as-is; otherwise force end."""
        from django.core.exceptions import ObjectDoesNotExist

        from .models import Game, Player, PlayerScore
        from .serializers import GameSerializer

        player_token = (data.get("player_token") or "").strip()
        if not player_token:
            await self.send(
                text_data=json.dumps(
                    {"action": "error", "message": "player_token required"}
                )
            )
            return

        def load_game_and_payload():
            game = Game.objects.select_related("host", "country").get(
                token=self.game_token
            )
            player = Player.objects.get(token=player_token)
            PlayerScore.objects.get(player=player, game=game)
            if not game.ended:
                # Close any in-progress question so current-question APIs are consistent.
                game.questions.filter(done=False).update(done=True)
                if not game.ended:
                    game.force_ended = True
                    game.save(update_fields=["force_ended"])
            return GameSerializer(game).data

        try:
            # Use database_sync_to_async (not plain sync_to_async) so ORM runs in a DB-safe
            # thread context; otherwise Django can raise SynchronousOnlyOperation and the
            # client shows "You cannot call this from an async context".
            game_data = await database_sync_to_async(load_game_and_payload)()
        except ObjectDoesNotExist:
            await self.send(
                text_data=json.dumps(
                    {"action": "error", "message": "Game or player not found"}
                )
            )
            return
        except ValueError as e:
            await self.send(
                text_data=json.dumps({"action": "error", "message": str(e)})
            )
            return

        await self.channel_layer.group_send(
            self.game_group_name,
            {"type": "mpg_game_ended", "game": game_data},
        )

    async def _handle_join_game(self, data):
        from jizz.models import PlayerScore, Game, Player

        player_token = (data.get("player_token") or "").strip()
        if not player_token:
            await self.send(
                text_data=json.dumps(
                    {"action": "error", "message": "player_token required"}
                )
            )
            return

        self._player_token = player_token
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        player = await sync_to_async(Player.objects.get)(token=player_token)
        await sync_to_async(PlayerScore.objects.get_or_create)(player=player, game=game)

        await self.channel_layer.group_send(
            self.game_group_name,
            {"type": "player_joined", "player_name": player.name},
        )
        await self._broadcast_players_update()
        await self._send_game_update_to_self()
        await self._send_current_question_to_self()
        await self._send_current_answer_to_self()

    async def _handle_start_game(self, data):
        from .models import Game

        def prepare_start():
            game = Game.objects.get(token=self.game_token)
            # Idempotent: duplicate start_game (e.g. queued WebSocket actions) must not
            # call add_question twice or rounds are skipped with no answers.
            if game.questions.exists():
                return False
            return True

        should_run = await database_sync_to_async(prepare_start)()
        if not should_run:
            logger.info(
                "Ignoring duplicate start_game for game %s (questions already exist)",
                self.game_token,
            )
            return

        await self.send(text_data=json.dumps({"action": "game_started"}))
        await self.channel_layer.group_send(
            self.game_group_name,
            {"type": "game_started"},
        )
        await self._run_next_question()

    async def _handle_next_question(self, data):
        from .models import Game

        def can_advance():
            game = Game.objects.get(token=self.game_token)
            return game.can_advance_to_next_question()

        if not await database_sync_to_async(can_advance)():
            logger.info(
                "Ignoring next_question for game %s (host has not answered current round)",
                self.game_token,
            )
            return
        await self._run_next_question()

    async def _handle_submit_answer(self, data):
        from jizz.models import PlayerScore, Player, Question, Answer, Game
        from jizz.serializers import AnswerSerializer

        try:
            player_token = (data.get("player_token") or "").strip()
            question_id = _as_int(data.get("question_id"), "question_id")
            answer_id = _as_int(data.get("answer_id"), "answer_id")
        except ValueError as e:
            await self.send(
                text_data=json.dumps({"action": "error", "message": str(e)})
            )
            return

        if not player_token:
            await self.send(
                text_data=json.dumps(
                    {"action": "error", "message": "player_token required"}
                )
            )
            return

        player = await sync_to_async(Player.objects.get)(token=player_token)
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        player_score = await sync_to_async(PlayerScore.objects.get)(
            player=player, game=game
        )
        question = await sync_to_async(Question.objects.get)(id=question_id)

        if question.game_id != game.id:
            await self.send(
                text_data=json.dumps(
                    {"action": "error", "message": "Question does not belong to this game"}
                )
            )
            return

        correct = answer_id == question.species_id

        existing = await sync_to_async(
            lambda: Answer.objects.filter(
                player_score=player_score, question=question
            ).first()
        )()
        if existing:
            answer = existing
        else:
            answer = await sync_to_async(Answer.objects.create)(
                answer_id=answer_id,
                player_score=player_score,
                question=question,
                correct=correct,
            )

        serializer = AnswerSerializer(answer, context={"game": question.game})
        answer_data = await sync_to_async(lambda: serializer.data)()
        await self.send(
            text_data=json.dumps({"action": "answer_checked", "answer": answer_data})
        )

        await self._broadcast_players_update()

    async def _handle_rematch(self, data):
        player_token = (data.get("player_token") or "").strip()
        if not player_token:
            await self.send(
                text_data=json.dumps(
                    {"action": "error", "message": "player_token is required for rematch"}
                )
            )
            return
        try:
            from jizz.rematch import create_rematch_game as do_create_rematch

            new_game, player = await database_sync_to_async(do_create_rematch)(
                self.game_token, player_token
            )
            player_name = player.name
            invitation_data = {
                "type": "rematch_invitation",
                "new_game_token": new_game.token,
                "host_name": player_name,
            }
            await self.channel_layer.group_send(self.game_group_name, invitation_data)
            await self.send(
                text_data=json.dumps(
                    {
                        "action": "rematch_invitation",
                        "new_game_token": new_game.token,
                        "host_name": player_name,
                    }
                )
            )
        except Exception as e:
            logger.exception("rematch failed")
            await self.send(
                text_data=json.dumps(
                    {
                        "action": "error",
                        "message": f"Failed to create rematch: {str(e)}",
                    }
                )
            )

    # --- Game flow helpers ---

    async def _run_next_question(self):
        from .models import Game

        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        await sync_to_async(game.add_question)()
        await self._broadcast_current_question()

    async def _broadcast_players_update(self):
        player_data = await self._get_player_data()
        await self.channel_layer.group_send(
            self.game_group_name,
            {"type": "update_players", "players": player_data},
        )

    async def _get_player_data(self):
        from .models import Game
        from .serializers import PlayerScoreSerializer

        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        player_scores = await sync_to_async(
            lambda: list(game.scores.order_by("-score").all())
        )()
        serializer = PlayerScoreSerializer(player_scores, many=True)
        return await sync_to_async(lambda: serializer.data)()

    async def _send_game_update_to_self(self):
        from .models import Game
        from .serializers import GameSerializer

        def get_game_data():
            g = Game.objects.get(token=self.game_token)
            return GameSerializer(g).data

        game_data = await sync_to_async(get_game_data)()
        await self.send(
            text_data=json.dumps({"action": "game_updated", "game": game_data})
        )

    async def _get_current_question(self):
        from .models import Game

        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        return await sync_to_async(lambda: game.question)()

    async def _send_current_question_to_self(self):
        q = await self._serialize_current_question_for_send()
        if not q:
            return
        await self.send(
            text_data=json.dumps({"action": "new_question", "question": q})
        )

    async def _broadcast_current_question(self):
        q = await self._serialize_current_question_for_send()
        if not q:
            return
        await self.channel_layer.group_send(
            self.game_group_name,
            {"type": "new_question", "question": q},
        )

    async def _serialize_current_question_for_send(self):
        from .models import Game
        from .serializers import QuestionSerializer

        question = await self._get_current_question()
        if not question:
            return None
        serializer = QuestionSerializer(question)
        question_data = await sync_to_async(lambda: serializer.data)()
        game = await sync_to_async(Game.objects.get)(token=self.game_token)
        question_data["game"] = {"token": str(game.token)}
        return question_data

    async def _get_current_answer_for_connection(self):
        if not self._player_token:
            return None
        question = await self._get_current_question()
        if not question:
            return None
        from jizz.models import Player, Answer

        player = await sync_to_async(Player.objects.get)(token=self._player_token)
        return await sync_to_async(
            lambda: Answer.objects.filter(
                player_score__player=player, question=question
            ).first()
        )()

    async def _send_current_answer_to_self(self):
        from jizz.serializers import AnswerSerializer

        answer = await self._get_current_answer_for_connection()
        if not answer:
            return
        serializer = AnswerSerializer(
            answer, context={"game": answer.question.game}
        )
        data = await sync_to_async(lambda: serializer.data)()
        if not data:
            return
        await self.send(
            text_data=json.dumps({"action": "answer_checked", "answer": data})
        )

    # --- Channel layer event handlers (type = snake_case method name) ---

    async def update_players(self, event):
        await self.send(
            text_data=json.dumps(
                {"action": "update_players", "players": event["players"]}
            )
        )

    async def player_joined(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "action": "player_joined",
                    "player_name": event["player_name"],
                }
            )
        )

    async def game_started(self, event):
        await self.send(text_data=json.dumps({"action": "game_started"}))

    async def new_question(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "action": "new_question",
                    "question": event["question"],
                }
            )
        )

    async def player_answered(self, event):
        await self.send(
            text_data=json.dumps(
                {"action": "player_answered", "player": event["player"]}
            )
        )

    async def rematch_invitation(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "action": "rematch_invitation",
                    "new_game_token": event["new_game_token"],
                    "host_name": event["host_name"],
                }
            )
        )

    async def mpg_game_ended(self, event):
        await self.send(
            text_data=json.dumps(
                {"action": "game_ended", "game": event["game"]}
            )
        )
