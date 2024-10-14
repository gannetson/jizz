import {useContext, useState} from "react"
import AppContext from "../core/app-context"
import {Button, Flex, Heading, Spinner, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {formatDistanceToNow} from "date-fns"


export const LoadGame = () => {


  const {game} = useContext(AppContext);


  const loadGame = async () => {
    if (game) {
      document.location.href = '/game/'
    }
  }


  return (
    <>
      {game && (
        <Flex direction={'column'} gap={10}>
          <Heading size={'lg'}>
            <FormattedMessage id='load game' defaultMessage={'Load game'}/>
          </Heading>
          <Text>
            Country: {game.country.name}<br/>
            Started: {formatDistanceToNow(game.created)} ago<br/>
            Progress: {game.progress} / {game.length}
          </Text>
          <Button size='lg' onClick={loadGame} colorScheme={'orange'}>
            <FormattedMessage id='load game' defaultMessage={'Load game'}/>
          </Button>
        </Flex>
      )}
    </>
  )
}