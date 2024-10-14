import React, {useContext, useEffect, useState} from 'react';
import Page from "../layout/page"
import {Box, Button, Heading, Input} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import WebsocketContext from "../../core/websocket-context"
import {useNavigate, useParams} from "react-router-dom"
import AppContext from "../../core/app-context"


const JoinGame: React.FC = () => {
  const {gameCode} = useParams<{ gameCode: string }>();
  const [playerName, setPlayerName] = useState<string | undefined>()
  const [code, setCode] = useState<string | undefined>(gameCode)

  const {setPlayer, joinGame, setGameToken} = useContext(WebsocketContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (code) {
      localStorage.setItem('game-token', code)
    } else if (gameCode) {
      localStorage.setItem('game-token', gameCode)

    }
  }, [code, gameCode])


  const handleSubmit = async () => {
    if (playerName && code) {
      setLoading(true)
      await localStorage.setItem('game-token', code)
      setGameToken && setGameToken(code)
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
        await localStorage.setItem('player-token', data.token)
      }

      console.log(data)

      setPlayer && setPlayer(data)
      if (joinGame) {
        await joinGame({gameToken: code, playerToken: data.token})
        setLoading(false)
        navigate('/mpg/lobby')

      }

    } else {
      console.log("Missing playerName or gameCode")
    }
  }


  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>
          <FormattedMessage id={'Multi player game'} defaultMessage={'Multi player game'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Heading variant={'h3'}>Join Game</Heading>
        <Box>
          Game code
          <Input name={'game_code'} value={code} onChange={(event) => setCode(event.target.value)}/>
        </Box>
        <Box>
          Name
          <Input name={'name'} onChange={(event) => setPlayerName(event.target.value)}/>
        </Box>
        <Button colorScheme='orange' onClick={handleSubmit} isLoading={loading} isDisabled={!gameCode || !playerName}>
          Join game
        </Button>
      </Page.Body>
    </Page>
  );
};

export default JoinGame;
