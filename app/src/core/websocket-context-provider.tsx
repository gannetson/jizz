import React, {FC, ReactNode, useContext, useEffect, useRef, useState} from 'react';
import AppContext, {Answer, Game, MultiPlayer, Player, Question, Species} from "./app-context";
import WebsocketContext from "./websocket-context"
import { toaster } from "@/components/ui/toaster"
import { validateQuestionForGame } from './game-token-validator'
import { getWebSocketUrl } from '../api/baseUrl'

type Props = {
  children: ReactNode;
};

const WebsocketContextProvider: FC<Props> = ({children}) => {
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);
  const [players, setPlayers] = useState<MultiPlayer[]>([])
  const [question, setQuestion] = useState<Question | undefined>(undefined)
  const [answer, setAnswer] = useState<Answer | undefined>(undefined)

  const retryInterval = useRef<number>(1000);
  const maxRetries = useRef<number>(100);
  const retries = useRef<number>(0);
  const prevGameTokenRef = useRef<string | undefined>(undefined);
  const isConnectingRef = useRef<boolean>(false);
  const socketRef = useRef<WebSocket | undefined>(undefined);
  const questionGameTokenRef = useRef<string | undefined>(undefined);
  const pendingActionsRef = useRef<{}[]>([]);
  const currentQuestionIdRef = useRef<number | undefined>(undefined);

  const {game, setGame, player, language} = useContext(AppContext)

  // Use a ref to track localStorage game token to avoid stale closures
  // This ensures we always have the latest value in async callbacks
  const gameTokenRef = useRef<string | null>(null)
  
  // Update ref whenever localStorage might change
  useEffect(() => {
    const updateGameToken = () => {
      gameTokenRef.current = typeof window !== 'undefined' ? localStorage.getItem('game-token') : null
    }
    updateGameToken()
    
    // Listen for storage events (when localStorage changes in other tabs/windows)
    window.addEventListener('storage', updateGameToken)
    
    // Also check periodically in case localStorage was changed directly
    const interval = setInterval(updateGameToken, 100)
    
    return () => {
      window.removeEventListener('storage', updateGameToken)
      clearInterval(interval)
    }
  }, [])
  
  const gameToken = gameTokenRef.current
  const playerToken = localStorage.getItem('player-token')


  const notify = (title: string, description?: string, colorPalette?: string) => {
    toaster.create({
      title: title,
      description: description,
      colorPalette: colorPalette || "primary"
    })
  }

  // Keep ref in sync so connectSocket/onclose always see latest socket (avoids stale closure)
  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  // Track which game the current question belongs to (so we can skip retry when we have a question)
  useEffect(() => {
    if (question?.game?.token) {
      questionGameTokenRef.current = question.game.token
    }
  }, [question?.game?.token])

  // Track current question id so we don't clear answer when we receive the same question on reconnect
  useEffect(() => {
    currentQuestionIdRef.current = question?.id
  }, [question?.id])

  const connectSocket = (game?: Game, player?: Player) => {
    // Try to get player from context or localStorage
    const activePlayer = player || (playerToken ? { token: playerToken } as Player : null)
    
    if (!activePlayer || !activePlayer.token) {
      console.log("Couldn't connect to game. No player token")
      isConnectingRef.current = false
      return
    }
    if (!game || !game.token) {
      console.log("Couldn't connect to game. No game token")
      isConnectingRef.current = false
      return
    }

    // Store the game token for this connection to check on close and in message handlers
    const connectionGameToken = game.token
    
    // Check if we're already connected to this game
    if (socket && (socket as any).gameToken === connectionGameToken && socket.readyState === WebSocket.OPEN) {
      console.log('Already connected to this game, skipping connection')
      isConnectingRef.current = false
      return
    }

    // Only clear question/answer when switching to a different game (or first connect).
    // When reconnecting to the same game (e.g. retry after disconnect), keep current question to avoid blank flash loop.
    const isSameGameReconnect = socket && (socket as any).gameToken === connectionGameToken
    if (!isSameGameReconnect) {
      console.log('Connecting to new game, clearing question/answer:', connectionGameToken)
      setQuestion(undefined)
      setAnswer(undefined)
    }

    const socketUrl = getWebSocketUrl(`/mpg/${game.token}`);
    const ws = new WebSocket(socketUrl);
    
    // Store the game token on the socket for validation
    (ws as any).gameToken = connectionGameToken

    ws.onopen = () => {
      console.log('WebSocket connection established for game:', connectionGameToken);
      console.log('Joining game')
      isConnectingRef.current = false // Connection established
      ws.send(JSON.stringify({
        action: 'join_game', 
        player_token: activePlayer.token,
        language_code: language
      }))

      // Flush any pending actions that were queued while socket was closed.
      // Join game must be first so the backend knows this connection's player/game.
      if (pendingActionsRef.current.length > 0) {
        const actionsToSend = [...pendingActionsRef.current]
        pendingActionsRef.current = []
        actionsToSend.forEach((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              ...(data as object),
              language_code: language
            }))
          }
        })
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('Message from server:', message.action);
      
      // Get the current game token from the socket (the game this socket is connected to)
      const socketGameToken = (ws as any).gameToken
      
      switch (message.action) {
        case 'update_players':
          const players: MultiPlayer[] = message.players
          setPlayers(players)
          break
        case 'player_joined':
          console.log(`${message.player_name} joined the game`)
          break
        case 'new_question':
          // Only clear answer when advancing to a genuinely new question.
          // On reconnect we get the same question again; don't wipe answer_checked we may receive after.
          const incomingQuestionId = message.question?.id
          if (incomingQuestionId !== currentQuestionIdRef.current) {
            setAnswer(undefined)
          }
          const question: Question = message.question
          // Trust the socket's game only. React context/localStorage can lag behind the WS connection
          // (stale closure in this handler), which used to drop valid new_question for guests.
          if (validateQuestionForGame(question, socketGameToken)) {
            console.log('Setting question for game:', socketGameToken)
            setQuestion(question)
          } else {
            console.log('Ignoring new_question - validation failed:', {
              questionToken: question.game?.token,
              socketToken: socketGameToken,
            })
          }
          break
        case 'game_started':
          notify('Game started')
          break
        case 'game_updated':
          const updatedGame = message.game as Game
          if (updatedGame.token === socketGameToken) {
            setGame(updatedGame)
          } else {
            console.log('Ignoring game_updated - token mismatch:', {
              updatedGameToken: updatedGame.token,
              socketToken: socketGameToken,
            })
          }
          break
        case 'answer_checked':
          setAnswer(message.answer as Answer)
          break
        case 'rematch_invitation':
          // Rematch invitation is handled in ResultsComponent
          // Dispatch a custom event that components can listen to
          console.log('WebSocket received rematch_invitation:', message)
          window.dispatchEvent(new CustomEvent('rematch_invitation', {
            detail: {
              new_game_token: message.new_game_token,
              host_name: message.host_name
            }
          }))
          break
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      isConnectingRef.current = false // Connection closed, can connect again

      // Don't retry when we closed the socket intentionally (e.g. joinGame reconnecting)
      if ((ws as any).closedByJoin) {
        retries.current = 0;
        return;
      }

      // For now, do not auto-retry this WebSocket.
      // We keep the last question in state so the UI doesn't flicker,
      // and a fresh connection will be made only when navigating to a new game.
      retries.current = 0;
      console.log('Not retrying WebSocket for game:', connectionGameToken);
    };

    setSocket(ws);
    return ws;
  }

  const sendAction = (data: {}) => {
    const currentSocket = socketRef.current ?? socket

    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
      currentSocket.send(JSON.stringify({
        ...data,
        language_code: language
      }))
      return
    }

    // Socket is not open – queue the action and (re)connect before sending.
    if (game?.token) {
      console.warn("Socket not open, queueing action and reconnecting:", (data as any).action)
      pendingActionsRef.current.push(data)
      if (!isConnectingRef.current) {
        isConnectingRef.current = true
        connectSocket(game, player)
      }
    } else {
      console.warn("Error sending action. No game token and socket not ready.")
    }
  }

  const startGame = () => {
    sendAction({action: 'start_game', player_token: player?.token})
  }


  const nextQuestion = () => {
    sendAction({action: 'next_question', player_token: player?.token})
  }

  const joinGame = (game?: Game, player?: Player) => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('Already connecting, skipping duplicate joinGame call')
      return
    }
    
    // Close and clear socket first
    if (socket) {
      console.log('Closing old socket before joining new game')
      ;(socket as any).closedByJoin = true // Prevent onclose from retrying
      socket.close()
      setSocket(undefined)
    }
    // Clear question/answer state immediately
    console.log('Clearing question/answer before joining new game')
    setQuestion(undefined)
    setAnswer(undefined)
    
    // Mark as connecting
    isConnectingRef.current = true
    
    // Small delay to ensure socket is closed before connecting to new game
    setTimeout(() => {
      connectSocket(game, player)
      // Reset connecting flag after a short delay to allow connection to establish
      setTimeout(() => {
        isConnectingRef.current = false
      }, 100)
    }, 50)
  }

  const submitAnswer = (answer: Answer) => {
    sendAction({
      action: 'submit_answer',
      player_token: answer.player?.token,
      question_id: answer.question?.id,
      answer_id: answer.answer?.id
    })
  }

  const clearQuestion = () => {
    console.log('Explicitly clearing question')
    setQuestion(undefined)
    setAnswer(undefined)
  }

  useEffect(() => {
    // Clear question/answer when game changes (new game created) or when game is cleared
    if (game?.token && game.token !== prevGameTokenRef.current) {
      // Game token changed - completely forget about old game and clear all state
      const oldToken = prevGameTokenRef.current
      console.log('Game token changed - forgetting old game completely:', {
        oldToken: oldToken,
        newToken: game.token
      })
      
      // Close socket if it exists and belongs to old game
      if (socket) {
        const socketGameToken = (socket as any).gameToken
        if (socketGameToken === oldToken || !socketGameToken) {
          console.log('Closing socket for old game:', oldToken)
          socket.close()
          setSocket(undefined)
        }
      }
      
      // Clear all state related to old game
      setQuestion(undefined)
      setAnswer(undefined)
      setPlayers([])
      isConnectingRef.current = false
      retries.current = 0
      
      // Update ref to new game token
      prevGameTokenRef.current = game.token
    } else if (!game && prevGameTokenRef.current) {
      // Game was cleared (e.g., when starting a new game) - disconnect and clear everything
      console.log('Game cleared, disconnecting and clearing all state')
      if (socket) {
        socket.close()
        setSocket(undefined)
      }
      setQuestion(undefined)
      setAnswer(undefined)
      setPlayers([])
      isConnectingRef.current = false
      retries.current = 0
      prevGameTokenRef.current = undefined
    }
  }, [game?.token, game, socket]);

  useEffect(() => {
    // Wait for both game and player to be loaded before connecting
    if (game?.token && player?.token) {
      // Check if we're already connected to this game
      const currentSocketGameToken = socket ? (socket as any).gameToken : undefined
      const isSocketOpen = socket && socket.readyState === WebSocket.OPEN
      const isSocketConnecting = socket && socket.readyState === WebSocket.CONNECTING

      // Only connect if:
      // 1. No socket exists, OR
      // 2. Socket exists but is for a different game, OR
      // 3. Socket exists but is closed/closing (not open and not still connecting)
      // AND we're not already in the process of connecting
      if (!isConnectingRef.current) {
        if (!socket || game.token !== currentSocketGameToken || (!isSocketOpen && !isSocketConnecting)) {
          if (socket && game.token !== currentSocketGameToken) {
            // Game changed - reconnect (this will clear question/answer)
            console.log('Game token changed, reconnecting:', {
              oldToken: currentSocketGameToken,
              newToken: game.token
            })
            joinGame(game, player)
          } else if (!socket) {
            // No socket yet - connect
            console.log('No socket, connecting to game:', game.token)
            joinGame(game, player)
          } else if (!isSocketOpen && !isSocketConnecting) {
            // Socket exists but closed/closing - reconnect without clearing (same game)
            console.log('Socket not open, reconnecting to game:', game.token)
            if (game.token === currentSocketGameToken) {
              connectSocket(game, player)
            } else {
              joinGame(game, player)
            }
          }
        } else {
          console.log('Already connected to game:', game.token)
        }
      } else {
        console.log('Connection in progress, skipping')
      }
    }
  }, [game?.token, player?.token]);

  return (
    <WebsocketContext.Provider value={{
      players,
      startGame,
      nextQuestion,
      question,
      joinGame,
      submitAnswer,
      answer,
      socket,
      clearQuestion
    }}>
      {children}
    </WebsocketContext.Provider>
  );
};

export {WebsocketContextProvider};