import React, {useContext, useEffect, useState} from 'react';
import {Box, Button, Flex, Heading, Input} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import WebsocketContext from "../core/websocket-context"
import {useNavigate, useParams} from "react-router-dom"
import Page from "./layout/page"
import AppContext from "../core/app-context"
import GameHeader from "./mpg/game-header"
import {SetName} from "../components/set-name"
import SelectLanguage from "../components/select-language"


const JoinPage: React.FC = () => {
  const {joinGame} = useContext(WebsocketContext)
  const {createPlayer, player, loadGame, playerName} = useContext(AppContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const {gameCode} = useParams<{ gameCode: string }>();
  const [code, setCode] = useState<string | undefined>(gameCode)

  const handleSubmit = async () => {
    setLoading(true)
    let myPlayer = player
    if (!myPlayer) {
      myPlayer = await createPlayer()
    }
    if (code) {
      await localStorage.setItem('game-token', code)
      const myGame = await loadGame(code)

      await joinGame(myGame, myPlayer)
      setLoading(false)
      navigate('/game/lobby')
    } else {
      console.log("No code?!")
    }
  }


  return (
    <Page>
      <GameHeader/>
      <Page.Body>
        <Heading variant={'h3'}>Join Game</Heading>
        <Box>
          Game code
          <Input name={'game_code'} value={code} onChange={(event) => setCode(event.target.value)}/>
        </Box>
        <SetName/>
        <SelectLanguage/>
        <Button onClick={handleSubmit} isLoading={loading} isDisabled={!code || !playerName}>
          Join game
        </Button>
      </Page.Body>
    </Page>
  );
};

export default JoinPage;
