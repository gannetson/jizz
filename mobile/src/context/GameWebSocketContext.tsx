import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
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
  joinGame: (
    game: Game | null,
    player: Player | null,
    setGame: (g: Game | null) => void,
    options?: { force?: boolean }
  ) => void;
  clearQuestion: () => void;
  endGameSession: () => void;
  connected: boolean;
  sendRematch: () => void;
  rematchInvitation: { new_game_token: string; host_name: string } | null;
  rematchError: string | null;
  clearRematchInvitation: () => void;
  clearRematchError: () => void;
  refreshGameState: (options?: { resyncWs?: boolean; force?: boolean }) => Promise<void>;
};

type Species = { id: number; name?: string; name_nl?: string; name_latin?: string; name_translated?: string };

type TaggedSocket = WebSocket & { gameToken?: string; closedByJoin?: boolean };

function tokensEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

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
  const gameRef = useRef<Game | null>(null);
  const playerRef = useRef<Player | null>(null);
  const currentSocketRef = useRef<WebSocket | null>(null);
  const languageCodeRef = useRef<string>('en');
  const socketRef = useRef<WebSocket | undefined>(undefined);
  const currentQuestionIdRef = useRef<number | undefined>(undefined);
  const gameStartedRef = useRef(false);
  const pendingActionsRef = useRef<Record<string, unknown>[]>([]);
  const isConnectingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const clearRematchInvitation = useCallback(() => setRematchInvitation(null), []);
  const clearRematchError = useCallback(() => setRematchError(null), []);

  const clearQuestion = useCallback(() => {
    setQuestion(undefined);
    setAnswer(undefined);
    currentQuestionIdRef.current = undefined;
  }, []);

  const applyQuestion = useCallback((next: Question | null | undefined, gameToken: string) => {
    if (!next?.id || !questionBelongsToSocketGame(next, gameToken)) return;
    if (next.id !== currentQuestionIdRef.current) {
      setAnswer(undefined);
    }
    setQuestion(next);
    currentQuestionIdRef.current = next.id;
  }, []);

  const fetchCurrentQuestion = useCallback(
    async (gameToken: string, ws: WebSocket | undefined, connectionGameToken: string) => {
      if (ws && currentSocketRef.current !== ws) return;
      try {
        const q = await getCurrentQuestion(gameToken);
        applyQuestion(q, connectionGameToken);
      } catch {
        // ignore — UI keeps existing state
      }
    },
    [applyQuestion]
  );

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

  const closeSocket = useCallback((ws: TaggedSocket | undefined, intentional: boolean) => {
    if (!ws) return;
    if (intentional) {
      ws.closedByJoin = true;
    }
    if (currentSocketRef.current === ws) {
      currentSocketRef.current = null;
    }
    ws.close();
    setSocket(undefined);
    setConnected(false);
  }, []);

  const connectSocket = useCallback(
    (game: Game, player: Player, setGame: (g: Game | null) => void) => {
      if (!game?.token || !player?.token) return;

      playerTokenRef.current = player.token;
      setGameRef.current = setGame;
      gameTokenRef.current = game.token;
      gameRef.current = game;
      playerRef.current = player;
      languageCodeRef.current = player.language || 'en';

      const connectionGameToken = game.token;
      const ws = new WebSocket(getWebSocketUrl(`/mpg/${game.token}`)) as TaggedSocket;
      ws.gameToken = connectionGameToken;
      currentSocketRef.current = ws;
      isConnectingRef.current = true;

      ws.onopen = () => {
        if (currentSocketRef.current !== ws) return;
        isConnectingRef.current = false;
        setConnected(true);
        ws.send(
          JSON.stringify({
            action: 'join_game',
            player_token: player.token,
            language_code: languageCodeRef.current,
          })
        );
        flushPendingActions(ws);
      };

      ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : String(event.data);
          const message = JSON.parse(raw);
          const socketGameToken = ws.gameToken ?? connectionGameToken;
          switch (message.action) {
            case 'update_players':
              setPlayers(Array.isArray(message.players) ? message.players : []);
              break;
            case 'new_question':
              gameStartedRef.current = true;
              if (questionBelongsToSocketGame(message.question, socketGameToken)) {
                applyQuestion(message.question as Question, socketGameToken);
              }
              break;
            case 'game_started':
              gameStartedRef.current = true;
              void fetchCurrentQuestion(connectionGameToken, ws, connectionGameToken);
              [400, 1500, 3500].forEach((delay) => {
                setTimeout(() => {
                  void fetchCurrentQuestion(connectionGameToken, ws, connectionGameToken);
                }, delay);
              });
              break;
            case 'game_updated':
              if (tokensEqual(message.game?.token, connectionGameToken) && setGameRef.current) {
                const updatedGame = message.game as Game;
                setGameRef.current(updatedGame);
                gameRef.current = updatedGame;
                if ((updatedGame.progress ?? 0) > 0) {
                  gameStartedRef.current = true;
                  void fetchCurrentQuestion(connectionGameToken, ws, connectionGameToken);
                }
              }
              break;
            case 'game_ended':
              if (tokensEqual(message.game?.token, connectionGameToken) && setGameRef.current) {
                setGameRef.current(message.game as Game);
                setQuestion(undefined);
                setAnswer(undefined);
                currentQuestionIdRef.current = undefined;
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
        } catch (e) {
          if (__DEV__) {
            console.warn('[GameWebSocket] onmessage parse/handle failed', e);
          }
        }
      };

      ws.onerror = () => {
        if (currentSocketRef.current === ws) setConnected(false);
      };

      ws.onclose = () => {
        if (currentSocketRef.current !== ws) return;
        currentSocketRef.current = null;
        isConnectingRef.current = false;
        setConnected(false);
        setSocket(undefined);
        if (ws.closedByJoin) return;
        scheduleReconnectRef.current?.();
      };

      setSocket(ws);
    },
    [applyQuestion, fetchCurrentQuestion, flushPendingActions]
  );

  const ensureConnection = useCallback(() => {
    const game = gameRef.current;
    const player = playerRef.current;
    const setGame = setGameRef.current;
    if (!game?.token || !player?.token || !setGame) return;

    const ws = socketRef.current as TaggedSocket | undefined;
    if (ws?.readyState === WebSocket.OPEN) return;
    if (ws?.readyState === WebSocket.CONNECTING || isConnectingRef.current) return;

    closeSocket(ws, true);
    connectSocket(game, player, setGame);
  }, [closeSocket, connectSocket]);

  scheduleReconnectRef.current = () => {
    if (reconnectTimerRef.current) return;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      ensureConnection();
    }, 400);
  };

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
      if (payload.action === 'start_game') {
        if (pendingActionsRef.current.some((p) => p.action === 'start_game')) {
          return;
        }
      }
      pendingActionsRef.current.push(payload);
      ensureConnection();
    },
    [ensureConnection]
  );

  const sendRematch = useCallback(() => {
    setRematchError(null);
    sendAction({ action: 'rematch', player_token: playerTokenRef.current });
  }, [sendAction]);

  const startGame = useCallback(() => {
    sendAction({ action: 'start_game', player_token: playerTokenRef.current });
  }, [sendAction]);

  const nextQuestion = useCallback(() => {
    sendAction({ action: 'next_question', player_token: playerTokenRef.current });
  }, [sendAction]);

  const endGameSession = useCallback(() => {
    sendAction({ action: 'end_game', player_token: playerTokenRef.current });
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

  const refreshGameState = useCallback(
    async (options?: { resyncWs?: boolean; force?: boolean }) => {
      const gameToken = gameTokenRef.current;
      const playerToken = playerTokenRef.current;
      if (!gameToken || !playerToken) return;

      if (options?.resyncWs) {
        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              action: 'join_game',
              player_token: playerToken,
              language_code: languageCodeRef.current,
            })
          );
        } else {
          ensureConnection();
        }
      }

      if (!options?.force && !gameStartedRef.current && !currentQuestionIdRef.current) {
        return;
      }

      await fetchCurrentQuestion(gameToken, socketRef.current, gameToken);
    },
    [ensureConnection, fetchCurrentQuestion]
  );

  const joinGame = useCallback(
    (
      game: Game | null,
      player: Player | null,
      setGame: (g: Game | null) => void,
      options?: { force?: boolean }
    ) => {
      const canJoin = !!(game && player && game.token && player.token);
      const sameSession =
        canJoin &&
        tokensEqual(gameTokenRef.current, game.token) &&
        tokensEqual(playerTokenRef.current, player.token);

      if (canJoin) {
        setGameRef.current = setGame;
        gameRef.current = game;
        playerRef.current = player;
      }

      if (canJoin && !options?.force && sameSession) {
        const ws = socketRef.current;
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          return;
        }
      }

      if (!canJoin) {
        if (socketRef.current) {
          pendingActionsRef.current = [];
          closeSocket(socketRef.current as TaggedSocket, true);
        }
        playerTokenRef.current = '';
        gameTokenRef.current = '';
        gameRef.current = null;
        playerRef.current = null;
        setQuestion(undefined);
        setAnswer(undefined);
        setPlayers([]);
        currentQuestionIdRef.current = undefined;
        gameStartedRef.current = false;
        return;
      }

      const replaceSessionState = !sameSession;
      if (socketRef.current) {
        if (replaceSessionState) {
          pendingActionsRef.current = [];
        }
        closeSocket(socketRef.current as TaggedSocket, true);
      }

      if (replaceSessionState) {
        setQuestion(undefined);
        setAnswer(undefined);
        setPlayers([]);
        currentQuestionIdRef.current = undefined;
        gameStartedRef.current = false;
      }

      connectSocket(game, player, setGame);
    },
    [closeSocket, connectSocket]
  );

  useEffect(() => {
    const onAppStateChange = (state: string) => {
      if (state !== 'active') return;
      if (!gameTokenRef.current || !playerTokenRef.current) return;
      ensureConnection();
      void refreshGameState({ resyncWs: true, force: true });
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [ensureConnection, refreshGameState]);

  useEffect(() => {
    if (!gameTokenRef.current || !playerTokenRef.current) return;
    const interval = setInterval(() => {
      const ws = socketRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        ensureConnection();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [ensureConnection, connected]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

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
        endGameSession,
        connected,
        sendRematch,
        rematchInvitation,
        rematchError,
        clearRematchInvitation,
        clearRematchError,
        refreshGameState,
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
