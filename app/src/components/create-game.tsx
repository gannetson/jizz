import {useContext, useState} from "react"
import AppContext from "../core/app-context"
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


export const CreateGame = () => {

  const {country, level, setGame, language, multiplayer, length, mediaType, playerName} = useContext(AppContext);
  const {setGameToken, joinGame} = useContext(WebsocketContext);
  const [loading, setLoading] = useState(false)
  const {player, setPlayer} = useContext(AppContext);
  const navigate = useNavigate()


  const createGame = async () => {
    setLoading(true)
    const response = await fetch('/api/player/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playerName,
      })
    })
    const playerData = await response.json();
    if (playerData) {
      setPlayer && setPlayer(playerData)
      localStorage.setItem('player-token', playerData.token)
    }
    setLoading(false)

    if (country && level) {
      setLoading(true)
      const response = await fetch('/api/games/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Token ${playerData.token}`,
        },
        body: JSON.stringify({
          multiplayer: multiplayer === '1',
          country: country.code,
          language: language,
          level: level,
          length: length,
          media: mediaType
        })
      })
      const data = await response.json();
      if (data) {
        localStorage.setItem('game-token', data.token)
        if (data.multiplayer) {
          setGameToken && setGameToken(data.token)
          if (playerData.token && joinGame) {
            await joinGame({
              gameToken: data.token,
              playerToken: playerData.token
            })
            navigate('/game/lobby')
          }

        } else {
          setGame && setGame(data)
          document.location.href = '/game/'
        }
      }
      setLoading(false)

    }
  }

  const create = async () => {

  }

  return (
    loading ? (
      <Loading/>
    ) : (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}><FormattedMessage id='start game' defaultMessage={'Start new game'}/></Heading>
        <SelectCountry/>
        <SelectGameType/>
        <SelectLength/>
        <SelectLevel/>
        <SelectMediaType/>
        <Divider/>
        <SetName/>
        <SelectLanguage/>

        <Button isDisabled={!country || !playerName} colorScheme='orange' size='lg' onClick={createGame}>
          <FormattedMessage id={'start game'} defaultMessage={"Start new game"}/>
        </Button>
      </Flex>

    )
  )
}