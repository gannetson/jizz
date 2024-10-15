import {Box, Button, Flex, List, ListItem, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useContext} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import AppContext from "../../../core/app-context"
import {useNavigate} from "react-router-dom"


export const WaitingComponent = () => {

  const {players, nextQuestion, mpg, setMpg, answer, question} = useContext(WebsocketContext)
  const {player} = useContext(AppContext)

  const done = (mpg?.length || 1) <= (question?.sequence || 0)
  const navigate = useNavigate()

  const endGame = () => {
    navigate('/game/ended')
  }

  return (
    <>
    <Box position={'relative'}>
      <Flex direction={'column'} gap={8}>
        <Box>
          {done && (
            <Button onClick={endGame} colorScheme={'orange'}>
              <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
            </Button>
          )}
          {player && player.is_host ? (
            <Button onClick={nextQuestion} colorScheme={'orange'}>
              <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
            </Button>
          ) : (
            <FormattedMessage defaultMessage={'Waiting for {host} to continue to the next question'}
          id={'waiting for host to click next question'}
          values={{host: mpg?.host?.name || 'host'}}/>
        )}
    </Box>

    <Text>Correct answer was <b>{answer?.species?.name}</b></Text>
    <List spacing={4}>
      {players && players.map((player, index) => (
        <ListItem key={index}>
          <PlayerItem player={player}/>
        </ListItem>
      ))}
    </List>
    </Flex>
</Box>
</>

)
}