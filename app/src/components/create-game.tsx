import {useContext, useEffect, useState} from "react"
import AppContext, {Player} from "../core/app-context"
import {Box, Button, Flex, Heading, Link} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import SelectCountry from "./select-country"
import SelectLanguage from "./select-language"
import SelectLevel from "./select-level"
import {SelectLength} from "./select-length"
import WebsocketContext from "../core/websocket-context"
import {useNavigate} from "react-router-dom"
import {SelectMediaType} from "./select-media-type"
import {SetName} from "./set-name"
import {SelectSpeciesStatus} from "./select-species-status"
import {SelectRarity, type Rarity} from "./select-rarity"
import {UseCountries} from "../user/use-countries"
import SelectTaxOrder from "./select-order"
import SelectTaxFamily from "./select-family"


type GameProps = {
  country?: string;
  length?: string;
  level?: string;
  rarity?: Rarity
  mediaType?: string;
}

export const CreateGame = ({
                             country: pickCountry,
                             length: pickLength,
                             level: pickLevel,
                             rarity: pickRarity,
                             mediaType: pickMediaType
                           }: GameProps) => {

  const {
    player,
    createPlayer,
    country,
    setCountry,
    setLevel,
    setLength,
    createGame,
    setRarity,
    setMediaType,
    playerName,
    setPlayerName,
    language,
    setLanguage
  } = useContext(AppContext);
  const {joinGame} = useContext(WebsocketContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const {countries} = UseCountries()

  useEffect(() => {
    if (pickCountry && countries && countries.length > 0) {
      const country = countries.find((c) => c.code === pickCountry)
      country && setCountry(country)
    }
    if (pickLength) {
      setLength(pickLength)
    }
    if (pickLevel) {
      setLevel(pickLevel)
    }
    if (pickMediaType) {
      setMediaType(pickMediaType)
    }
    if (pickRarity !== undefined) {
      setRarity(pickRarity)
    }

  }, [
    countries.length, pickCountry,
    pickLevel, pickLength, pickMediaType, pickRarity,
    setLevel, setMediaType, setRarity, setLength, setCountry
  ]);


  const create = async () => {
    if (loading) return
    setLoading(true)
    try {
      let myPlayer: Player | undefined = player
      if (!myPlayer) {
        myPlayer = await createPlayer()
      }
      const myGame = await createGame(myPlayer)
      if (!myGame) return
      await joinGame(myGame, myPlayer)
      navigate('/game/lobby')
    } finally {
      setLoading(false)
    }
  }

  const canStart = Boolean(country && playerName?.trim())
  const startDisabled = loading || !canStart

  return (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}><FormattedMessage id='start game' defaultMessage={'Start a new game'}/></Heading>
        {country?.code === 'NL-NH' && (
          <Flex gap={4}>
            <Box>
              <FormattedMessage
                defaultMessage={'A special game for DBA Texel Bird Week! You get 35 pictures, with a higher chance to see rare species.'}
                id={'texel game info'}
              />
              <br/> <br/>
              <Link href={'/texel/scores/'}>
                <FormattedMessage id={'hiscores texel'} defaultMessage={'High Scores - DBA Bird Week'}/>
              </Link>
            </Box>
          </Flex>
        )}
        <FormattedMessage
          defaultMessage={'To get a high score, you need to identify the birds correctly, but you also need to be fast! After each answer you see how many points you got.'}
          id={'game info'}/>
        <SetName/>
        <SelectLanguage/>
        {!pickCountry &&  <SelectCountry/>}

        <Button
          disabled={startDisabled}
          loading={loading}
          size='lg'
          onClick={create}
          colorPalette="primary"
        >
          <FormattedMessage id={'start game'} defaultMessage={"Start a new game"}/>
        </Button>

        <Heading size={'lg'}><FormattedMessage id='more game settings' defaultMessage={'More game settings'}/></Heading>

        {pickRarity === undefined && <SelectRarity/>}
        {pickRarity === undefined && <SelectSpeciesStatus/>}
        {!pickLength && <SelectLength/>}
        {!pickLevel && <SelectLevel/>}
        {!pickMediaType && <SelectMediaType/>}
        <SelectTaxOrder/>
        <SelectTaxFamily/>
        <Button
          disabled={startDisabled}
          loading={loading}
          size='lg'
          onClick={create}
          colorPalette="primary"
        >
          <FormattedMessage id={'start game'} defaultMessage={"Start a new game"}/>
        </Button>
      </Flex>
  )
}
