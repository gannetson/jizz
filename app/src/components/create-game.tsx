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
import {profileService} from "../api/services/profile.service"
import {authService} from "../api/services/auth.service"


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
    playerName,
    setPlayerName,
    language,
    setLanguage
  } = useContext(AppContext);
  const {joinGame} = useContext(WebsocketContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const {countries} = UseCountries()

  // Load user profile to prefill player name, country, and language
  useEffect(() => {
    const loadUserProfile = async () => {
      // Check if we have both access token and refresh token to ensure valid authentication
      const accessToken = authService.getAccessToken();
      const refreshToken = authService.getRefreshToken();
      
      if (accessToken && refreshToken) {
        try {
          const profile = await profileService.getProfile();
          
          // Prefill player name with username if not already set
          if (!playerName && profile.username) {
            setPlayerName && setPlayerName(profile.username);
          }
          
          // Set language from profile if not already set
          if (profile.language && (!language || language === 'en')) {
            setLanguage && setLanguage(profile.language);
          }
          
          // Set country from profile if not already set and not overridden by pickCountry
          if (profile.country_code && !pickCountry && (!country || country.code !== profile.country_code)) {
            const profileCountry = countries.find((c) => c.code === profile.country_code);
            if (profileCountry) {
              setCountry && setCountry(profileCountry);
            }
          }
        } catch (error: any) {
          // User might not be authenticated, token expired, or profile might not exist
          // Silently ignore authentication errors - this is expected for anonymous users
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            // Clear invalid tokens to prevent further errors
            authService.clearTokens();
          }
          // Ignore all other errors silently
        }
      }
    };
    
    if (countries && countries.length > 0) {
      loadUserProfile();
    }
  }, [countries.length, pickCountry, playerName, language, country, setPlayerName, setLanguage, setCountry]);

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
    if (includeRare !== undefined) {
      setIncludeRare(includeRare)
    }

  }, [
    countries.length, pickCountry, // Only depend on countries.length, not countries array itself
    pickLevel, pickLength, pickMediaType, includeRare,
    setLevel, setMediaType, setIncludeRare, setLength, setCountry
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
        {!pickCountry &&  <SelectCountry/>}
        {includeRare === undefined && <SelectSpeciesStatus/>}
        {!pickLength && <SelectLength/>}
        {!pickLevel && <SelectLevel/>}
        {!pickMediaType && <SelectMediaType/>}
        <Button disabled={!country || !playerName} size='lg' onClick={create} colorPalette="primary">
          <FormattedMessage id={'start game'} defaultMessage={"Start a new game"}/>
        </Button>
      </Flex>

    )
  )
}