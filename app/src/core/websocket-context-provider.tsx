import React, {FC, ReactNode, useContext, useEffect, useRef, useState} from 'react';
import AppContext, {Answer, Game, MultiPlayer, Player, Question, Species} from "./app-context";
import WebsocketContext from "./websocket-context"
import { toaster } from "@/components/ui/toaster"
import { validateQuestionForGame, getCurrentGameToken } from './game-token-validator'

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
    
    // Clear question/answer immediately when connecting to a new game
    // This prevents old questions from persisting
    console.log('Connecting to new game, clearing question/answer:', connectionGameToken)
    setQuestion(undefined)
    setAnswer(undefined)

    let socketUrl = `wss://birdr.pro/mpg/${game.token}`
    if (window.location.host === 'localhost:3000') {
      socketUrl = `ws://127.0.0.1:8050/mpg/${game.token}`
    }
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
          setAnswer(undefined)
          const question: Question = message.question
          
          // Get the authoritative current game token (from context, fallback to socket)
          const contextGameToken = getCurrentGameToken(game, gameToken)
          
          // Validate question belongs to the current game using centralized validator
          // Check against both socket token (connection) and context token (current state)
          if (validateQuestionForGame(question, socketGameToken) && 
              validateQuestionForGame(question, contextGameToken || undefined)) {
            console.log('Setting question for game:', socketGameToken)
            setQuestion(question)
          } else {
            console.log('Ignoring new_question - validation failed:', {
              questionToken: question.game?.token,
              socketToken: socketGameToken,
              contextToken: contextGameToken
            })
          }
          break
        case 'game_started':
          notify('Game started')
          break
        case 'game_updated':
          // Only update game if it matches the socket's game token and current game
          const updatedGame = message.game as Game
          const contextGameTokenForUpdate = getCurrentGameToken(game, gameToken)
          if (updatedGame.token === socketGameToken && updatedGame.token === contextGameTokenForUpdate) {
            setGame(updatedGame)
          } else {
            console.log('Ignoring game_updated - token mismatch:', {
              updatedGameToken: updatedGame.token,
              socketToken: socketGameToken,
              contextToken: contextGameTokenForUpdate
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

      // CRITICAL: Check both the game token from context AND localStorage
      // to ensure we don't reconnect to an old game after rematch
      const currentGameToken = game?.token
      const localStorageToken = typeof window !== 'undefined' ? localStorage.getItem('game-token') : null
      
      // Only retry if:
      // 1. We still have a valid game and player
      // 2. The game token matches the connection token (this socket's game)
      // 3. The game token matches localStorage (prevents reconnecting to old game after rematch)
      // 4. We haven't exceeded max retries
      const shouldRetry = (
        currentGameToken === connectionGameToken &&
        currentGameToken === localStorageToken &&
        activePlayer?.token &&
        retries.current < maxRetries.current
      )
      
      if (shouldRetry) {
        retries.current++;
        console.log(`Reconnecting... (${retries.current}/${maxRetries.current})`);
        setTimeout(() => connectSocket(game, activePlayer as Player), retryInterval.current);
      } else {
        if (retries.current >= maxRetries.current) {
          console.log('Max retries reached. Could not reconnect.');
        } else {
          console.log('Not retrying - game cleared, changed, or localStorage mismatch:', {
            currentGameToken,
            connectionGameToken,
            localStorageToken,
            tokensMatch: currentGameToken === connectionGameToken && currentGameToken === localStorageToken
          });
        }
        retries.current = 0; // Reset retries
      }
    };

    setSocket(ws);
    return ws;
  }

  const sendAction = (data: {}) => {
    if (socket) {
      socket.send(JSON.stringify({
        ...data,
        language_code: language
      }))
    } else {
      console.log("Error sending action. Socket not ready.")
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
      
      // Only connect if:
      // 1. No socket exists, OR
      // 2. Socket exists but is for a different game, OR
      // 3. Socket exists but is not open
      // AND we're not already in the process of connecting
      if (!isConnectingRef.current) {
        if (!socket || game.token !== currentSocketGameToken || !isSocketOpen) {
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
          } else if (!isSocketOpen) {
            // Socket exists but not open - reconnect
            console.log('Socket not open, reconnecting to game:', game.token)
            joinGame(game, player)
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