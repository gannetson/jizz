import {useContext, useEffect, useState} from "react"
import AppContext, {Player} from "../core/app-context"
import {Box, Button, Flex, Heading, Image, Link} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import SelectCountry from "./select-country"
import SelectLanguage from "./select-language"
import SelectLevel from "./select-level"
import {Loading} from "./loading"
import {SelectLength} from "./select-length"
import WebsocketContext from "../core/websocket-context"
import {useNavigate} from "react-router-dom"
import {SelectMediaType} from "./select-media-type"
import {SetName} from "./set-name"
import {SelectSpeciesStatus} from "./select-species-status"
import {UseCountries} from "../user/use-countries"
import SelectTaxOrder from "./select-order"
import SelectTaxFamily from "./select-family"


type GameProps = {
  country?: string;
  length?: string;
  level?: string;
  includeRare?: boolean
  mediaType?: string;
}

export const CreateGame = ({
                             country: pickCountry,
                             length: pickLength,
                             level: pickLevel,
                             includeRare,
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
    setIncludeRare,
    setMediaType,
    playerName
  } = useContext(AppContext);
  const {joinGame} = useContext(WebsocketContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const {countries} = UseCountries()

  useEffect(() => {
    if (pickCountry && countries && countries.length) {
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
    if (includeRare !== undefined) {
      setIncludeRare(includeRare)
    }

  }, [
    countries, pickCountry,
    pickLevel, pickLength, pickMediaType, includeRare,
    setLevel, setMediaType, setIncludeRare, setLength
  ]);


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
        {!pickCountry && (
          <>
            <SelectCountry/>
            <Flex gap={4}>
              <Box flex={1}>
              <SelectTaxOrder/>
              </Box>
              <Box flex={1}>
              <SelectTaxFamily />
              </Box>
            </Flex>
          </>
        )}
        {includeRare === undefined && <SelectSpeciesStatus/>}
        {!pickLength && <SelectLength/>}
        {!pickLevel && <SelectLevel/>}
        {!pickMediaType && <SelectMediaType/>}
        <Button isDisabled={!country || !playerName} size='lg' onClick={create}>
          <FormattedMessage id={'start game'} defaultMessage={"Start a new game"}/>
        </Button>
      </Flex>

    )
  )
}