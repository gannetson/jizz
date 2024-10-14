import {Box, Button, Flex, List, ListItem} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useContext} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"


export const WaitingComponent = () => {

  const {players, nextQuestion} = useContext(WebsocketContext)

  return (
    <>
      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <Box>
            <FormattedMessage id={'waiting for players'} defaultMessage={'Waiting for other players to answer'}/>
          </Box>
          <Box>
            <Button onClick={nextQuestion} colorScheme={'orange'}>
              <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
            </Button>
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