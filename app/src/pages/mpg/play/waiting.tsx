import {Box, Button, Flex, List, ListItem} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useContext} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import AppContext from "../../../core/app-context"


export const WaitingComponent = () => {

  const {players, nextQuestion, mpg} = useContext(WebsocketContext)
  const {player} = useContext(AppContext)

  return (
    <>
      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <Box>
            {player && player.is_host ? (
              mpg?.ended ? (
                <Button onClick={nextQuestion} colorScheme={'orange'}>
                  <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
                </Button>
              ) : (
                <Button onClick={nextQuestion} colorScheme={'orange'}>
                  <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
                </Button>

              )

            ) : (
              <FormattedMessage defaultMessage={'Waiting for {host} to continue to the next question'}
                                id={'waiting for host to click next question'}
                                values={{host: mpg?.host?.name || 'host'}}/>
            )}
          </Box>
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