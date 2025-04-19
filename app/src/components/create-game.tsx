import {useContext, useEffect, useState} from "react"
import AppContext, {Player} from "../core/app-context"
import {Button, Divider, Flex, Heading, Spinner} from "@chakra-ui/react"
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


export const CreateGame = () => {

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
        <Heading size={'lg'}><FormattedMessage id='start game' defaultMessage={'Start a new game'}/></Heading>
        <SetName/>
        <SelectLanguage/>
        <SelectCountry/>
        <SelectSpeciesStatus />
        <SelectLength/>
        <SelectLevel/>
        <SelectMediaType/>
        <Button isDisabled={!country || !playerName} size='lg' onClick={create}>
          <FormattedMessage id={'start game'} defaultMessage={"Start a new game"}/>
        </Button>
      </Flex>

    )
  )
}