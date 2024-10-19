import {useContext, useEffect} from "react"
import AppContext from "../core/app-context"
import {Box, Heading, Input} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {Loading} from "./loading"


export const SetName = () => {

  const {loading, setPlayerName, player, playerName} = useContext(AppContext)

  useEffect(() => {
    if (!playerName && player?.name) {
      setPlayerName && setPlayerName(player?.name)
    }

  }, [player?.name]);

  return (
    loading ? (
      <Loading/>
    ) : (
      <Box>
        <Heading size={'md'} mb={4}>
          <FormattedMessage id={'player name'} defaultMessage={'Player name'} />
        </Heading>
        <FormattedMessage id={'your name'} defaultMessage={"What's your name. You can pick any name you want."}/>
        <Input
          name={'name'}
          value={playerName || player?.name}
          onChange={(event) => {
            setPlayerName && setPlayerName(event.target.value)
          }}/>
      </Box>

    )
  )
}