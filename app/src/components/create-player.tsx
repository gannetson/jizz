import {useContext, useState} from "react"
import AppContext from "../core/app-context"
import {Box, Button, Flex, Input, Spinner} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {Loading} from "./loading"
import SelectLanguage from "./select-language"


export const CreatePlayer = () => {

  const [playerName, setPlayerName] = useState<string | undefined>()
  const {setPlayer} = useContext(AppContext);
  const [loading, setLoading] = useState(false)


  const createPlayer = async () => {
    if (playerName) {
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
      const data = await response.json();
      if (data) {
        setPlayer && setPlayer(data)
        localStorage.setItem('player-token', data.token)
      }
      setLoading(false)

    }
  }

  return (
    loading ? (
      <Loading/>
    ) : (
      <Flex direction={'column'} gap={10}>
        <Box>
          <FormattedMessage id={'create game'} defaultMessage={"What's your name"}/>
          <Input name={'name'} onChange={(event) => setPlayerName(event.target.value)}/>
        </Box>
        <SelectLanguage />
        <Button isDisabled={!playerName} colorScheme='orange' size='lg' onClick={createPlayer}>
          <FormattedMessage id={'create game'} defaultMessage={"Continue"}/>
        </Button>
      </Flex>

    )
  )
}