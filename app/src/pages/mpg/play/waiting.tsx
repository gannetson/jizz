import {Box, Button, Flex, List, ListItem, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useContext} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import AppContext from "../../../core/app-context"
import {useNavigate} from "react-router-dom"
import {SpeciesName} from "../../../components/species-name"


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
          <Text>Correct answer was <b><SpeciesName species={answer?.species} /></b></Text>
          <List spacing={4}>
            {players && players.map((player, index) => (
              <ListItem key={index}>
                <PlayerItem player={player}/>
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
                  <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
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