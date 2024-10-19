import {Box, Button, Flex, Kbd, List, ListItem, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useCallback, useContext, useEffect} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import AppContext from "../../../core/app-context"
import {useNavigate} from "react-router-dom"
import {SpeciesName} from "../../../components/species-name"
import {ViewSpecies} from "../../../components/view-species"


export const WaitingComponent = () => {

  const {players, nextQuestion, answer, question} = useContext(WebsocketContext)
  const {player, game} = useContext(AppContext)

  const done = (game?.length || 1) <= (question?.sequence || 0)
  const navigate = useNavigate()

  const endGame = () => {
    navigate('/game/ended')
  }
  const isHost = player?.name === game?.host?.name
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === ' ') {
      done ? endGame() : nextQuestion()
    }
  }, [game?.level, question?.options])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])


  return (
    <>
      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <Text>Correct answer was <b><ViewSpecies species={answer?.species}/></b></Text>
          {answer && !answer?.correct && (
            <Text>Your answer was <b><ViewSpecies species={answer?.answer}/></b></Text>
          )}
          <List spacing={4}>
            {players && players.map((player, index) => (
              <ListItem key={index}>
                <PlayerItem showRanking={false} player={player}/>
              </ListItem>
            ))}
          </List>
          <Box>
            {done ? (
              <Button onClick={endGame} colorScheme={'orange'}>
                <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
              </Button>
            ) : (
              isHost ? (
                <Button onClick={nextQuestion} colorScheme={'orange'}>
                  <Flex gap={8}>
                  <FormattedMessage id={'next question'} defaultMessage={'Next question'} />

                  <Kbd size='lg' backgroundColor={'orange.600'} borderColor={'orange.800'}>Space</Kbd>
                  </Flex>
                </Button>
              ) : (
                <FormattedMessage defaultMessage={'Waiting for {host} to continue to the next question'}
                                  id={'waiting for host to click next question'}
                                  values={{host: game?.host?.name || 'host'}}/>
              )

            )}
          </Box>
        </Flex>
      </Box>
    </>

  )
}