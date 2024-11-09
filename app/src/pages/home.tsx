import {Button, Flex, Heading, Hide} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext} from "react"
import AppContext from "../core/app-context"
import {Loading} from "../components/loading"
import {useNavigate} from "react-router-dom"
import {Feedback} from "../components/feedback"

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
            <Button colorScheme={'orange'} variant='outline' onClick={() => navigate('/join')}>
              <FormattedMessage id={'join game'} defaultMessage={'Join a game'}/>
            </Button>
            <Hide>
              <Button colorScheme={'orange'} onClick={() => navigate('/challenge')}>
                <Flex gap={4}>
                  <FormattedMessage id={'country challenge'} defaultMessage={'Country challenge'}/>
              </Flex>
            </Button>
              </Hide>
            <Button colorScheme={'orange'} variant='outline' onClick={() => navigate('/scores')}>
              <FormattedMessage id={'high scores'} defaultMessage={'High scores'}/>
            </Button>
            <Feedback/>
          </Flex>
        )}
      </Page.Body>
    </Page>

  )
};

export default HomePage;