import {Box, Button, Flex, Kbd, List, ListItem, Show, SimpleGrid, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useCallback, useContext, useEffect} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import AppContext from "../../../core/app-context"
import {useNavigate} from "react-router-dom"
import {ViewSpecies} from "../../../components/view-species"
import { AnswerFeedback } from "../../../components/answer-feedback"


export const WaitingComponent = () => {

  const {players, nextQuestion, answer, question} = useContext(WebsocketContext)
  const {player, game} = useContext(AppContext)

  const done = (game?.length || 1) <= (question?.sequence || 0)
  const navigate = useNavigate()

  const endGame = () => {
    navigate('/game/ended')
  }
  const isHost = player?.name === game?.host?.name

  return (
    <>
      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <List spacing={4}>
            {players && players.map((player, index) => (
              <ListItem key={index}>
                <PlayerItem showRanking={false} player={player}/>
              </ListItem>
            ))}
          </List>
          <Box>
            {done ? (
              <Button onClick={endGame} width='full'>
                <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
              </Button>
            ) : (
              isHost ? (
                <Button onClick={nextQuestion} width='full'>
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