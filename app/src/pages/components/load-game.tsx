import {useContext, useState} from "react"
import AppContext from "../../core/app-context"
import {Button, Flex, Heading, Spinner, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {formatDistanceToNow} from "date-fns"


export const LoadGame = () => {


  const { game } = useContext(AppContext);
  const [loading, setLoading] = useState(false)


  const loadGame = async () => {
    if (game) {
      document.location.href = '/game/'
    }
  }


  return (
    loading ? (
      <Spinner size={'50px'}/>
    ) : (
      game && (
        <Flex direction={'column'} gap={10}>
          <Heading size={'lg'}>
            <FormattedMessage id='old game' defaultMessage={'You have an old game in progress!'}/>
          </Heading>
          <Text>
            Country: {game.country.name}<br/>
            Started: {formatDistanceToNow(game.created)} ago<br/>
            Progress: {game.correct} / {game.questions.length}
          </Text>
          <Button size='lg' onClick={loadGame} colorScheme={'orange'}>
            Continue game
          </Button>
        </Flex>
      )
    )
  )
}