import {Box, Button, Flex, Kbd, ListRoot, ListItem, Show, SimpleGrid, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useCallback, useContext, useEffect} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import AppContext from "../../../core/app-context"
import {ViewSpecies} from "../../../components/view-species"
import { AnswerFeedback } from "../../../components/answer-feedback"


export const WaitingComponent = () => {

  const {players, nextQuestion, question, endGame: endGameSession} = useContext(WebsocketContext)
  const {player, game} = useContext(AppContext)

  const done = (game?.length || 1) <= (question?.sequence || 0)

  const endGame = () => {
    endGameSession()
  }
  const isHost = player?.name === game?.host?.name

  return (
    <>
      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <ListRoot>
            {players && players.map((player, index) => (
              <ListItem key={index}>
                <PlayerItem showRanking={false} player={player}/>
              </ListItem>
            ))}
          </ListRoot>
          <Box>
            {done ? (
              <Button onClick={endGame} width='full' colorPalette="primary">
                <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
              </Button>
            ) : (
              isHost ? (
                <Button onClick={nextQuestion} width='full' colorPalette="primary">
                  <FormattedMessage id={'next question'} defaultMessage={'Next question'} />
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