import {useContext, useState} from "react"
import AppContext from "../core/app-context"
import {Box, Button, Flex, Heading, Input, Spinner} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {Loading} from "./loading"
import SelectLanguage from "./select-language"
import WebsocketContext from "../core/websocket-context"


export const SetName = () => {

  const {loading, setPlayerName} = useContext(AppContext)

  return (
    loading ? (
      <Loading/>
    ) : (
      <Box>
        <Heading size={'md'} mb={4}>Player name</Heading>
        <FormattedMessage id={'your name'} defaultMessage={"What's your name. You can pick any name you want."}/>
        <Input
          name={'name'}
          onChange={(event) => {
            setPlayerName && setPlayerName(event.target.value)
          }}/>
      </Box>

    )
  )
}