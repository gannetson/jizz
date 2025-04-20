import {Button, Flex, Heading, Hide} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Update} from "../core/app-context"
import {Loading} from "../components/loading"
import {useNavigate} from "react-router-dom"
import {Feedback} from "../components/feedback"
import {loadUpdates} from "../core/updates"
import {UpdateLine} from "../components/updates/update-line"

const HomePage = () => {
  const {player, loading} = useContext(AppContext);
  const navigate = useNavigate()
  const [updates, setUpdates] = useState<Update[]>([])

  useEffect(() => {
    loadUpdates().then(updates => {
      setUpdates(updates)
    })
  }, []);


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
            <Button onClick={() => navigate('/start')}>
              <FormattedMessage id={'start game'} defaultMessage={'Start a new game'}/>
            </Button>
            <Button variant='outline' onClick={() => navigate('/join')}>
              <FormattedMessage id={'join game'} defaultMessage={'Join a game'}/>
            </Button>
              <Button onClick={() => navigate('/challenge')}>
                <Flex gap={4}>
                  <FormattedMessage id={'country challenge'} defaultMessage={'Country challenge (beta)'}/>
                </Flex>
              </Button>
              <Button variant='ghost' onClick={() => navigate('/scores')}>
                <FormattedMessage id={'high scores'} defaultMessage={'High scores'}/>
              </Button>
            <Feedback/>
            {updates && updates.length > 0 &&  <UpdateLine update={updates[0]} />}
              <Button variant='ghost' onClick={() => navigate('/updates')}>
                <FormattedMessage id={'more updates'} defaultMessage={'More updates'}/>
              </Button>

          </Flex>
        )}
      </Page.Body>
    </Page>

  )
};

export default HomePage;