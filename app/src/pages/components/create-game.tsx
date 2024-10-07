import {useContext, useState} from "react"
import AppContext from "../../core/app-context"
import {Button, Flex, Heading, Spinner} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import SelectCountry from "../../components/select-country"
import SelectLanguage from "../../components/select-language"
import SelectLevel from "../../components/select-level"


export const CreateGame = () => {

  const {country, level, setGame, language} = useContext(AppContext);
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
          country: country.code,
          language: language,
          level: level,
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
      <Spinner size={'50px'}/>
    ) : (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}><FormattedMessage id='start game' defaultMessage={'Start new game'}/></Heading>
        <SelectCountry/>
        <SelectLanguage/>
        <SelectLevel/>
        <Button colorScheme='orange' size='lg' onClick={startGame}>
          < FormattedMessage id={'start game'} defaultMessage={"Start new game"}/>
        </Button>
      </Flex>

    )
  )
}