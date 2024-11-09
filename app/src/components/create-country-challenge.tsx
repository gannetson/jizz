import {useContext, useEffect, useState} from "react"
import AppContext, {Player} from "../core/app-context"
import {Button, Divider, Flex, Heading, Spinner, Text} from "@chakra-ui/react"
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


export const CreateCountryChallenge = () => {

  const {
    player,
    createPlayer,
    country,
    createGame,
    game,
    playerName
  } = useContext(AppContext);
  const {joinGame} = useContext(WebsocketContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()


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
        <Heading size={'lg'}><FormattedMessage id='country challenge' defaultMessage={'Country challenge'}/></Heading>
        <Text>
          <FormattedMessage
            id={'country challenge description'}
            defaultMessage={'You will run through different levels. It will start easy, but it will get harder. The final level will be a thorough. Let\'s see how far you get.'}
          />
        </Text>
        <SetName/>
        <SelectLanguage/>
        <SelectCountry/>
        <Button isDisabled={!country || !playerName} colorScheme='orange' size='lg' onClick={create}>
          <FormattedMessage id={'start challenge'} defaultMessage={"Start challenge"}/>
        </Button>
      </Flex>

    )
  )
}