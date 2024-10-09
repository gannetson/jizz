import {useContext, useState} from "react"
import AppContext from "../core/app-context"
import {Button, Flex, Heading, Spinner} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import SelectCountry from "./select-country"
import SelectLanguage from "./select-language"
import SelectLevel from "./select-level"
import {SelectGameType} from "./select-game-type"
import {Loading} from "./loading"
import {SelectLength} from "./select-length"


export const CreateGame = () => {

  const {country, level, setGame, language, multiplayer, length} = useContext(AppContext);
  const [loading, setLoading] = useState(false)


  const startGame = async () => {
    if (country && level) {
      setLoading(true)
      const response = await fetch('/api/games/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          multiplayer: multiplayer === '1',
          country: country.code,
          language: language,
          level: level,
          length: length
        })
      })
      const data = await response.json();
      if (data && setGame) {
        setGame(data)
        localStorage.setItem('game-token', data.token)
        document.location.href = '/game/'
      }
      setLoading(false)

    }
  }

  return (
    loading ? (
      <Loading />
    ) : (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}><FormattedMessage id='start game' defaultMessage={'Start new game'}/></Heading>
        <SelectCountry/>
        <SelectGameType />
        <SelectLength />
        <SelectLevel/>
        <Button isDisabled={!country} colorScheme='orange' size='lg' onClick={startGame}>
          <FormattedMessage id={'start game'} defaultMessage={"Start new game"}/>
        </Button>
      </Flex>

    )
  )
}