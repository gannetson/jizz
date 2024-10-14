import {Button, Flex, Heading} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {CreateGame} from "../components/create-game"
import {CreatePlayer} from "../components/create-player"
import {useContext} from "react"
import AppContext from "../core/app-context"
import {Loading} from "../components/loading"
import {LoadGame} from "../components/load-game"
import {useNavigate} from "react-router-dom"

const HomePage = () => {
  const {player, game, loading} = useContext(AppContext);
  const navigate = useNavigate()

  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          {player ? player.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
        </Heading>
      </Page.Header>
      <Page.Body>
        {loading ? (
          <Loading/>
        ) : (
          <Flex direction={'column'} gap={10}>
            {game && <LoadGame/>}
            <Button colorScheme={'orange'} onClick={() => navigate('/start')}>
              <FormattedMessage id={'start game'} defaultMessage={'Start a new game'}/>
            </Button>
            <Button colorScheme={'orange'} onClick={() => navigate('/join')}>
              <FormattedMessage id={'join game'} defaultMessage={'Join a game'}/>
            </Button>

          </Flex>
        )}
      </Page.Body>
    </Page>

  )
};

export default HomePage;