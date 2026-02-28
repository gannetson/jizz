import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import type { Game } from '../api/games';
import type { Player } from '../api/player';
import type { Question, Answer, MultiPlayer } from '../types/game';
import { getWebSocketUrl } from '../api/config';

type GameWebSocketContextType = {
  players: MultiPlayer[];
  question: Question | undefined;
  answer: Answer | undefined;
  startGame: () => void;
  nextQuestion: () => void;
  submitAnswer: (payload: { question: Question; answer: Species }) => void;
  joinGame: (game: Game | null, player: Player | null, setGame: (g: Game | null) => void) => void;
  clearQuestion: () => void;
  connected: boolean;
};

type Species = { id: number; name?: string; name_nl?: string; name_latin?: string; name_translated?: string };

const GameWebSocketContext = createContext<GameWebSocketContextType | undefined>(undefined);

export function GameWebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);
  const [players, setPlayers] = useState<MultiPlayer[]>([]);
  const [question, setQuestion] = useState<Question | undefined>(undefined);
  const [answer, setAnswer] = useState<Answer | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const playerTokenRef = useRef<string>('');
  const setGameRef = useRef<((g: Game | null) => void) | null>(null);
  const gameTokenRef = useRef<string>('');

  const sendAction = useCallback(
    (payload: Record<string, unknown>) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    },
    [socket]
  );

  const startGame = useCallback(() => {
    sendAction({ action: 'start_game', player_token: playerTokenRef.current });
  }, [sendAction]);

  const nextQuestion = useCallback(() => {
    sendAction({ action: 'next_question', player_token: playerTokenRef.current });
  }, [sendAction]);

  const submitAnswer = useCallback(
    (payload: { question: Question; answer: Species }) => {
      sendAction({
        action: 'submit_answer',
        player_token: playerTokenRef.current,
        question_id: payload.question?.id,
        answer_id: payload.answer?.id,
      });
    },
    [sendAction]
  );

  const clearQuestion = useCallback(() => {
    setQuestion(undefined);
    setAnswer(undefined);
  }, []);

  const connectSocket = useCallback((game: Game, player: Player, setGame: (g: Game | null) => void) => {
    if (!game?.token || !player?.token) return;
    playerTokenRef.current = player.token;
    setGameRef.current = setGame;
    gameTokenRef.current = game.token;

    const url = getWebSocketUrl(`/mpg/${game.token}`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          action: 'join_game',
          player_token: player.token,
          language_code: player.language || 'en',
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.action) {
          case 'update_players':
            setPlayers(Array.isArray(message.players) ? message.players : []);
            break;
          case 'new_question':
            setAnswer(undefined);
            if (message.question && message.question.game?.token === gameTokenRef.current) {
              setQuestion(message.question as Question);
            }
            break;
          case 'game_started':
            break;
          case 'game_updated':
            if (message.game?.token === gameTokenRef.current && setGameRef.current) {
              setGameRef.current(message.game as Game);
            }
            break;
          case 'answer_checked':
            setAnswer(message.answer as Answer);
            break;
          default:
            break;
        }
      } catch (_) {}
    };

    ws.onerror = () => setConnected(false);
    ws.onclose = () => {
      setConnected(false);
      setSocket(undefined);
    };

    setSocket(ws);
  }, []);

  const joinGame = useCallback(
    (game: Game | null, player: Player | null, setGame: (g: Game | null) => void) => {
      if (socket) {
        socket.close();
        setSocket(undefined);
      }
      setQuestion(undefined);
      setAnswer(undefined);
      setPlayers([]);
      if (game && player && game.token && player.token) {
        connectSocket(game, player, setGame);
      }
    },
    [connectSocket, socket]
  );

  return (
    <GameWebSocketContext.Provider
      value={{
        players,
        question,
        answer,
        startGame,
        nextQuestion,
        submitAnswer,
        joinGame,
        clearQuestion,
        connected,
      }}
    >
      {children}
    </GameWebSocketContext.Provider>
  );
}

export function useGameWebSocket() {
  const ctx = useContext(GameWebSocketContext);
  if (!ctx) throw new Error('useGameWebSocket must be used within GameWebSocketProvider');
  return ctx;
}
