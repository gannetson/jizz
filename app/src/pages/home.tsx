import {Button, Flex, Heading, Image, Link} from "@chakra-ui/react";
import { FaCertificate } from "react-icons/fa";
import { Page } from "../shared/components/layout";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Update} from "../core/app-context"
import { getCountryDisplayName } from "../data/country-names-nl"
import {Loading} from "../components/loading"
import {useNavigate} from "react-router-dom"
import {Feedback} from "../components/feedback"
import {loadUpdates} from "../core/updates"
import {UpdateLine} from "../components/updates/update-line"
import {ButtonBadge} from "../components/forms/button-badge"

const APP_STORE_URL = "https://apps.apple.com/us/app/birdr/id6745144189";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=pro.birdr.app";
const APP_STORE_BADGE = "/images/app-store.png";
const PLAY_STORE_BADGE = "/images/google-play.png";

const HomePage = () => {
  const {player, loading, countryChallenge, loadCountryChallenge, language} = useContext(AppContext);
  const locale = language === "nl" ? "nl" : "en";
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
        <Heading color={'gray.800'} size={'lg'} m={0}>
          {player ? player.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
        </Heading>
      </Page.Header>
      <Page.Body>
        {loading ? (
          <Loading/>
        ) : (
          <Flex direction={'column'} gap={10}>
            <Button onClick={() => navigate('/start')} colorPalette="primary">
              <FormattedMessage id={'start game'} defaultMessage={'Start a new game'}/>
            </Button>

            {countryChallenge && countryChallenge.levels && countryChallenge.levels.length > 0 && (
              <Button colorPalette="primary" onClick={() => navigate('/challenge/play')} position="relative">
                <Flex gap={4}>
                  <FormattedMessage 
                    id={'continue challenge'} 
                    defaultMessage={'Continue challenge - {country} - Level {level}'} 
                    values={{
                      country: getCountryDisplayName(countryChallenge.country, locale),
                      level: countryChallenge.levels[0].challenge_level.sequence + 1
                    }}
                  />
                </Flex>
              </Button>
            )}
            
            <Button onClick={() => navigate('/challenge')} position="relative" colorPalette="primary">
              <Flex gap={4}>
                {countryChallenge ? (
                  <FormattedMessage id={'new country challenge'} defaultMessage={'New country challenge'}/>
                ):(
                  <FormattedMessage id={'country challenge'} defaultMessage={'Country challenge'}/>
                )}
              </Flex>

            </Button>
            <Button variant='ghost' colorPalette="primary" onClick={() => navigate('/scores')}>
              <FormattedMessage id={'high scores'} defaultMessage={'High scores'}/>
            </Button>
             <Flex
              gap={3}
              flexDirection={"row"}
              justifyContent={"space-evenly"}
              alignItems={"center"}
              mt={4}
            >
              <Link
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                display="inline-block"
                aria-label="Download on the App Store"
              >
                <Image
                  src={APP_STORE_BADGE}
                  alt="Download on the App Store"
                  height={"48px"}
                  style={{ display: "block" }}
                />
              </Link>
              <Link
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                display="inline-block"
                aria-label="Get it on Google Play"
                flexShrink={0}
              >
                <Image
                  src={PLAY_STORE_BADGE}
                  alt="Get it on Google Play"
                  height={"48px"}
                  style={{ display: "block" }}
                />
              </Link>
            </Flex>


            <Feedback/>
            {updates && updates.length > 0 &&  <UpdateLine update={updates[0]} />}
              <Button variant='ghost' colorPalette="primary" onClick={() => navigate('/updates')}>
                <FormattedMessage id={'more updates'} defaultMessage={'More updates'}/>
              </Button>
          </Flex>
        )}
      </Page.Body>
    </Page>

  )
};

export default HomePage;