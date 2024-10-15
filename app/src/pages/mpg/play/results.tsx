import {Box, Flex, Heading, List, ListItem} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useContext} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"


export const ResultsComponent = () => {

  const {players} = useContext(WebsocketContext)
  return (
    <>

      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <Heading>
            <FormattedMessage defaultMessage={'Final results'} id={'final results'}/>
          </Heading>
          <List spacing={4}>
            {players && players.map((player, index) => (
              <ListItem key={index}>
                <PlayerItem showAnswer={false} player={player}/>
              </ListItem>
            ))}
          </List>
        </Flex>
      </Box>
    </>

  )
}