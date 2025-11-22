import {useContext, useEffect, useState} from "react"
import AppContext, {Player} from "../core/app-context"
import {Button, Separator, Flex, Heading, Spinner, Text} from "@chakra-ui/react"
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
import {UseCountries} from "../user/use-countries"


export const CreateCountryGame = () => {

  const {
    player,
    createPlayer,
    country,
    setCountry,
    createGame,
    game,
    playerName,
    setPlayerName,
    language,
    setLanguage
  } = useContext(AppContext);
  const {joinGame} = useContext(WebsocketContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const {countries} = UseCountries()

  // Don't auto-load user profile preferences - let users set their own preferences for each game


  const create = async () => {
    setLoading(true)
    let myPlayer: Player | undefined = player
    if (!myPlayer) {
      myPlayer = await createPlayer()
    }
    const myGame = await createGame(myPlayer)
    await joinGame(myGame, myPlayer)
    navigate('/game/lobby')
    setLoading(false)
 }


  return (
    loading ? (
      <Loading/>
    ) : (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}><FormattedMessage id='country species ' defaultMessage={'Country species'}/></Heading>
        <Text>
          <FormattedMessage
            id={'All species'}
            defaultMessage={'You have to recognise all species.'}
          />
        </Text>
        <SetName/>
        <SelectLanguage/>
        <SelectCountry/>
        <Button onClick={()=> requestNotificationPermission()} colorPalette="primary">Request</Button>
        <Button onClick={()=> sendNotification({title: 'Hey you!', body: 'Come on and spot some birds!'})} colorPalette="primary">Test</Button>
        <Button disabled={!country || !playerName} size='lg' onClick={create} colorPalette="primary">
          <FormattedMessage id={'start challenge'} defaultMessage={"Start challenge"}/>
        </Button>
      </Flex>

    )
  )
}