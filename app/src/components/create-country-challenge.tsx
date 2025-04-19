import {useContext, useEffect, useState} from "react"
import AppContext, {Player} from "../core/app-context"
import {Button, Card, Divider, Flex, Heading, Spinner, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import SelectCountry from "./select-country"
import SelectLanguage from "./select-language"
import SelectLevel from "./select-level"
import {SelectGameType} from "./select-game-type"
import {Loading} from "./loading"
import {SelectLength} from "./select-length"
import WebsocketContext from "../core/websocket-context"
import {useNavigate} from "react-router-dom"
import {SelectMediaType} from "./select-media-type"
import {SetName} from "./set-name"
import {SelectSpeciesStatus} from "./select-species-status"
import {requestNotificationPermission, sendNotification} from "../core/notifications"
import CountrySummary from "./country-summary"


export const CreateCountryChallenge = () => {

  const {
    player,
    createPlayer,
    country,
    startCountryChallenge,
    loading
  } = useContext(AppContext);
  const navigate = useNavigate()


  const create = async () => {
    let myPlayer: Player | undefined = player
    if (!myPlayer) {
      myPlayer = await createPlayer()
    }
    if (!country || !myPlayer) {
      return
    }
    const myGame = await startCountryChallenge(country, myPlayer)
 }

  return (
    loading ? (
      <Loading/>
    ) : (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}><FormattedMessage id='country challenge' defaultMessage={'Country challenge'}/></Heading>
        <Text>
          <FormattedMessage
            id={'country challenge description'}
            defaultMessage={'You will run through different levels. Some easy and some quite difficult.'}
          />
        </Text>
        <Card bgColor={'orange.700'} textColor={'white'} fontWeight={'bold'} p={4} borderRadius={'xl'}>
          <FormattedMessage
            id={'country challenge warning'}
            defaultMessage={'WARNING! This is still in development. Some features will not work as expected. Please send any feedback through the form on the homme page.'}
          />
        </Card>
        <SetName/>
        <SelectLanguage/>
        <SelectCountry/>
        <CountrySummary />

        {/* <Button onClick={()=> requestNotificationPermission()}>Request</Button>
        <Button onClick={()=> sendNotification({title: 'Hey you!', body: 'Come on and spot some birds!'})}>Test</Button> */}
        <Button isDisabled={!country || !player} size='lg' onClick={create}>
          <FormattedMessage id={'start challenge'} defaultMessage={"Start challenge"}/>
        </Button>
      </Flex>

    )
  )
}