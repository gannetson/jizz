import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentQuestion, type Game } from '../api/games';
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
  sendRematch: () => void;
  rematchInvitation: { new_game_token: string; host_name: string } | null;
  rematchError: string | null;
  clearRematchInvitation: () => void;
  clearRematchError: () => void;
};

type Species = { id: number; name?: string; name_nl?: string; name_latin?: string; name_translated?: string };

function tokensEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

/** Single MPG socket per app — accept question if game token missing or matches (avoids RN/JSON edge cases). */
function questionBelongsToSocketGame(
  question: { game?: { token?: string } } | undefined,
  socketGameToken: string
): boolean {
  if (!question?.id) return false;
  const qt = question.game?.token;
  if (qt == null || String(qt).trim() === '') return true;
  return tokensEqual(qt, socketGameToken);
}

const GameWebSocketContext = createContext<GameWebSocketContextType | undefined>(undefined);

export function GameWebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);
  const [players, setPlayers] = useState<MultiPlayer[]>([]);
  const [question, setQuestion] = useState<Question | undefined>(undefined);
  const [answer, setAnswer] = useState<Answer | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [rematchInvitation, setRematchInvitation] = useState<{ new_game_token: string; host_name: string } | null>(null);
  const [rematchError, setRematchError] = useState<string | null>(null);
  const playerTokenRef = useRef<string>('');
  const setGameRef = useRef<((g: Game | null) => void) | null>(null);
  const gameTokenRef = useRef<string>('');
  const currentSocketRef = useRef<WebSocket | null>(null);
  const languageCodeRef = useRef<string>('en');
  const socketRef = useRef<WebSocket | undefined>(undefined);
  /** Actions sent before the socket is OPEN (e.g. start_game race right after connect). */
  const pendingActionsRef = useRef<Record<string, unknown>[]>([]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const clearRematchInvitation = useCallback(() => setRematchInvitation(null), []);
  const clearRematchError = useCallback(() => setRematchError(null), []);

  const flushPendingActions = useCallback((ws: WebSocket) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const queued = pendingActionsRef.current;
    pendingActionsRef.current = [];
    queued.forEach((payload) => {
      ws.send(
        JSON.stringify({
          ...payload,
          language_code: languageCodeRef.current,
        })
      );
    });
  }, []);

  // Payloads match web app (websocket-context-provider) and backend (jizz/consumers.py).
  const sendAction = useCallback(
    (payload: Record<string, unknown>) => {
      const ws = socketRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            ...payload,
            language_code: languageCodeRef.current,
          })
        );
        return;
      }
      pendingActionsRef.current.push(payload);
    },
    []
  );

  const sendRematch = useCallback(() => {
    setRematchError(null);
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      sendAction({ action: 'rematch', player_token: playerTokenRef.current });
    } else {
      setRematchError('Not connected. Try again.');
    }
  }, [sendAction]);

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
    languageCodeRef.current = player.language || 'en';

    const url = getWebSocketUrl(`/mpg/${game.token}`);
    const ws = new WebSocket(url);
    currentSocketRef.current = ws;

    ws.onopen = () => {
      if (currentSocketRef.current !== ws) return;
      setConnected(true);
      // Same payload as web app: join_game + player_token + language_code
      ws.send(
        JSON.stringify({
          action: 'join_game',
          player_token: player.token,
          language_code: languageCodeRef.current,
        })
      );
      // Deliver any actions queued while CONNECTING (e.g. host taps Start immediately).
      flushPendingActions(ws);
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
            if (questionBelongsToSocketGame(message.question, gameTokenRef.current)) {
              setQuestion(message.question as Question);
            }
            break;
          case 'game_started':
            // Fallback: fetch current question if new_question was missed (e.g. socket reconnect race).
            // Retry with delays: server may still be running add_question after game_started is broadcast.
            {
              const token = gameTokenRef.current;
              const apply = (q: Question | null) => {
                if (token !== gameTokenRef.current) return;
                if (q && questionBelongsToSocketGame(q, token)) {
                  setQuestion(q);
                }
              };
              [0, 280, 900].forEach((delay) => {
                setTimeout(() => {
                  if (token !== gameTokenRef.current) return;
                  getCurrentQuestion(token).then(apply).catch(() => {});
                }, delay);
              });
            }
            break;
          case 'game_updated':
            if (tokensEqual(message.game?.token, gameTokenRef.current) && setGameRef.current) {
              setGameRef.current(message.game as Game);
            }
            break;
          case 'answer_checked':
            setAnswer(message.answer as Answer);
            break;
          case 'rematch_invitation':
            setRematchError(null);
            if (message.new_game_token && message.host_name != null) {
              setRematchInvitation({
                new_game_token: message.new_game_token,
                host_name: message.host_name,
              });
            }
            break;
          case 'error':
            if (message.message) {
              setRematchError(message.message);
            }
            break;
          default:
            break;
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      if (currentSocketRef.current === ws) setConnected(false);
    };
    ws.onclose = () => {
      if (currentSocketRef.current === ws) {
        currentSocketRef.current = null;
        setConnected(false);
        setSocket(undefined);
      }
    };

    setSocket(ws);
  }, [flushPendingActions]);

  const joinGame = useCallback(
    (game: Game | null, player: Player | null, setGame: (g: Game | null) => void) => {
      const canJoin = !!(game && player && game.token && player.token);
      if (canJoin) {
        setGameRef.current = setGame;
        // Avoid closing a healthy socket (React Strict Mode double-mount, duplicate effects).
        // Closing here drops in-flight new_question when the host starts.
        const wsBusy =
          socket &&
          (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING);
        if (
          wsBusy &&
          tokensEqual(gameTokenRef.current, game.token) &&
          tokensEqual(playerTokenRef.current, player.token)
        ) {
          return;
        }
      }
      if (socket) {
        pendingActionsRef.current = [];
        currentSocketRef.current = null;
        socket.close();
        setSocket(undefined);
      }
      setQuestion(undefined);
      setAnswer(undefined);
      setPlayers([]);
      if (canJoin && game && player) {
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
        sendRematch,
        rematchInvitation,
        rematchError,
        clearRematchInvitation,
        clearRematchError,
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
