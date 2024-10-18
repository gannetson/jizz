import {Button, Flex, Heading} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext} from "react"
import AppContext from "../core/app-context"
import {Loading} from "../components/loading"
import {useNavigate} from "react-router-dom"

const HomePage = () => {
  const {player, loading} = useContext(AppContext);
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
            <Button colorScheme={'orange'} onClick={() => navigate('/start')}>
              <FormattedMessage id={'start game'} defaultMessage={'Start a new game'}/>
            </Button>
            <Button colorScheme={'orange'} onClick={() => navigate('/join')}>
              <FormattedMessage id={'join game'} defaultMessage={'Join a game'}/>
            </Button>
            <Button colorScheme={'orange'} onClick={() => navigate('/scores')}>
              <FormattedMessage id={'high scores'} defaultMessage={'High scores'}/>
            </Button>

          </Flex>
        )}
      </Page.Body>
    </Page>

  )
};

export default HomePage;