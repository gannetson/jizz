import {Box, Button, Flex, Heading, ListRoot, ListItem} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useContext, useState, useEffect, useMemo} from "react"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {type Game, type MultiPlayer, type Player} from "../../../core/app-context"
import {PlayerItem} from "./player-item"
import {useNavigate, useLocation} from "react-router-dom"
import {GameRow} from "../../../components/game-row"
import { apiUrl } from '../../../api/baseUrl'
import { authService } from "../../../api/services/auth.service"

/** Merge MPG results data so GameRow can show points + correct/total like My games. */
function enrichGameForResults(
  game: Game,
  currentPlayer: Player | undefined,
  playersList: MultiPlayer[] | undefined
): Game {
  const me = playersList?.find((p) => p.id === currentPlayer?.id)
  const userScore = me?.score
  const scoreRow = game.scores?.find((s) => s.name === currentPlayer?.name)
  const answers = scoreRow?.answers ?? []
  const correct_count = answers.filter((a) => a.correct === true).length
  const len = typeof game.length === "number" ? game.length : Number(game.length)
  const total_questions =
    Number.isFinite(len) && len > 0 ? len : answers.length
  return {
    ...game,
    user_score: userScore ?? scoreRow?.score,
    correct_count,
    total_questions,
  }
}

export const ResultsComponent = () => {

  const {players, socket, clearQuestion} = useContext(WebsocketContext)
  const {game, player, createRematchGame, setGame} = useContext(AppContext)
  const navigate = useNavigate()
  const location = useLocation()
  const fromDailyChallengeId = (location.state as { fromDailyChallengeId?: string } | null)?.fromDailyChallengeId
  const [rematchInvitation, setRematchInvitation] = useState<{new_game_token: string, host_name: string} | null>(null)
  const [isRematchLoading, setIsRematchLoading] = useState(false)

  // Check if current player is the host
  // Players array now includes is_host field from PlayerScoreSerializer
  // Also check game.host as fallback (MultiPlayer type with name/id)
  const isHost = 
    players?.find(p => p.is_host && (p.name === player?.name || p.id === player?.id)) !== undefined ||
    player?.name === game?.host?.name ||
    player?.id === game?.host?.id

  const gameDetailPlayerToken =
    !authService.getAccessToken() && player?.token ? player.token : undefined

  const displayGame = useMemo(
    () => (game ? enrichGameForResults(game, player, players) : undefined),
    [game, player, players]
  )

  const createGame = () => {
    navigate('/start')
  }

  const handleRematch = () => {
    if (!game || !player || !socket) {
      console.log('Cannot rematch: missing game, player, or socket', { game: !!game, player: !!player, socket: !!socket })
      return
    }
    setIsRematchLoading(true)
    // Send rematch action while socket is still open - backend must receive this to create the new game.
    // The host will then receive rematch_invitation (via WebSocket) and handleRematchInvitationForHost
    // will close the socket, clear state, load the new game, and navigate to lobby.
    try {
      socket.send(JSON.stringify({
        action: 'rematch',
        player_token: player.token
      }))
      console.log('Rematch request sent')
    } catch (e) {
      console.error('Failed to send rematch request:', e)
      setIsRematchLoading(false)
    }
  }
  
  // Handle rematch invitation for host (auto-join)
  useEffect(() => {
    if (!isHost || !player) return
    
    const handleRematchInvitationForHost = (event: Event) => {
      const customEvent = event as CustomEvent<{new_game_token: string, host_name: string}>
      const { new_game_token } = customEvent.detail
      console.log('Host received rematch invitation, joining new game:', new_game_token)
      
      // Clear old game state completely - this will trigger WebSocket disconnection and question clearing
      // Close socket first to prevent any messages from old game
      if (socket) {
        socket.close()
      }
      // Explicitly clear question before clearing game
      clearQuestion()
      setGame(undefined)
      localStorage.removeItem('game-token')
      
      // Wait a bit longer to ensure state clearing and WebSocket disconnection propagate
      setTimeout(async () => {
        try {
          // Load the new game
          const response = await fetch(apiUrl(`/api/games/${new_game_token}/`), {
            cache: 'no-store',
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
          })
          
          if (response.status === 200) {
            const data = await response.json()
            // Set new game - this will trigger WebSocket reconnection with clean state
            setGame(data)
            localStorage.setItem('game-token', data.token)
            // Navigate to lobby after a delay to ensure state is set and old question is cleared
            setTimeout(() => {
              navigate('/game/lobby')
            }, 200)
          } else {
            console.error('Failed to load rematch game:', response.status)
            setIsRematchLoading(false)
          }
        } catch (e) {
          console.error('Failed to load rematch game:', e)
          setIsRematchLoading(false)
        }
      }, 200)
    }
    
    window.addEventListener('rematch_invitation', handleRematchInvitationForHost)
    return () => {
      window.removeEventListener('rematch_invitation', handleRematchInvitationForHost)
    }
  }, [isHost, player, setGame, navigate, socket, clearQuestion])

  const handleJoinRematch = async () => {
    if (!rematchInvitation || !player) {
      return
    }
    
    // Clear current game state completely - this will trigger WebSocket disconnection and question clearing
    // Close socket first to prevent any messages from old game
    if (socket) {
      socket.close()
    }
    // Explicitly clear question before clearing game
    clearQuestion()
    setGame(undefined)
    localStorage.removeItem('game-token')
    
    // Wait a bit longer to ensure state clearing and WebSocket disconnection propagate
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Load the new game
    const response = await fetch(apiUrl(`/api/games/${rematchInvitation.new_game_token}/`), {
      cache: 'no-store',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
    
    if (response.status === 200) {
      const data = await response.json()
      // Set new game - this will trigger WebSocket reconnection with clean state
      setGame(data)
      localStorage.setItem('game-token', data.token)
      // Navigate to lobby after a delay to ensure state is set and old question is cleared
      setTimeout(() => {
        navigate('/game/lobby')
      }, 200)
    }
  }

  // Listen for rematch invitations (for non-host players)
  useEffect(() => {
    if (isHost) return // Host handles it separately
    
    const handleRematchInvitation = (event: CustomEvent) => {
      console.log('Non-host received rematch invitation:', event.detail)
      setRematchInvitation({
        new_game_token: event.detail.new_game_token,
        host_name: event.detail.host_name
      })
    }

    window.addEventListener('rematch_invitation', handleRematchInvitation as EventListener)
    return () => {
      window.removeEventListener('rematch_invitation', handleRematchInvitation as EventListener)
    }
  }, [isHost])

  return (
    <>
      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <Heading>
            <FormattedMessage defaultMessage={'Final results'} id={'final results'}/>
          </Heading>
          <ListRoot gap={4}>
            {players && players.map((player, index) => (
              <ListItem key={index}>
                <PlayerItem showAnswer={false} player={player}/>
              </ListItem>
            ))}
          </ListRoot>
          <Flex direction={'column'} gap={4}>
            {fromDailyChallengeId && (
              <Button
                onClick={() => navigate(`/daily-challenge/${fromDailyChallengeId}`)}
                colorPalette="primary"
                variant="outline"
              >
                <FormattedMessage id="back_to_daily_challenge" defaultMessage="Back to daily challenge" />
              </Button>
            )}
            {rematchInvitation && (
              <Button onClick={handleJoinRematch} colorPalette="primary">
                <FormattedMessage id={'join rematch'} defaultMessage={'Join rematch'}/>
              </Button>
            )}
            {isHost && (
              <Button
                onClick={handleRematch}
                colorPalette="primary"
                loading={isRematchLoading}
                loadingText={<FormattedMessage id={'creating game'} defaultMessage={'Creating game…'} />}
              >
                <FormattedMessage id={'rematch'} defaultMessage={'Rematch'}/>
              </Button>
            )}
            <Button onClick={createGame} colorPalette="primary" variant={'outline'}>
              <FormattedMessage id={'play again'} defaultMessage={'Play another game'}/>
            </Button>
          </Flex>
          
          {displayGame && (
            <Box>
              <Heading size="md" mb={4}>
                <FormattedMessage id="review_answers" defaultMessage="Review Your Answers" />
              </Heading>
              <GameRow
                game={displayGame}
                emphasizeClickable
                playerToken={gameDetailPlayerToken}
              />
            </Box>
          )}
        </Flex>
      </Box>
    </>

  )
}