import {Button, Flex, Heading, Hide, Box, Icon} from "@chakra-ui/react";
import { FaCertificate } from "react-icons/fa";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Update} from "../core/app-context"
import {Loading} from "../components/loading"
import {useNavigate} from "react-router-dom"
import {Feedback} from "../components/feedback"
import {loadUpdates} from "../core/updates"
import {UpdateLine} from "../components/updates/update-line"
import { keyframes } from "@emotion/react";

const floatAnimation = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  20% { transform: scale(1.1) rotate(5deg); }
  40% { transform: scale(1) rotate(0deg); }
  60% { transform: scale(1.1) rotate(-5deg); }
  80% { transform: scale(1.1) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const HomePage = () => {
  const {player, loading, countryChallenge, loadCountryChallenge} = useContext(AppContext);
  const navigate = useNavigate()
  const [updates, setUpdates] = useState<Update[]>([])

  useEffect(() => {
    loadCountryChallenge()
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
            
            {countryChallenge && countryChallenge.levels && countryChallenge.levels.length > 0 && (
              <Button colorScheme="orange" onClick={() => navigate('/challenge/play')} position="relative">
                <Flex gap={4}>
                  <FormattedMessage 
                    id={'continue challenge'} 
                    defaultMessage={'Continue challenge - {country} - Level {level}'} 
                    values={{
                      country: countryChallenge.country.name,
                      level: countryChallenge.levels[0].challenge_level.sequence + 1
                    }}
                  />
                </Flex>
              </Button>
            )}
            
            <Button onClick={() => navigate('/challenge')} position="relative">
              <Flex gap={4}>
                {countryChallenge ? (
                  <FormattedMessage id={'new country challenge'} defaultMessage={'New country challenge'}/>
                ):(
                  <FormattedMessage id={'country challenge'} defaultMessage={'Country challenge'}/>
                )}
              </Flex>
              <Box
                position="absolute"
                top="-25px"
                right="-25px"
                width="100px"
                height="100px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                zIndex={1}
              >
                <Box
                  position="absolute"
                  width="100px"
                  height="100px"
                  animation={`${floatAnimation} 3s ease-in-out infinite`}
                >
                  <Icon
                    as={FaCertificate}
                    boxSize="100px"
                    color="orange.700"
                    position="absolute"
                    top="0"
                    left="0"
                  />
                  <Box
                    position="absolute"
                    color="white"
                    fontSize="sm"
                    fontWeight="bold"
                    textAlign="center"
                    width="100%"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                  >
                    10 levels
                  </Box>
                </Box>
              </Box>
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