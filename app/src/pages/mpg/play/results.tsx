import {Box, Button, Flex, Heading, ListRoot, ListItem} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useContext} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import {useNavigate} from "react-router-dom"


export const ResultsComponent = () => {

  const {players} = useContext(WebsocketContext)
  const navigate = useNavigate()

  const createGame = () => {
    navigate('/start')
  }

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
          <Box>
            <Button onClick={createGame} colorPalette="primary">
              <FormattedMessage id={'play again'} defaultMessage={'Play another game'}/>
            </Button>
          </Box>
        </Flex>
      </Box>
    </>

  )
}