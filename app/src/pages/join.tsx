import React, {useContext, useEffect, useState} from 'react';
import {Box, Button, Flex, Heading, Input} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import WebsocketContext from "../core/websocket-context"
import {useNavigate, useParams} from "react-router-dom"
import { Page } from "../shared/components/layout"
import AppContext from "../core/app-context"
import GameHeader from "./mpg/game-header"
import {SetName} from "../components/set-name"
import SelectLanguage from "../components/select-language"
import {profileService} from "../api/services/profile.service"
import {authService} from "../api/services/auth.service"
import AppStoreBanner from "../components/app-store-banner"


const JoinPage: React.FC = () => {
  const {joinGame} = useContext(WebsocketContext)
  const {createPlayer, player, loadGame, playerName, setPlayerName, language, setLanguage} = useContext(AppContext)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const {gameCode} = useParams<{ gameCode: string }>();
  const [code, setCode] = useState<string | undefined>(gameCode)

  // Load user profile to prefill player name and language
  useEffect(() => {
    const loadUserProfile = async () => {
      if (authService.getAccessToken()) {
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
        } catch (error) {
          // User might not be authenticated or profile might not exist, ignore
        }
      }
    };
    
    loadUserProfile();
  }, [playerName, language, setPlayerName, setLanguage]);

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
      <Page.Header>
        <Heading color={'gray.800'} size={'lg'} m={0}>
          Join Game
        </Heading>
      </Page.Header>
      <Page.Body>
        <Box>
          Game code
          <Input name={'game_code'} value={code} cursor="text" onChange={(event) => setCode(event.target.value)}/>
        </Box>
        <SetName/>
        <SelectLanguage/>
        <Button onClick={handleSubmit} loading={loading} disabled={!code || !playerName} colorPalette="primary">
          Join game
        </Button>
        <AppStoreBanner />
      </Page.Body>
    </Page>
  );
};

export default JoinPage;
